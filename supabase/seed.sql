-- ============================================================================
-- Me'morAI — Test va Namunaviy Ma'lumotlar (Seed Data)
-- Versiya: 1.0.0
-- Loyiha: Me'morAI (O'zbekiston QMQ / ShNQ Qurilish Me'yorlari AI Audit Tizimi)
-- ============================================================================
-- Ushbu fayl test muhiti va dastlabki ishlab chiqish uchun quyidagilarni yaratadi:
-- 1. 1 ta Tashkilot (Toshkent Bosh Reja va Arxitektura MCHJ)
-- 2. 1 ta Pro tarif obunasi
-- 3. 1 ta Bosh Admin foydalanuvchi (auth.users va public.users)
-- 4. 2 ta Namunaviy arxitektura loyihasi:
--    a) Yunusobod 16-mavze ko'p qavatli turar-joy majmuasi (Blok A)
--    b) Mirzo Ulug'bek IT Plaza biznes va savdo markazi
-- 5. Bog'langan chizma fayllar (DWG va PDF)
-- 6. QMQ 2.08.01-89* va yong'in xavfsizligi bo'yicha real tekshiruv natijalari
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TEST TASHKILOTI (Test Organization)
-- ----------------------------------------------------------------------------
INSERT INTO public.organizations (
    id,
    name,
    slug,
    stir,
    email,
    phone,
    address,
    city,
    logo_url,
    is_active,
    settings
) VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Toshkent Bosh Reja va Arxitektura MCHJ',
    'toshkent-bosh-reja',
    '308942189',
    'info@boshreja.uz',
    '+998712001122',
    'Toshkent shahar, Navoiy shox ko''chasi, 18-uy',
    'Toshkent',
    'https://memorai.uz/assets/org-logos/boshreja.png',
    TRUE,
    '{
        "default_standard": "QMQ",
        "default_seismic_zone": 9,
        "language": "uz",
        "units": "metric",
        "notifications": {
            "email": true,
            "telegram": true
        }
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug;

