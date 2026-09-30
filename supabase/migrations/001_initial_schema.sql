-- ============================================================================
-- Me'morAI — Supabase / PostgreSQL Asosiy Relyatsion Sxemasi (Initial Schema)
-- Versiya: 1.0.0
-- Loyiha: Me'morAI (O'zbekiston QMQ / ShNQ Qurilish Me'yorlari AI Audit Tizimi)
-- Muallif: Me'morAI Bosh Me'mori (Jasper Production Standards)
-- ============================================================================
-- O'zbekcha:
-- Ushbu migratsiya Me'morAI tizimining barcha asosiy jadvallarini yaratadi:
-- 1. organizations    — B2B ko'p-tenantlik (Multi-tenant) boshqaruvchi tashkilotlar
-- 2. subscriptions    — Tashkilot tarif rejalari (starter, pro, enterprise) va limitlar
-- 3. users            — Supabase Auth bilan bog'langan foydalanuvchilar va rollar
-- 4. projects         — Har bir arxitektura / qurilish loyihasi
-- 5. drawing_files    — Loyihaga tegishli chizma fayllar (DWG, DXF, PDF, IFC, RVT)
-- 6. compliance_checks — QMQ / ShNQ me'yoriy tekshiruv seanslari va yakuniy xulosalar
-- 7. check_results    — Har bir me'yoriy qoida uchun alohida natija va isbotlar
--
-- Русский:
-- Данная миграция создает все основные таблицы системы Me'morAI:
-- 1. organizations    — Организации для обеспечения строгой multi-tenant изоляции
-- 2. subscriptions    — Тарифные планы (starter, pro, enterprise) и лимиты организации
-- 3. users            — Пользователи, интегрированные с Supabase Auth, и их роли
-- 4. projects         — Архитектурные и строительные проекты
-- 5. drawing_files    — Файлы чертежей проектов (DWG, DXF, PDF, IFC, RVT)
-- 6. compliance_checks — Сессии аудита на соответствие КМК / ШНК и сводные отчеты
-- 7. check_results    — Детализированные результаты проверки по каждому пункту норм
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS & HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Avtomatik updated_at ustunini yangilovchi trigger funksiyasi (Asia/Tashkent UTC+5)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Tashkilotlar / Организации)
-- Har bir loyiha loyiha instituti, arxitektura byurosi yoki qurilish kompaniyasiga tegishli.
-- Barcha boshqa jadvallardagi organization_id ushbu jadvalga havola qiladi.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    stir TEXT, -- STIR / ИНН (O'zbekiston soliq to'lovchi identifikatsiya raqami)
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT DEFAULT 'Toshkent',
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{
        "default_standard": "QMQ",
        "default_seismic_zone": 8,
        "language": "uz",
        "notifications": {
            "email": true,
            "telegram": false
        }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.organizations IS 
'B2B ko''p-tenantlik asosiy tashkilotlar jadvali / Главная таблица организаций для multi-tenant изоляции';
COMMENT ON COLUMN public.organizations.id IS 'Tashkilot unikal identifikatori (UUID) / Уникальный ID организации';
COMMENT ON COLUMN public.organizations.name IS 'Tashkilot nomi / Название организации (бюро, институт)';
COMMENT ON COLUMN public.organizations.slug IS 'URL uchun unikal identifikator / Уникальный слаг для URL';
COMMENT ON COLUMN public.organizations.stir IS 'O''zbekiston STIR (ИНН) raqami / ИНН налогоплательщика Узбекистана';
COMMENT ON COLUMN public.organizations.settings IS 'Tashkilotning umumiy sozlamalari (JSONB) / Настройки организации';

-- ----------------------------------------------------------------------------
-- 2. SUBSCRIPTIONS (Tariflar va obunalar / Подписки и тарифы)
-- Har bir tashkilotning tarif rejasi, oylik tekshiruvlar kvotasi va xotira limiti.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    monthly_checks_limit INTEGER NOT NULL DEFAULT 10 CHECK (monthly_checks_limit >= 0),
    used_checks_count INTEGER NOT NULL DEFAULT 0 CHECK (used_checks_count >= 0),
    max_file_size_mb INTEGER NOT NULL DEFAULT 50 CHECK (max_file_size_mb > 0),
    storage_limit_gb NUMERIC(8, 2) NOT NULL DEFAULT 5.00 CHECK (storage_limit_gb >= 0),
    price_uzs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (price_uzs >= 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    features JSONB NOT NULL DEFAULT '{
        "dwg_support": true,
        "dxf_support": true,
        "pdf_support": true,
        "ifc_support": false,
        "export_pdf_report": true,
        "api_access": false,
        "unlimited_members": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscriptions IS 
'Tashkilot obunasi va tekshiruv limitlari / Подписки организаций и лимиты проверок';
COMMENT ON COLUMN public.subscriptions.plan IS 'Tarif turi: starter (boshlang''ich), pro (professional), enterprise (korporativ)';
COMMENT ON COLUMN public.subscriptions.monthly_checks_limit IS 'Oylik ruxsat etilgan tekshiruvlar soni / Месячный лимит проверок';
COMMENT ON COLUMN public.subscriptions.used_checks_count IS 'Joriy davrda ishlatilgan tekshiruvlar / Использовано проверок в текущем периоде';
COMMENT ON COLUMN public.subscriptions.price_uzs IS 'Narxi so''mda (UZS) / Стоимость в сумах';

-- ----------------------------------------------------------------------------
-- 3. USERS (Foydalanuvchilar profillari / Профили пользователей)
-- Supabase auth.users bilan bog'langan, tashkilotga biriktirilgan arxitektorlar/xodimlar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'architect' CHECK (role IN ('owner', 'admin', 'architect', 'auditor', 'viewer')),
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 
'Foydalanuvchilar profili (Supabase auth.users ga bog''langan) / Профили пользователей';
COMMENT ON COLUMN public.users.id IS 'Supabase auth.users dagi unikal ID / ID из auth.users';
COMMENT ON COLUMN public.users.organization_id IS 'Foydalanuvchi tegishli bo''lgan tashkilot / Организация пользователя';
COMMENT ON COLUMN public.users.role IS 'Foydalanuvchi roli: owner (tashkilot egasi), admin, architect (arxitektor), auditor (ekspert), viewer (kuzatuvchi)';

-- ----------------------------------------------------------------------------
-- 4. PROJECTS (Arxitektura va qurilish loyihalari / Проекты)
-- Har bir tashkilotning alohida loyihalari (turar-joy, biznes markaz, maktab va h.k.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT, -- Loyiha shifri, masalan "PRJ-2026-YUNUSOBOD-01"
    description TEXT,
    building_type TEXT NOT NULL DEFAULT 'residential' CHECK (
        building_type IN ('residential', 'commercial', 'industrial', 'public', 'educational', 'healthcare', 'mixed')
    ),
    address TEXT,
    city TEXT DEFAULT 'Toshkent',
    total_floors INTEGER CHECK (total_floors IS NULL OR total_floors > 0),
    total_area_sqm NUMERIC(10, 2) CHECK (total_area_sqm IS NULL OR total_area_sqm >= 0),
    seismic_zone INTEGER DEFAULT 8 CHECK (seismic_zone IN (7, 8, 9)),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'in_review', 'approved', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{
        "cadastral_number": null,
        "designer_company": null,
        "chief_architect": null
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.projects IS 
'Arxitektura va qurilish loyihalari / Архитектурные и строительные проекты';
COMMENT ON COLUMN public.projects.code IS 'Loyiha shifri / Шифр проекта';
COMMENT ON COLUMN public.projects.building_type IS 'Bino toifasi (turar-joy, jamoat, savdo va h.k.) / Тип здания';
COMMENT ON COLUMN public.projects.seismic_zone IS 'Seysmik hudud bali (7, 8, 9 ball) / Сейсмичность площадки строительства';

-- ----------------------------------------------------------------------------
-- 5. DRAWING_FILES (Chizma va model fayllari / Файлы чертежей)
-- Yuklangan DWG, DXF, PDF, IFC, RVT fayllari va ularning saqlash yo'llari.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drawing_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('dwg', 'dxf', 'pdf', 'ifc', 'rvt')),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    storage_path TEXT NOT NULL,
    bucket_name TEXT NOT NULL DEFAULT 'drawings',
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    checksum_sha256 TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'parsed', 'error')),
    parsed_data JSONB DEFAULT '{}'::jsonb, -- AI Vision va CAD parser tomonidan ajratib olingan geometriya
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.drawing_files IS 
'Loyiha chizma fayllari (DWG, DXF, PDF, IFC) / Файлы чертежей проектов';
COMMENT ON COLUMN public.drawing_files.storage_path IS 'Supabase Storage dagi unikal fayl yo''li / Путь в Supabase Storage';
COMMENT ON COLUMN public.drawing_files.parsed_data IS 'Parser ajratib olgan xonalar, devorlar, o''lchamlar (JSONB) / Распарсенные геометрические данные';

-- ----------------------------------------------------------------------------
-- 6. COMPLIANCE_CHECKS (Normativ audit seanslari / Сессии нормативного аудита)
-- Har bir tekshiruv sessiyasi, agregatsiyalangan natijalar va hisobotlar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    drawing_file_id UUID REFERENCES public.drawing_files(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    check_type TEXT NOT NULL DEFAULT 'full' CHECK (
        check_type IN ('full', 'fire_safety', 'room_dimensions', 'insolation', 'accessibility', 'structural', 'custom')
    ),
    standard_code TEXT NOT NULL DEFAULT 'QMQ' CHECK (standard_code IN ('QMQ', 'ShNQ', 'GOST', 'ALL')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'completed', 'failed', 'requires_review')
    ),
    total_rules INTEGER NOT NULL DEFAULT 0 CHECK (total_rules >= 0),
    passed_count INTEGER NOT NULL DEFAULT 0 CHECK (passed_count >= 0),
    failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
    compliance_score NUMERIC(5, 2) CHECK (compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100)),
    compliance_results JSONB NOT NULL DEFAULT '{
        "version": "1.0.0",
        "rules_engine": "QMQRulesEngine",
        "summary": {},
        "categories": {},
        "violations": []
    }'::jsonb,
    summary_uz TEXT,
    summary_ru TEXT,
    duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.compliance_checks IS 
