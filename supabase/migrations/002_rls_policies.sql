-- ============================================================================
-- Me'morAI — Supabase Row Level Security (RLS) Siyosatlari (Security Policies)
-- Versiya: 1.0.0
-- Loyiha: Me'morAI (O'zbekiston QMQ / ShNQ Qurilish Me'yorlari AI Audit Tizimi)
-- Muallif: Me'morAI Bosh Me'mori (Jasper Production Standards)
-- ============================================================================
-- O'zbekcha:
-- Ushbu fayl barcha 7 ta jadval uchun Zero Cross-Tenant Leakage (begona tashkilot
-- ma'lumotlari sizib chiqishini 100% bartaraf etuvchi) RLS qoidalarini o'rnatadi.
-- Asosiy qoidalar:
-- 1. Har qanday autentifikatsiyadan o'tgan foydalanuvchi faqat O'Z tashkilotiga (organization_id)
--    tegishli yozuvlarni ko'radi, tahrirlaydi yoki qo'shadi.
-- 2. Service role (backend server, fon ishchilari, AI dvigateli) barcha ma'lumotlarni
--    to'liq boshqarish huquqiga ega.
-- 3. Rekursiyani oldini olish va tezlikni oshirish uchun SECURITY DEFINER yordamchi
--    funksiyalari orqali joriy tashkilot ID va foydalanuvchi roli keshlanadi.
--
-- Русский:
-- Данный файл настраивает политики Row Level Security (RLS) для всех 7 таблиц.
-- Гарантирует принцип Zero Cross-Tenant Leakage (нулевая утечка между организациями):
-- 1. Авторизованный пользователь видит, изменяет и создает записи ТОЛЬКО своей организации.
-- 2. Сервисная роль (service_role: бэкенд, воркеры, AI-двигатель) имеет полный доступ ко всем данным.
-- 3. Вспомогательные функции SECURITY DEFINER предотвращают рекурсию RLS и оптимизируют запросы.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (Xavfsiz yordamchi funksiyalar / Вспомогательные функции)
-- ----------------------------------------------------------------------------

-- Joriy foydalanuvchining tashkilot ID sini xavfsiz aniqlash
-- (SECURITY DEFINER rekursiv RLS chaqiruvlarining oldini oladi)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id FROM public.users WHERE id = (SELECT auth.uid());
$$;

COMMENT ON FUNCTION public.current_user_org_id() IS 
'Joriy sessiyadagi foydalanuvchining organization_id sini qaytaradi / Возвращает ID организации текущего пользователя';

-- Joriy foydalanuvchining rolini xavfsiz aniqlash (owner, admin, architect, auditor, viewer)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE id = (SELECT auth.uid());
$$;

COMMENT ON FUNCTION public.current_user_role() IS 
'Joriy foydalanuvchining tizimdagi rolini qaytaradi / Возвращает роль текущего пользователя';

-- ----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- Barcha jadvallarda RLS majburiy yoqiladi.
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_results ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. ORGANIZATIONS POLICIES (Tashkilotlar xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role uchun to'liq huquq
DROP POLICY IF EXISTS "service_role_manage_organizations" ON public.organizations;
CREATE POLICY "service_role_manage_organizations"
    ON public.organizations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Foydalanuvchi faqat o'z tashkilotini ko'ra oladi
DROP POLICY IF EXISTS "members_select_own_organization" ON public.organizations;
CREATE POLICY "members_select_own_organization"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (id = public.current_user_org_id());

-- Faqat tashkilot egasi yoki admin o'z tashkiloti parametrlarini tahrirlashi mumkin
DROP POLICY IF EXISTS "admins_update_own_organization" ON public.organizations;
CREATE POLICY "admins_update_own_organization"
    ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (
        id = public.current_user_org_id() 
        AND public.current_user_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        id = public.current_user_org_id() 
        AND public.current_user_role() IN ('owner', 'admin')
    );

-- Yangi tashkilot ro'yxatdan o'tkazish (onboarding)
DROP POLICY IF EXISTS "users_insert_organization" ON public.organizations;
CREATE POLICY "users_insert_organization"
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. SUBSCRIPTIONS POLICIES (Tarif va obuna xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role to'liq huquq
DROP POLICY IF EXISTS "service_role_manage_subscriptions" ON public.subscriptions;
CREATE POLICY "service_role_manage_subscriptions"
    ON public.subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Tashkilot a'zolari o'z obunalarini va qolgan limitlarini ko'ra oladilar
DROP POLICY IF EXISTS "members_select_own_subscription" ON public.subscriptions;
CREATE POLICY "members_select_own_subscription"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (organization_id = public.current_user_org_id());

-- Obunani yangilash (asosan billing webhooks va service_role qiladi, owner faqat cheklangan)
DROP POLICY IF EXISTS "owners_update_own_subscription" ON public.subscriptions;
CREATE POLICY "owners_update_own_subscription"
    ON public.subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.current_user_org_id() 
        AND public.current_user_role() = 'owner'
    )
    WITH CHECK (
        organization_id = public.current_user_org_id() 
        AND public.current_user_role() = 'owner'
    );

-- ----------------------------------------------------------------------------
-- 5. USERS POLICIES (Foydalanuvchilar xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role to'liq huquq
DROP POLICY IF EXISTS "service_role_manage_users" ON public.users;
CREATE POLICY "service_role_manage_users"
    ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Foydalanuvchi o'z profilini yoki o'z tashkilotidagi boshqa xodimlarni ko'radi
DROP POLICY IF EXISTS "members_select_organization_users" ON public.users;
CREATE POLICY "members_select_organization_users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = (SELECT auth.uid()) 
        OR organization_id = public.current_user_org_id()
    );

-- Yangi foydalanuvchi profilini yaratish (o'z profili yoki admin tomonidan qo'shilgan xodim)
DROP POLICY IF EXISTS "users_insert_profile" ON public.users;
CREATE POLICY "users_insert_profile"
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        id = (SELECT auth.uid())
        OR (
            organization_id = public.current_user_org_id() 
            AND public.current_user_role() IN ('owner', 'admin')
        )
    );

-- Foydalanuvchi o'z profilini tahrirlashi mumkin; Admin/Owner tashkilot a'zolarini tahrirlashi mumkin
DROP POLICY IF EXISTS "users_update_profile" ON public.users;
CREATE POLICY "users_update_profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        id = (SELECT auth.uid()) 
        OR (
            organization_id = public.current_user_org_id() 
            AND public.current_user_role() IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        organization_id = public.current_user_org_id()
    );

-- Faqat Owner yoki Admin tashkilot a'zosini o'chirishi mumkin (o'zini o'zi o'chirish taqiqlanadi)
DROP POLICY IF EXISTS "admins_delete_organization_user" ON public.users;
CREATE POLICY "admins_delete_organization_user"
    ON public.users
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin')
        AND id <> (SELECT auth.uid())
    );

-- ----------------------------------------------------------------------------
-- 6. PROJECTS POLICIES (Loyihalar xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role to'liq huquq
DROP POLICY IF EXISTS "service_role_manage_projects" ON public.projects;
CREATE POLICY "service_role_manage_projects"
    ON public.projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Foydalanuvchi faqat o'z tashkilotiga tegishli loyihalarni ko'radi
DROP POLICY IF EXISTS "members_select_own_projects" ON public.projects;
CREATE POLICY "members_select_own_projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (organization_id = public.current_user_org_id());

-- Yangi loyiha yaratish (faqat o'z tashkiloti uchun)
DROP POLICY IF EXISTS "members_insert_own_projects" ON public.projects;
CREATE POLICY "members_insert_own_projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect')
    );

-- Loyihani yangilash (faqat o'z tashkiloti doirasida)
DROP POLICY IF EXISTS "members_update_own_projects" ON public.projects;
CREATE POLICY "members_update_own_projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.current_user_org_id())
    WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect')
    );

-- Loyihani o'chirish (faqat owner va admin)
DROP POLICY IF EXISTS "admins_delete_own_projects" ON public.projects;
CREATE POLICY "admins_delete_own_projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin')
    );

-- ----------------------------------------------------------------------------
-- 7. DRAWING_FILES POLICIES (Chizmalar xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role to'liq huquq
DROP POLICY IF EXISTS "service_role_manage_drawing_files" ON public.drawing_files;
CREATE POLICY "service_role_manage_drawing_files"
    ON public.drawing_files
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Foydalanuvchi faqat o'z tashkilotiga tegishli chizmalarni ko'radi
DROP POLICY IF EXISTS "members_select_own_drawings" ON public.drawing_files;
CREATE POLICY "members_select_own_drawings"
    ON public.drawing_files
    FOR SELECT
    TO authenticated
    USING (organization_id = public.current_user_org_id());

-- Chizma yuklash (faqat o'z tashkiloti loyihalariga)
DROP POLICY IF EXISTS "members_insert_own_drawings" ON public.drawing_files;
CREATE POLICY "members_insert_own_drawings"
    ON public.drawing_files
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect')
    );

-- Chizma ma'lumotlarini yangilash
DROP POLICY IF EXISTS "members_update_own_drawings" ON public.drawing_files;
CREATE POLICY "members_update_own_drawings"
    ON public.drawing_files
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.current_user_org_id())
    WITH CHECK (organization_id = public.current_user_org_id());

-- Chizmani o'chirish
DROP POLICY IF EXISTS "members_delete_own_drawings" ON public.drawing_files;
CREATE POLICY "members_delete_own_drawings"
    ON public.drawing_files
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect')
    );

