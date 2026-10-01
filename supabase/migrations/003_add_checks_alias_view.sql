-- ============================================================================
-- Me'morAI — Supabase Migratsiya 003: 'checks' VIEW & Alias Qo'shish
-- Versiya: 1.0.0
-- Loyiha: Me'morAI (O'zbekiston QMQ / ShNQ Qurilish Me'yorlari AI Audit Tizimi)
-- Muallif: Me'morAI Bosh Me'mori (Jasper Production Standards)
-- ============================================================================
-- Tavsif:
-- 1. Ushbu migratsiya compliance_checks jadvaliga 'checks' VIEW yaratadi.
-- 2. Eski backend endpointlari (FastAPI) va integratsiyalarning backward compatibility
--    (orqaga moslik) buzilmasdan ishlashini kafolatlaydi.
-- 3. INSTEAD OF INSERT, UPDATE, DELETE triggerlari orqali 'checks' view ustida
--    bajarilgan barcha operatsiyalar to'g'ridan-to'g'ri 'compliance_checks' jadvaliga
--    yoziladi va yangilanadi.
-- 4. organization_id avtomatik aniqlanadi yoki bog'liq loyihadan olinadi.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP EXISTING VIEW AND TRIGGERS IF EXIST
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.checks CASCADE;

-- ----------------------------------------------------------------------------
-- 2. CREATE 'checks' VIEW (compliance_checks jadvaliga havola, security_invoker faol)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.checks
WITH (security_invoker = true) AS
SELECT
    cc.id,
    cc.organization_id,
    cc.project_id,
    cc.drawing_file_id,
    COALESCE(df.file_name, 'drawing') AS file_name,
    COALESCE(df.storage_path, '') AS file_path,
    cc.status,
    COALESCE(cc.compliance_results->'violations', '[]'::jsonb) AS results,
    COALESCE(cc.compliance_results->'summary', '{}'::jsonb) AS summary,
    cc.compliance_results->>'error_message' AS error_message,
    cc.compliance_score,
    cc.check_type,
    cc.standard_code,
    cc.total_rules,
    cc.passed_count,
    cc.failed_count,
    cc.warning_count,
    cc.duration_ms,
    cc.summary_uz,
    cc.summary_ru,
    cc.created_at,
    cc.completed_at,
    cc.updated_at
FROM public.compliance_checks cc
LEFT JOIN public.drawing_files df ON cc.drawing_file_id = df.id;

COMMENT ON VIEW public.checks IS 
'Backend API va orqaga moslik uchun compliance_checks jadvaliga ulangan RLS-himoyalangan VIEW';

-- ----------------------------------------------------------------------------
-- 3. INSTEAD OF INSERT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_checks_view_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_proj_id UUID;
    v_check_id UUID;
    v_results_json JSONB;
