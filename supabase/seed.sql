-- ============================================================================
-- حَرِّك | HARRIK — Qatar Secondary School Seed Data
-- ============================================================================

-- Primary Tenant Organization
INSERT INTO organizations (id, name_en, name_ar, logo_url, country_code, default_language, timezone)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Qatar Secondary School for Boys',
    'مدرسة قطر الثانوية للبنين',
    '/logo.png',
    'QA',
    'ar',
    'Asia/Qatar'
) ON CONFLICT (id) DO NOTHING;

-- System Settings
INSERT INTO system_settings (organization_id, privacy_mode, partial_search_enabled, min_partial_digits, default_language, whatsapp_enabled, country_calling_code)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'mode_a',
    TRUE,
    3,
    'ar',
    TRUE,
    '+974'
) ON CONFLICT (organization_id) DO NOTHING;

-- Departments
INSERT INTO departments (id, organization_id, code, name_en, name_ar, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ENG', 'English Department', 'قسم اللغة الإنجليزية', TRUE),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ARA', 'Arabic Department', 'قسم اللغة العربية', TRUE),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MTH', 'Mathematics Department', 'قسم الرياضيات', TRUE),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'SCI', 'Science Department', 'قسم العلوم', TRUE),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ISL', 'Islamic Studies', 'قسم التربية الإسلامية', TRUE),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'SOC', 'Social Studies', 'قسم الدراسات الاجتماعية', TRUE),
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'PED', 'Physical Education', 'قسم التربية البدنية', TRUE),
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'ADM', 'Administration & IT', 'الإدارة وتكنولوجيا المعلومات', TRUE),
    ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'SEC', 'Security & Safety', 'الأمن والسلامة', TRUE)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Parking Alert Types
INSERT INTO parking_alert_types (id, organization_id, code, name_en, name_ar, icon, sort_order, is_active)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'BLOCKING', 'Blocking my vehicle', 'سيارتك حاجزة سيارتي', 'Car', 1, TRUE),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'LIGHTS_ON', 'Lights are on', 'أنوار السيارة مفتوحة', 'Lightbulb', 2, TRUE),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'WINDOW_OPEN', 'Window is open', 'نافذة السيارة مفتوحة', 'Maximize2', 3, TRUE),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'CHECK_VEHICLE', 'Check your vehicle', 'يرجى التوجه للسيارة', 'AlertTriangle', 4, TRUE),
    ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'CONTACT_ME', 'Contact me', 'يرجى التواصل معي', 'PhoneCall', 5, TRUE)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Seed Auth Users for Staff Profiles
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    phone_change_token,
    is_sso_user,
    is_anonymous
) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ahmed.hassan@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Ahmed Hassan"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'khalid.kuwari@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Khalid Al-Kuwari"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mohammed.sulaiti@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Mohammed Al-Sulaiti"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'abdullah.marri@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Abdullah Al-Marri"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'salem.hajri@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Salem Al-Hajri"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'omar.farooq@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Omar Farooq"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hamad.khelaifi@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Hamad Al-Khelaifi"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tariq.mansoor@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Tariq Mansoor"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'faisal.nuaimi@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Faisal Al-Nuaimi"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim.sayed@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Ibrahim Al-Sayed"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ali.dosari@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Ali Al-Dosari"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'youssef.mahmoud@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Youssef Mahmoud"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'saad.kuwari@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Saad Al-Kuwari"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nasser.kaabi@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Nasser Al-Kaabi"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false),
    ('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'khamis.subaey@school.edu.qa', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Khamis Al-Subaey"}'::jsonb, NOW(), NOW(), '', '', '', '', '', '', '', false, false)
ON CONFLICT (id) DO NOTHING;

-- Seed Auth Identities
INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
)
SELECT
    id,
    id::text,
    id,
    jsonb_build_object('sub', id::text, 'email', email),
    'email',
    created_at,
    updated_at
FROM auth.users
WHERE id BETWEEN '30000000-0000-0000-0000-000000000001' AND '30000000-0000-0000-0000-000000000015'
ON CONFLICT (provider_id, provider) DO NOTHING;