-- ----------------------------------------------------------------------------
-- 8. COMPLIANCE_CHECKS POLICIES (Tekshiruv sessiyalari xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role to'liq huquq (AI ishchi server tekshiruv natijalarini yozadi)
DROP POLICY IF EXISTS "service_role_manage_compliance_checks" ON public.compliance_checks;
CREATE POLICY "service_role_manage_compliance_checks"
    ON public.compliance_checks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Foydalanuvchi faqat o'z tashkilotining audit xulosalarini ko'radi
DROP POLICY IF EXISTS "members_select_own_compliance_checks" ON public.compliance_checks;
CREATE POLICY "members_select_own_compliance_checks"
    ON public.compliance_checks
    FOR SELECT
    TO authenticated
    USING (organization_id = public.current_user_org_id());

-- Foydalanuvchi yangi audit tekshiruvini boshlashi mumkin
DROP POLICY IF EXISTS "members_insert_own_compliance_checks" ON public.compliance_checks;
CREATE POLICY "members_insert_own_compliance_checks"
    ON public.compliance_checks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect', 'auditor')
    );

-- Audit holatini yangilash
DROP POLICY IF EXISTS "members_update_own_compliance_checks" ON public.compliance_checks;
CREATE POLICY "members_update_own_compliance_checks"
    ON public.compliance_checks
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.current_user_org_id())
    WITH CHECK (organization_id = public.current_user_org_id());