-- ----------------------------------------------------------------------------
-- 2. OBUNA VA TARIF (Subscription - Pro Plan)
-- ----------------------------------------------------------------------------
INSERT INTO public.subscriptions (
    id,
    organization_id,
    plan,
    status,
    billing_cycle,
    monthly_checks_limit,
    used_checks_count,
    max_file_size_mb,
    storage_limit_gb,
    price_uzs,
    starts_at,
    expires_at,
    features
) VALUES (
    's0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'pro',
    'active',
    'monthly',
    100,
    2,
    250,
    25.00,
    2500000.00,
    NOW(),
    NOW() + INTERVAL '1 year',
    '{
        "dwg_support": true,
        "dxf_support": true,
        "pdf_support": true,
        "ifc_support": true,
        "export_pdf_report": true,
        "api_access": true,
        "priority_processing": true,
        "unlimited_members": true
    }'::jsonb
) ON CONFLICT (organization_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 3. ADMIN FOYDALANUVCHI (Supabase Auth & Public Profile)
-- ----------------------------------------------------------------------------

-- Supabase auth.users jadvali mavjud bo'lsa, xavfsiz qo'shamiz
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            'e1111111-1111-1111-1111-111111111111'::uuid,
            'authenticated',
            'authenticated',
            'admin@memorai.uz',
            crypt('MemoraAdmin2026!', gen_salt('bf')),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Javohirbek Asqarov", "role": "owner"}'::jsonb,
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Public users profili
INSERT INTO public.users (
    id,
    organization_id,
    email,
    full_name,
    role,
    phone,
    avatar_url,
    is_active
) VALUES (
    'e1111111-1111-1111-1111-111111111111'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'admin@memorai.uz',
    'Javohirbek Asqarov',
    'owner',
    '+998901234567',
    'https://memorai.uz/assets/avatars/jasper.jpg',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 4. NAMUNAVIY LOYIHALAR (Sample Projects)
-- ----------------------------------------------------------------------------

-- 1-loyiha: Turar-joy majmuasi (Yunusobod)
INSERT INTO public.projects (
    id,
    organization_id,
    created_by,
    name,
    code,
    description,
    building_type,
    address,
    city,
    total_floors,
    total_area_sqm,
    seismic_zone,
    status,
    metadata
) VALUES (
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'e1111111-1111-1111-1111-111111111111'::uuid,
    'Yunusobod 16-mavze ko''p qavatli turar-joy majmuasi (Blok A)',
    'PRJ-2026-YUN-01',
    '9 qavatli, yerosti avtoturargohli zamonaviy ko''p kvartirali turar-joy binosi.',
    'residential',
    'Yunusobod tumani, 16-mavze, 45-uchastka',
    'Toshkent',
    9,
    14500.50,
    9,
    'active',
    '{
        "cadastral_number": "10:04:02:01:04:0451",
        "designer_company": "Toshkent Bosh Reja MCHJ",
        "chief_architect": "Javohirbek Asqarov",
        "apartments_count": 72,
        "parking_spots": 50
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

-- 2-loyiha: Biznes markazi (Mirzo Ulug'bek)
INSERT INTO public.projects (
    id,
    organization_id,
    created_by,
    name,
    code,
    description,
    building_type,
    address,
    city,
    total_floors,
    total_area_sqm,
    seismic_zone,
    status,
    metadata
) VALUES (
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'e1111111-1111-1111-1111-111111111111'::uuid,
    'Mirzo Ulug''bek IT Plaza biznes va innovatsiya markazi',
    'PRJ-2026-MU-IT02',
    '5 qavatli A-klass ofislar, kovorking va savdo galereyasiga ega biznes markaz.',
    'commercial',
    'Mirzo Ulug''bek tumani, Mustaqillik shox ko''chasi, 102-uy',
    'Toshkent',
    5,
    8600.00,
    8,
    'in_review',
    '{
        "cadastral_number": "10:06:01:03:02:0118",
        "designer_company": "Toshkent Bosh Reja MCHJ",
        "chief_architect": "Javohirbek Asqarov",
        "office_capacity": 650
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 5. CHIZMA FAYLLAR (Drawing Files)
-- ----------------------------------------------------------------------------

-- Yunusobod loyihasiga DWG chizma
INSERT INTO public.drawing_files (
    id,
    organization_id,
    project_id,
    uploaded_by,
    file_name,
    file_type,
    file_size_bytes,
    storage_path,
    bucket_name,
    version,
    checksum_sha256,
    status,
    parsed_data
) VALUES (
    'c1111111-1111-1111-1111-111111111111'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'e1111111-1111-1111-1111-111111111111'::uuid,
    'Yunusobod_Blok_A_Reja_1-qavat.dwg',
    'dwg',
    18452300,
    'projects/b1111111-1111-1111-1111-111111111111/drawings/Yunusobod_Blok_A_Reja_1-qavat.dwg',
    'drawings',
    1,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'parsed',
    '{
        "cad_version": "AutoCAD 2024",
        "layers_count": 28,
        "detected_rooms": 14,
        "corridor_width_m": 1.15,
        "living_room_height_m": 2.80,
        "kitchen_area_sqm": 11.2,
        "evacuation_exits": 2
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

-- Mirzo Ulug'bek IT Plaza loyihasiga PDF chizma
INSERT INTO public.drawing_files (
    id,
    organization_id,
    project_id,
    uploaded_by,
    file_name,
    file_type,
    file_size_bytes,
    storage_path,
    bucket_name,
    version,
    checksum_sha256,
    status,
    parsed_data
) VALUES (
    'c2222222-2222-2222-2222-222222222222'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'e1111111-1111-1111-1111-111111111111'::uuid,
    'IT_Plaza_Arxitektura_Plani_v2.pdf',
    'pdf',
    32410500,
    'projects/b2222222-2222-2222-2222-222222222222/drawings/IT_Plaza_Arxitektura_Plani_v2.pdf',
    'drawings',
    2,
    'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    'processing',
    '{
        "pages_count": 12,
        "scale": "1:100",
        "ocr_status": "in_progress"
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 6. AUDIT SEANSI (Compliance Check Session)
-- ----------------------------------------------------------------------------
INSERT INTO public.compliance_checks (
    id,
    organization_id,
    project_id,
    drawing_file_id,
    initiated_by,
    check_type,
    standard_code,
    status,
    total_rules,
    passed_count,
    failed_count,
    warning_count,
    compliance_score,
    summary_uz,
    summary_ru,
    duration_ms,
    completed_at,
    compliance_results
) VALUES (
    'd1111111-1111-1111-1111-111111111111'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'c1111111-1111-1111-1111-111111111111'::uuid,
    'e1111111-1111-1111-1111-111111111111'::uuid,
    'full',
    'QMQ',
    'completed',
    3,
    2,
    1,
    0,
    66.67,
    'Tekshiruv yakunlandi: 2 ta qoida muvofiq, 1 ta jiddiy qoidabuzarlik aniqlandi (Evakuatsiya yo''lagi kengligi talabga javob bermaydi).',
    'Проверка завершена: 2 нормы соблюдены, выявлено 1 критическое нарушение (Ширина эвакуационного коридора меньше нормы).',
    4280,
    NOW(),
    '{
        "version": "1.0.0",
        "rules_engine": "QMQRulesEngine",
        "standards": ["QMQ 2.08.01-89*", "QMQ 2.01.05-19"],
        "summary": {
            "total": 3,
            "passed": 2,
            "failed": 1,
            "score_pct": 66.67
        },
        "violations": [
            {
                "rule_id": "QMQ_2_01_05_19_CL_2_4",
                "clause": "2.4",
                "severity": "critical",
                "issue": "Umumiy evakuatsiya yo''lagi kengligi yetarli emas: 1.15m < 1.20m"
            }
        ]
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 7. CHECK_RESULTS (Har bir qoida natijasi — rules_engine.py CheckResult ga mos)
-- ----------------------------------------------------------------------------

-- 1-natija: Yashash xonasi balandligi (PASS)
INSERT INTO public.check_results (
    id,
    organization_id,
    compliance_check_id,
    rule_id,
    code,
    clause,
    category,
    severity,
    status,
    title_uz,
    title_ru,
    actual_value,
    required_value,
    message_uz,
    message_ru,
    confidence,
    evidence_bbox,
    source_page,
    notes
) VALUES (
    'e0000001-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd1111111-1111-1111-1111-111111111111'::uuid,
    'QMQ_2_08_01_89_CL_1_25',
    'QMQ 2.08.01-89*',
    '1.25',
    'yashash_binolari',
    'high',
    'pass',
    'Turar-joy xonalari va oshxona toza balandligi',
    'Высота жилых комнат и кухни в чистоте',
    '{"height_m": 2.80}'::jsonb,
    '{"min_height_m": 2.70}'::jsonb,
    'Xona balandligi 2.80 m. QMQ talabi (kamida 2.70 m) to''liq bajarilgan.',
    'Высота помещения 2.80 м. Требование КМК (не менее 2.70 м) соблюдено.',
    0.995,
    '{"bbox": [100.0, 200.0, 350.0, 450.0]}'::jsonb,
    1,
    'Blok A 1-qavat markaziy yashash xonasi kesimi bo''yicha hisoblandi.'
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

-- 2-natija: Oshxona maydoni (PASS)
INSERT INTO public.check_results (
    id,
    organization_id,
    compliance_check_id,
    rule_id,
    code,
    clause,
    category,
    severity,
    status,
    title_uz,
    title_ru,
    actual_value,
    required_value,
    message_uz,
    message_ru,
    confidence,
    evidence_bbox,
    source_page,
    notes
) VALUES (
    'e0000002-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd1111111-1111-1111-1111-111111111111'::uuid,
    'QMQ_2_08_01_89_CL_1_34',
    'QMQ 2.08.01-89*',
    '1.34',
    'yashash_binolari',
    'medium',
    'pass',
    'Oshxona maydonining minimal me''yori',
    'Минимальная площадь кухни',
    '{"kitchen_area_sqm": 11.20}'::jsonb,
    '{"min_kitchen_area_sqm": 8.00}'::jsonb,
    'Oshxona maydoni 11.20 kv.m. Talab etilgan me''yor: kamida 8.00 kv.m.',
    'Площадь кухни составляет 11.20 кв.м при минимальной норме 8.00 кв.м.',
    0.980,
    '{"bbox": [400.0, 220.0, 580.0, 390.0]}'::jsonb,
    1,
    'Kvartira turi: 2 xonali.'
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

-- 3-natija: Evakuatsiya yo'lagi kengligi (FAIL - CRITICAL)
INSERT INTO public.check_results (
    id,
    organization_id,
    compliance_check_id,
    rule_id,
    code,
    clause,
    category,
    severity,
    status,
    title_uz,
    title_ru,
    actual_value,
    required_value,
    message_uz,
    message_ru,
    confidence,
    evidence_bbox,
    source_page,
    notes
) VALUES (
    'e0000003-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd1111111-1111-1111-1111-111111111111'::uuid,
    'QMQ_2_01_05_19_CL_2_4',
    'QMQ 2.01.05-19',
    '2.4',
    'yongin_xavfsizligi',
    'critical',
    'fail',
    'Umumiy qavatlararo evakuatsiya yo''lagi kengligi',
    'Ширина эвакуационного межквартирного коридора',
    '{"corridor_width_m": 1.15}'::jsonb,
    '{"min_corridor_width_m": 1.20}'::jsonb,
    'QOIDABUZARLIK: Evakuatsiya yo''lagi kengligi 1.15 m aniqlandi. QMQ talabi bo''yicha kamida 1.20 m bo''lishi shart! (Kamchilik: -0.05 m)',
    'НАРУШЕНИЕ: Ширина коридора составляет 1.15 м, что меньше нормативного минимума 1.20 м по КМК 2.01.05-19 (дефицит: 0.05 м).',
    0.991,
    '{"bbox": [650.0, 150.0, 920.0, 210.0]}'::jsonb,
    1,
    'Blok A 1-qavat zinapoyaga chiquvchi yo''lak o''lchovi.'
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;