-- Insert Staff Profiles (linked to auth.users)
INSERT INTO profiles (id, organization_id, employee_id, name_en, name_ar, mobile, department_id, role, preferred_language, is_active)
VALUES
    -- Admin & Critical test user: Ahmed Hassan
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '142', 'Ahmed Hassan', 'أحمد حسن', '+97455123456', '10000000-0000-0000-0000-000000000001', 'admin', 'ar', TRUE),
    -- Security Officer: Khalid Al-Kuwari
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '101', 'Khalid Al-Kuwari', 'خالد الكواري', '+97455987654', '10000000-0000-0000-0000-000000000009', 'security', 'ar', TRUE),
    -- Staff 3-30
    ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '103', 'Mohammed Al-Sulaiti', 'محمد السليطي', '+97455223344', '10000000-0000-0000-0000-000000000002', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '104', 'Abdullah Al-Marri', 'عبدالله المري', '+97466334455', '10000000-0000-0000-0000-000000000003', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '105', 'Salem Al-Hajri', 'سالم الهاجري', '+97477445566', '10000000-0000-0000-0000-000000000004', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '106', 'Omar Farooq', 'عمر فاروق', '+97455889900', '10000000-0000-0000-0000-000000000001', 'staff', 'en', TRUE),
    ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '107', 'Hamad Al-Khelaifi', 'حمد الخليفي', '+97466112233', '10000000-0000-0000-0000-000000000005', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '108', 'Tariq Mansoor', 'طارق منصور', '+97477223344', '10000000-0000-0000-0000-000000000006', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '109', 'Faisal Al-Nuaimi', 'فيصل النعيمي', '+97455667788', '10000000-0000-0000-0000-000000000007', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '110', 'Ibrahim Al-Sayed', 'إبراهيم السيد', '+97466778899', '10000000-0000-0000-0000-000000000008', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '111', 'Ali Al-Dosari', 'علي الدوسري', '+97477889900', '10000000-0000-0000-0000-000000000002', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '112', 'Youssef Mahmoud', 'يوسف محمود', '+97455001122', '10000000-0000-0000-0000-000000000003', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '113', 'Saad Al-Kuwari', 'سعد الكواري', '+97466990011', '10000000-0000-0000-0000-000000000004', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '114', 'Nasser Al-Kaabi', 'ناصر الكعبي', '+97477112233', '10000000-0000-0000-0000-000000000005', 'staff', 'ar', TRUE),
    ('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '115', 'Khamis Al-Subaey', 'خميس السبيعي', '+97455334455', '10000000-0000-0000-0000-000000000006', 'staff', 'ar', TRUE)
ON CONFLICT (organization_id, employee_id) DO NOTHING;

-- Insert Vehicles (38 vehicles, including 482731, 112731, 771925)
INSERT INTO vehicles (id, organization_id, plate_number, normalized_plate, make, model, color, year, is_active)
VALUES
    -- Ahmed Hassan's Primary Vehicle
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '482731', '482731', 'Toyota', 'Land Cruiser', 'White', 2023, TRUE),
    -- Ambiguous match vehicle for partial search '2731'
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '112731', '112731', 'Toyota', 'Camry', 'Silver', 2022, TRUE),
    -- Ahmed Hassan's Secondary Vehicle
    ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '771925', '771925', 'Nissan', 'Patrol', 'Black', 2024, TRUE),
    -- Khalid Al-Kuwari's Vehicle
    ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '554820', '554820', 'Lexus', 'LX600', 'Pearl White', 2024, TRUE),
    -- Additional vehicles
    ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '992731', '992731', 'Toyota', 'Prado', 'Grey', 2021, TRUE),
    ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '334912', '334912', 'Ford', 'Expedition', 'Blue', 2020, TRUE),
    ('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '662109', '662109', 'GMC', 'Yukon', 'Black', 2023, TRUE),
    ('40000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '881472', '881472', 'Hyundai', 'Santa Fe', 'Silver', 2022, TRUE),
    ('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '225419', '225419', 'Kia', 'Telluride', 'Dark Grey', 2023, TRUE)
ON CONFLICT (organization_id, normalized_plate) DO NOTHING;

-- Staff ↔ Vehicles Associations
INSERT INTO staff_vehicles (organization_id, staff_id, vehicle_id, is_primary)
VALUES
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', FALSE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000006', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000007', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000008', TRUE),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000009', TRUE)
ON CONFLICT (organization_id, staff_id, vehicle_id) DO NOTHING;

-- Sample Parking Alerts
INSERT INTO parking_alerts (id, organization_id, vehicle_id, owner_id, reporter_id, alert_type_id, status, message, created_at, acknowledged_at, resolved_at)
VALUES
    -- Resolved alert 1 (resolved in 3m 45s)
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'resolved', 'سيارتك حاجزة سيارة المعلم', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 58 minutes', NOW() - INTERVAL '3 hours 56 minutes'),
    -- Acknowledged alert 2
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'acknowledged', 'الأنوار مفتوحة في المواقف الجنوبية', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '30 minutes', NULL),
    -- Pending alert 3
    ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'pending', 'حاجز سيارة التربية الإسلامية', NOW() - INTERVAL '12 minutes', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Sample Unknown Vehicle Reports
INSERT INTO unknown_vehicle_reports (id, organization_id, reported_by, plate_number, normalized_plate, vehicle_make, vehicle_model, vehicle_color, note, status, created_at)
VALUES
    ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '883201', '883201', 'Chevrolet', 'Tahoe', 'White', 'متوقفة أمام بوابة الخروج الرئيسية', 'open', NOW() - INTERVAL '2 hours'),
    ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '412093', '412093', 'Mitsubishi', 'Pajero', 'Silver', 'سيارة زائر بدون تصريح', 'open', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample Search Events
INSERT INTO vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '482731', 'exact', 1, NOW() - INTERVAL '4 hours'),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '2731', 'partial', 3, NOW() - INTERVAL '3 hours'),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '883201', 'none', 0, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Sample Audit Log Events
INSERT INTO audit_logs (organization_id, actor_id, action, entity_type, entity_id, change_summary, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'system.initialized', 'organization', '00000000-0000-0000-0000-000000000001', '{"status": "active", "version": "1.0"}'::jsonb, NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'vehicle.created', 'vehicle', '40000000-0000-0000-0000-000000000001', '{"plate": "482731", "owner": "Ahmed Hassan"}'::jsonb, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