-- Auditni o'chirish (faqat owner va admin)
DROP POLICY IF EXISTS "admins_delete_own_compliance_checks" ON public.compliance_checks;
CREATE POLICY "admins_delete_own_compliance_checks"
    ON public.compliance_checks
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin')
    );

-- ----------------------------------------------------------------------------
-- 9. CHECK_RESULTS POLICIES (Alohida qoida natijalari xavfsizlik qoidalari)
-- ----------------------------------------------------------------------------

-- Service role to'liq huquq (AI rules engine natijalarni kiritadi)
DROP POLICY IF EXISTS "service_role_manage_check_results" ON public.check_results;
CREATE POLICY "service_role_manage_check_results"
    ON public.check_results
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Foydalanuvchi faqat o'z tashkilotiga tegishli qoida natijalarini ko'radi
DROP POLICY IF EXISTS "members_select_own_check_results" ON public.check_results;
CREATE POLICY "members_select_own_check_results"
    ON public.check_results
    FOR SELECT
    TO authenticated
    USING (organization_id = public.current_user_org_id());

-- Auditor yoki arxitektor qo'lda tekshiruv belgisini kiritishi mumkin
DROP POLICY IF EXISTS "members_insert_own_check_results" ON public.check_results;
CREATE POLICY "members_insert_own_check_results"
    ON public.check_results
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect', 'auditor')
    );

-- Ekspert qayta tekshiruv sharhi yoki statusini o'zgartirishi mumkin
DROP POLICY IF EXISTS "members_update_own_check_results" ON public.check_results;
CREATE POLICY "members_update_own_check_results"
    ON public.check_results
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.current_user_org_id())
    WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin', 'architect', 'auditor')
    );

-- Natijalarni o'chirish (faqat owner va admin)
DROP POLICY IF EXISTS "admins_delete_own_check_results" ON public.check_results;
CREATE POLICY "admins_delete_own_check_results"
    ON public.check_results
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_role() IN ('owner', 'admin')
    );