'QMQ/ShNQ tekshiruv seanslari va yakuniy xulosa / Сессии проверок на соответствие нормам';
COMMENT ON COLUMN public.compliance_checks.compliance_score IS 'Qoidalarga muvofiqlik indeksi (0-100 foizda) / Индекс соответствия нормам (%)';
COMMENT ON COLUMN public.compliance_checks.compliance_results IS 'To''liq agregatsiyalangan audit natijalari (JSONB) / Полные результаты аудита в JSONB';

-- ----------------------------------------------------------------------------
-- 7. CHECK_RESULTS (Har bir qoida bo'yicha alohida natija / Результаты по правилам)
-- rules_engine.py CheckResult strukturasiga 100% mos: aniq modda, haqiqiy qiymat, talab va xabar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    compliance_check_id UUID NOT NULL REFERENCES public.compliance_checks(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL, -- Masalan: "QMQ_2_08_01_89_CL_1_25"
    code TEXT NOT NULL,    -- "QMQ 2.08.01-89*"
    clause TEXT NOT NULL,  -- "1.25"
    category TEXT NOT NULL, -- 'yashash_binolari', 'yongin_xavfsizligi', 'sanitariya', 'konstruktiv'
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'insufficient_evidence', 'requires_review')),
    title_uz TEXT NOT NULL,
    title_ru TEXT NOT NULL,
    actual_value JSONB,   -- Masalan: {"height_m": 2.40} yoki 2.40
    required_value JSONB, -- Masalan: {"min_height_m": 2.70} yoki 2.70
    message_uz TEXT NOT NULL,
    message_ru TEXT NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
    evidence_bbox JSONB, -- [x1, y1, x2, y2] - Chizmadagi xatolik joyi koordinatalari
    source_page INTEGER CHECK (source_page IS NULL OR source_page >= 1),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.check_results IS 