BEGIN
    -- 1. Check ID ni ta'minlash (UUID formatida)
    v_check_id := COALESCE(NEW.id, gen_random_uuid());
    v_proj_id := NEW.project_id;

    -- 2. organization_id ni aniqlash (Zero cross-tenant leakage: hech qanday birinchi tashkilot fallback'i yo'q)
    IF NEW.organization_id IS NOT NULL THEN
        v_org_id := NEW.organization_id;
    ELSIF v_proj_id IS NOT NULL THEN
        SELECT organization_id INTO v_org_id 
        FROM public.projects 
        WHERE id = v_proj_id;
    END IF;

    -- Agar tashkilot aniqlanmasa, xatolik beriladi (begona tashkilotga ma'lumot tushib qolmasligi uchun)
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Xavfsizlik xatosi: Tekshiruv aniq organization_id ga bog''langan bo''lishi shart.';
    END IF;

    -- 3. Loyiha mavjudligini kafolatlash (Foreign Key xatolarini oldini olish)
    IF v_proj_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_proj_id) THEN
        INSERT INTO public.projects (id, organization_id, name, building_type, status)
        VALUES (
            v_proj_id,
            v_org_id,
            'Avtomatik Loyiha ' || SUBSTRING(v_proj_id::text, 1, 8),
            'residential',
            'active'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 4. compliance_results JSON strukturasini yig'ish
    v_results_json := jsonb_build_object(
        'version', '1.0.0',
        'rules_engine', 'QMQRulesEngine',
        'violations', COALESCE(NEW.results, '[]'::jsonb),
        'summary', COALESCE(NEW.summary, '{}'::jsonb),
        'error_message', NEW.error_message
    );

    -- 5. compliance_checks jadvaliga yozish
    INSERT INTO public.compliance_checks (
        id,
        organization_id,
        project_id,
        drawing_file_id,
        check_type,
        standard_code,
        status,
        total_rules,
        passed_count,
        failed_count,
        warning_count,
        compliance_score,
        compliance_results,
        summary_uz,
        created_at,
        completed_at,
        updated_at
    ) VALUES (
        v_check_id,
        v_org_id,
        v_proj_id,
        NEW.drawing_file_id,
        COALESCE(NEW.check_type, 'full'),
        COALESCE(NEW.standard_code, 'QMQ'),
        COALESCE(NEW.status, 'pending'),
        COALESCE(NEW.total_rules, 0),
        COALESCE(NEW.passed_count, 0),
        COALESCE(NEW.failed_count, 0),
        COALESCE(NEW.warning_count, 0),
        NEW.compliance_score,
        v_results_json,
        COALESCE(NEW.summary_uz, 'Tekshiruv navbatda'),
        COALESCE(NEW.created_at, NOW()),
        NEW.completed_at,
        NOW()
    );

    NEW.id := v_check_id;
    NEW.organization_id := v_org_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checks_view_insert
    INSTEAD OF INSERT ON public.checks
    FOR EACH ROW EXECUTE FUNCTION public.handle_checks_view_insert();

-- ----------------------------------------------------------------------------
-- 4. INSTEAD OF UPDATE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_checks_view_update()
RETURNS TRIGGER AS $$
DECLARE
    v_results_json JSONB;
BEGIN
    v_results_json := jsonb_build_object(
        'version', '1.0.0',
        'rules_engine', 'QMQRulesEngine',
        'violations', COALESCE(NEW.results, OLD.results, '[]'::jsonb),
        'summary', COALESCE(NEW.summary, OLD.summary, '{}'::jsonb),
        'error_message', COALESCE(NEW.error_message, OLD.error_message)
    );

    UPDATE public.compliance_checks
    SET
        status = COALESCE(NEW.status, OLD.status),
        total_rules = COALESCE(NEW.total_rules, OLD.total_rules),
        passed_count = COALESCE(NEW.passed_count, OLD.passed_count),
        failed_count = COALESCE(NEW.failed_count, OLD.failed_count),
        warning_count = COALESCE(NEW.warning_count, OLD.warning_count),
        compliance_score = COALESCE(NEW.compliance_score, OLD.compliance_score),
        compliance_results = v_results_json,
        summary_uz = COALESCE(NEW.summary_uz, OLD.summary_uz),
        summary_ru = COALESCE(NEW.summary_ru, OLD.summary_ru),
        completed_at = COALESCE(NEW.completed_at, OLD.completed_at),
        updated_at = NOW()
    WHERE id = OLD.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checks_view_update
    INSTEAD OF UPDATE ON public.checks
    FOR EACH ROW EXECUTE FUNCTION public.handle_checks_view_update();

-- ----------------------------------------------------------------------------
-- 5. INSTEAD OF DELETE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_checks_view_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.compliance_checks WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checks_view_delete
    INSTEAD OF DELETE ON public.checks
    FOR EACH ROW EXECUTE FUNCTION public.handle_checks_view_delete();

-- ----------------------------------------------------------------------------
-- 6. PERMISSIONS & GRANTS (Strictly no anon access - Zero Leakage)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checks TO service_role;
-- ANON ruxsati qat'iyan taqiqlanadi (RLS orqali faqat autentifikatsiyalangan tenantlar ko'radi)
