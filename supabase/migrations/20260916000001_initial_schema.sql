-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 01: Core Schema & Constraints
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    logo_url TEXT,
    country_code TEXT NOT NULL DEFAULT 'QA',
    default_language TEXT NOT NULL DEFAULT 'ar' CHECK (default_language IN ('ar', 'en')),
    timezone TEXT NOT NULL DEFAULT 'Asia/Qatar',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dept_code_org UNIQUE (organization_id, code)
);

-- 3. PROFILES (Associated with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    mobile TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    preferred_language TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'security', 'admin', 'super_admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_org UNIQUE (organization_id, employee_id)
);

-- 4. VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    normalized_plate TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT NOT NULL,
    year INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vehicle_plate_org UNIQUE (organization_id, normalized_plate)
);

-- 5. STAFF_VEHICLES (Multiple vehicles per employee, single primary flag)
CREATE TABLE IF NOT EXISTS staff_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_staff_vehicle UNIQUE (organization_id, staff_id, vehicle_id)
);

-- 6. PARKING_ALERT_TYPES
CREATE TABLE IF NOT EXISTS parking_alert_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alert_type_code UNIQUE (organization_id, code)
);

-- 7. PARKING_ALERTS
CREATE TABLE IF NOT EXISTS parking_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    alert_type_id UUID NOT NULL REFERENCES parking_alert_types(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'cancelled')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- 8. VEHICLE_SEARCH_EVENTS (Operational analytics)
CREATE TABLE IF NOT EXISTS vehicle_search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    searched_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    normalized_query TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'partial', 'none')),
    result_count INTEGER NOT NULL DEFAULT 0,
    selected_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. UNKNOWN_VEHICLE_REPORTS
CREATE TABLE IF NOT EXISTS unknown_vehicle_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    plate_number TEXT NOT NULL,
    normalized_plate TEXT NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'identified', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 10. CONTACT_ACTION_EVENTS (Funnel tracking: WhatsApp opens, Call initiated, Alert created)
CREATE TABLE IF NOT EXISTS contact_action_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    search_event_id UUID REFERENCES vehicle_search_events(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('call', 'whatsapp', 'parking_alert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. IMPORT_JOBS
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    importer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    warning_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    summary_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT_LOGS (Append-only administrative logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    change_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    privacy_mode TEXT NOT NULL DEFAULT 'mode_a' CHECK (privacy_mode IN ('mode_a', 'mode_b', 'mode_c')),
    partial_search_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_partial_digits INTEGER NOT NULL DEFAULT 3 CHECK (min_partial_digits >= 2 AND min_partial_digits <= 6),
    default_language TEXT NOT NULL DEFAULT 'ar' CHECK (default_language IN ('ar', 'en')),
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    country_calling_code TEXT NOT NULL DEFAULT '+974',
    branding JSONB DEFAULT '{"primary_color": "#8A1538"}'::jsonb,
    retention_days INTEGER NOT NULL DEFAULT 90,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_org_norm_plate ON vehicles (organization_id, normalized_plate);
CREATE INDEX IF NOT EXISTS idx_profiles_org_emp ON profiles (organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_dept ON profiles (organization_id, department_id);
CREATE INDEX IF NOT EXISTS idx_parking_alerts_org_created ON parking_alerts (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parking_alerts_org_status ON parking_alerts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_search_events_org_created ON vehicle_search_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unknown_reports_org_status ON unknown_vehicle_reports (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_unknown_reports_norm_plate ON unknown_vehicle_reports (organization_id, normalized_plate);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs (organization_id, created_at DESC);
