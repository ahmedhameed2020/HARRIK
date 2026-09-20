-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 08
--   * Generic durable rate-limit buckets (IP / token based, cross-instance)
--   * Timed escalation marker on parking_alerts (stale, unacknowledged alerts)
-- ============================================================================

-- 1. GENERIC RATE LIMIT BUCKETS ------------------------------------------------
-- Replaces per-endpoint in-memory Maps so limits survive worker restarts and are
-- shared across all isolates.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    bucket     TEXT        NOT NULL,
    token      TEXT        NOT NULL,
    last_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hits       INT         NOT NULL DEFAULT 1,
    PRIMARY KEY (bucket, token)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_last ON public.rate_limit_buckets(last_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Reachable only through the SECURITY DEFINER function below.
REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC, anon, authenticated;

-- Atomically claims a slot in (p_bucket, p_token).
-- Returns TRUE when the caller is within the allowed quota, FALSE when the
-- window has been exhausted.
CREATE OR REPLACE FUNCTION public.claim_rate_limit_slot(
    p_bucket         TEXT,
    p_token          TEXT,
    p_window_seconds INT DEFAULT 60,
    p_max_hits       INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_last TIMESTAMPTZ;
    v_hits INT;
BEGIN
    IF p_token IS NULL OR pg_catalog.length(p_token) = 0 THEN
        -- No usable identity (e.g. unknown IP): fail-open rather than lock everyone out.
        RETURN TRUE;
    END IF;

    -- Cheap opportunistic cleanup so the table cannot grow unbounded.
    DELETE FROM public.rate_limit_buckets
     WHERE last_at < NOW() - INTERVAL '2 days';

    SELECT last_at, hits INTO v_last, v_hits
    FROM public.rate_limit_buckets
    WHERE bucket = p_bucket AND token = p_token
    FOR UPDATE;

    IF v_last IS NOT NULL AND (NOW() - v_last) < make_interval(secs => p_window_seconds) THEN
        IF v_hits >= p_max_hits THEN
            RETURN FALSE;
        END IF;
        UPDATE public.rate_limit_buckets
           SET hits = v_hits + 1
         WHERE bucket = p_bucket AND token = p_token;
        RETURN TRUE;
    END IF;

    INSERT INTO public.rate_limit_buckets (bucket, token, last_at, hits)
    VALUES (p_bucket, p_token, NOW(), 1)
    ON CONFLICT (bucket, token) DO UPDATE
        SET last_at = NOW(), hits = 1;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Fail-open: a throttling failure must never block a legitimate emergency action.
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_rate_limit_slot(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_rate_limit_slot(TEXT, TEXT, INT, INT) TO anon, authenticated;

-- 2. TIMED ESCALATION MARKER ---------------------------------------------------
-- Marks alerts that were escalated to security/admin because the owner did not
-- acknowledge them within the configured window.
ALTER TABLE public.parking_alerts
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_parking_alerts_needs_escalation
    ON public.parking_alerts (organization_id, created_at)
    WHERE escalated_at IS NULL AND status = 'pending';

-- 3. UNKNOWN REPORT → REGISTERED VEHICLE LINK ----------------------------------
-- Records which vehicle an unknown-vehicle report was resolved into.
ALTER TABLE public.unknown_vehicle_reports
    ADD COLUMN IF NOT EXISTS matched_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_unknown_reports_matched_vehicle
    ON public.unknown_vehicle_reports(matched_vehicle_id);