'Har bir QMQ/ShNQ qoidasi bo''yicha batafsil tekshiruv yozuvi / Запись аудита по конкретному пункту нормы';
COMMENT ON COLUMN public.check_results.rule_id IS 'Qoidaning dasturiy identifikatori / Программный ID правила';
COMMENT ON COLUMN public.check_results.code IS 'Normativ hujjat nomi (masalan QMQ 2.08.01-89*) / Название документа';
COMMENT ON COLUMN public.check_results.clause IS 'Hujjat moddasi / Пункт нормативного документа';
COMMENT ON COLUMN public.check_results.severity IS 'Xatolikning xavflilik darajasi (critical, high, medium, low) / Уровень критичности';
COMMENT ON COLUMN public.check_results.status IS 'Tekshiruv xulosasi (pass, fail, insufficient_evidence, requires_review) / Статус проверки';
COMMENT ON COLUMN public.check_results.evidence_bbox IS 'Chizmadagi xatolik chegarasi koordinatalari [x1, y1, x2, y2] / Координаты области на чертеже';

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS (Avtomatik updated_at yangilanishi)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_drawing_files_updated_at ON public.drawing_files;
CREATE TRIGGER trg_drawing_files_updated_at
    BEFORE UPDATE ON public.drawing_files
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_compliance_checks_updated_at ON public.compliance_checks;
CREATE TRIGGER trg_compliance_checks_updated_at
    BEFORE UPDATE ON public.compliance_checks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_check_results_updated_at ON public.check_results;
