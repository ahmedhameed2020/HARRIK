-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 07
--   * Visitor-pass alert targeting (fixes vehicle_id FK misuse)
--   * Durable, server-authoritative alert throttle (replaces in-memory Map)
--   * Notification channel preference on profiles (Push / Push+SMS fallback)
-- ============================================================================

-- 1. PARKING_ALERTS — support visitor-pass targets in addition to vehicles
ALTER TABLE public.parking_alerts ALTER COLUMN vehicle_id DROP NOT NULL;

ALTER TABLE public.parking_alerts
    ADD COLUMN IF NOT EXISTS visitor_pass_id UUID REFERENCES public.visitor_passes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_parking_alerts_visitor ON public.parking_alerts(visitor_pass_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_alerts_target'
    ) THEN
        ALTER TABLE public.parking_alerts
            ADD CONSTRAINT chk_parking_alerts_target
            CHECK (vehicle_id IS NOT NULL OR visitor_pass_id IS NOT NULL);
    END IF;
END $$;

-- 2. ALERT_THROTTLE — durable suppression window (permit token)
CREATE TABLE IF NOT EXISTS public.alert_throttle (
    permit_token TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_throttle_last ON public.alert_throttle(last_sent_at);

ALTER TABLE public.alert_throttle ENABLE ROW LEVEL SECURITY;

-- Accessible only through the SECURITY DEFINER function below.
REVOKE ALL ON public.alert_throttle FROM PUBLIC, anon, authenticated;

-- Atomically claims an alert slot for a permit token.
-- Returns TRUE when the caller may send an alert, FALSE when still within the window.
CREATE OR REPLACE FUNCTION public.claim_alert_slot(
    p_token TEXT,
    p_org_id UUID DEFAULT NULL,
    p_window_seconds INT DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_last TIMESTAMPTZ;
BEGIN
    SELECT last_sent_at INTO v_last
    FROM public.alert_throttle
    WHERE permit_token = p_token
    FOR UPDATE;

    IF v_last IS NOT NULL AND (NOW() - v_last) < make_interval(secs => p_window_seconds) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.alert_throttle (permit_token, organization_id, last_sent_at)
    VALUES (p_token, p_org_id, NOW())
    ON CONFLICT (permit_token) DO UPDATE
        SET last_sent_at = NOW(),
            organization_id = COALESCE(EXCLUDED.organization_id, public.alert_throttle.organization_id);

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Fail-open: never block an emergency parking alert because of throttle errors.
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_alert_slot(TEXT, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_alert_slot(TEXT, UUID, INT) TO anon, authenticated;

-- 3. NOTIFICATION PREFERENCES — channel selection for owners
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS notification_channel TEXT NOT NULL DEFAULT 'push'
        CHECK (notification_channel IN ('push', 'push_sms', 'all'));

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
