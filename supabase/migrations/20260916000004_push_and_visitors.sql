-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 04: Web Push Subscriptions & Visitor Passes
-- ============================================================================

-- 1. PUSH_SUBSCRIPTIONS (Browser Web Push VAPID subscriptions)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_profile ON push_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_org ON push_subscriptions(organization_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own"
    ON push_subscriptions FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own"
    ON push_subscriptions FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own"
    ON push_subscriptions FOR DELETE
    USING (profile_id = auth.uid());

-- 2. VISITOR_PASSES (Temporary guest & contractor parking passes)
CREATE TABLE IF NOT EXISTS visitor_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    normalized_plate TEXT NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_mobile TEXT NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    host_name TEXT,
    host_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    purpose TEXT,
    issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_normalized_plate ON visitor_passes(organization_id, normalized_plate);
CREATE INDEX IF NOT EXISTS idx_visitor_status ON visitor_passes(organization_id, status);

-- Enable RLS
ALTER TABLE visitor_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_passes_select_org"
    ON visitor_passes FOR SELECT
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "visitor_passes_security_admin_manage"
    ON visitor_passes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'security')
        )
    );