CREATE TRIGGER trg_check_results_updated_at
    BEFORE UPDATE ON public.check_results
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 9. INDEXES (Indekslar — Yuqori tezlik va tenant izolyatsiyasi)
-- Har bir jadval organization_id va created_at bo'yicha indekslanadi.
-- ----------------------------------------------------------------------------

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at DESC);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON public.subscriptions(created_at DESC);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_org_created ON public.users(organization_id, created_at DESC);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_org_created ON public.projects(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON public.projects(organization_id, status);

-- Drawing Files
CREATE INDEX IF NOT EXISTS idx_drawing_files_organization_id ON public.drawing_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_drawing_files_project_id ON public.drawing_files(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_files_status ON public.drawing_files(status);
CREATE INDEX IF NOT EXISTS idx_drawing_files_org_created ON public.drawing_files(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drawing_files_parsed_data_gin ON public.drawing_files USING GIN(parsed_data);

-- Compliance Checks
CREATE INDEX IF NOT EXISTS idx_compliance_checks_organization_id ON public.compliance_checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_project_id ON public.compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_drawing_file_id ON public.compliance_checks(drawing_file_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON public.compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_org_created ON public.compliance_checks(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_results_gin ON public.compliance_checks USING GIN(compliance_results);

-- Check Results
CREATE INDEX IF NOT EXISTS idx_check_results_organization_id ON public.check_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_check_results_compliance_check_id ON public.check_results(compliance_check_id);
CREATE INDEX IF NOT EXISTS idx_check_results_rule_id ON public.check_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_check_results_severity ON public.check_results(severity);
CREATE INDEX IF NOT EXISTS idx_check_results_status ON public.check_results(status);
CREATE INDEX IF NOT EXISTS idx_check_results_check_status ON public.check_results(compliance_check_id, status);
CREATE INDEX IF NOT EXISTS idx_check_results_org_created ON public.check_results(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_results_actual_value_gin ON public.check_results USING GIN(actual_value);
CREATE INDEX IF NOT EXISTS idx_check_results_required_value_gin ON public.check_results USING GIN(required_value);
