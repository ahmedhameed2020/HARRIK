-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 03: Cloud Security Hardening
-- ============================================================================
-- Purpose:
-- 1. Hardens search_path on all 7 HARRIK functions to empty ('') with schema qualification.
-- 2. Revokes EXECUTE privileges from PUBLIC and anon on all SECURITY DEFINER functions and triggers.
-- 3. Grants minimum necessary EXECUTE privileges to authenticated role only.
-- 4. Optimizes RLS policies with InitPlan pattern (SELECT auth.uid()) / (SELECT current_user_org_id()).
-- 5. Eliminates multiple permissive policies per operation on departments, parking_alert_types,
--    profiles, vehicles, and staff_vehicles while maintaining 100% equivalent authorization semantics.
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION DEFINITION & SEARCH PATH HARDENING (search_path = '')
-- ============================================================================

-- 1.1 PLATE NUMBER NORMALIZATION FUNCTION
CREATE OR REPLACE FUNCTION public.normalize_plate_number(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN '';
    END IF;

    -- Trim whitespace
    cleaned := pg_catalog.btrim(input_text);

    -- Convert Eastern Arabic-Indic digits (٠-٩) to Western (0-9)
    cleaned := pg_catalog.translate(cleaned, '٠١٢٣٤٥٦٧٨٩', '0123456789');

    -- Convert Persian / Urdu digits (۰-۹) to Western (0-9)
    cleaned := pg_catalog.translate(cleaned, '۰۱۲۳۴۵۶۷۸۹', '0123456789');

    -- Remove common separators: spaces, hyphens, dashes, slashes, underscores, dots
    cleaned := pg_catalog.regexp_replace(cleaned, '[\s\-_/\.]+', '', 'g');

    -- Convert uppercase for Latin characters if present
    cleaned := pg_catalog.upper(cleaned);

    RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = '';

-- 1.2 VEHICLE NORMALIZATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.trg_vehicles_normalize_plate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_plate := public.normalize_plate_number(NEW.plate_number);
    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 1.3 UNKNOWN VEHICLE NORMALIZATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.trg_unknown_vehicle_normalize()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_plate := public.normalize_plate_number(NEW.plate_number);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 1.4 CURRENT USER ORG ID HELPER
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- 1.5 CURRENT USER ROLE HELPER
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- 1.6 SECURE PLATE SEARCH RPC
CREATE OR REPLACE FUNCTION public.find_vehicle_by_plate(
    p_query TEXT
)
RETURNS TABLE (
    vehicle_id UUID,
    plate_number TEXT,
    normalized_plate TEXT,
    make TEXT,
    model TEXT,
    color TEXT,
    year INTEGER,
    is_primary BOOLEAN,
    owner_id UUID,
    owner_name_en TEXT,
    owner_name_ar TEXT,
    owner_employee_id TEXT,
    owner_mobile TEXT,
    department_name_en TEXT,
    department_name_ar TEXT,
    match_type TEXT
) AS $$
DECLARE
    v_org_id UUID;
    v_norm_query TEXT;
    v_min_digits INT := 3;
    v_partial_enabled BOOLEAN := TRUE;
    v_privacy_mode TEXT := 'mode_a';
    v_count INT;
    v_matched_type TEXT := 'none';
BEGIN
    -- 1. Explicit Authentication & Organization derivation
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required';
    END IF;

    v_org_id := public.current_user_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not associated with an organization';
    END IF;

    -- Normalize user input
    v_norm_query := public.normalize_plate_number(p_query);
    IF pg_catalog.length(v_norm_query) = 0 THEN
        RETURN;
    END IF;

    -- Fetch organization settings
    SELECT
        COALESCE(min_partial_digits, 3),
        COALESCE(partial_search_enabled, TRUE),
        COALESCE(privacy_mode, 'mode_a')
    INTO v_min_digits, v_partial_enabled, v_privacy_mode
    FROM public.system_settings
    WHERE organization_id = v_org_id;

    -- 1. Try Exact Match
    IF EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.organization_id = v_org_id
          AND v.normalized_plate = v_norm_query
          AND v.is_active = TRUE
    ) THEN
        v_matched_type := 'exact';

        RETURN QUERY
        SELECT
            v.id AS vehicle_id,
            v.plate_number,
            v.normalized_plate,
            v.make,
            v.model,
            v.color,
            v.year,
            COALESCE(sv.is_primary, FALSE) AS is_primary,
            p.id AS owner_id,
            p.name_en AS owner_name_en,
            p.name_ar AS owner_name_ar,
            p.employee_id AS owner_employee_id,
            CASE
                WHEN v_privacy_mode = 'mode_c' THEN ''
                WHEN v_privacy_mode = 'mode_b' THEN ''
                ELSE p.mobile
            END AS owner_mobile,
            d.name_en AS department_name_en,
            d.name_ar AS department_name_ar,
            'exact'::TEXT AS match_type
        FROM public.vehicles v
        LEFT JOIN public.staff_vehicles sv ON sv.vehicle_id = v.id AND sv.organization_id = v_org_id
        LEFT JOIN public.profiles p ON p.id = sv.staff_id AND p.organization_id = v_org_id
        LEFT JOIN public.departments d ON d.id = p.department_id AND d.organization_id = v_org_id
        WHERE v.organization_id = v_org_id
          AND v.normalized_plate = v_norm_query
          AND v.is_active = TRUE;

        -- Record search event
        GET DIAGNOSTICS v_count = ROW_COUNT;
        INSERT INTO public.vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count)
        VALUES (v_org_id, auth.uid(), v_norm_query, 'exact', v_count);
        RETURN;
    END IF;

    -- 2. Try Partial Suffix Match if enabled and meets minimum length
    IF v_partial_enabled AND pg_catalog.length(v_norm_query) >= v_min_digits THEN
        v_matched_type := 'partial';

        RETURN QUERY
        SELECT
            v.id AS vehicle_id,
            v.plate_number,
            v.normalized_plate,
            v.make,
            v.model,
            v.color,
            v.year,
            COALESCE(sv.is_primary, FALSE) AS is_primary,
            p.id AS owner_id,
            p.name_en AS owner_name_en,
            p.name_ar AS owner_name_ar,
            p.employee_id AS owner_employee_id,
            CASE
                WHEN v_privacy_mode = 'mode_c' THEN ''
                WHEN v_privacy_mode = 'mode_b' THEN ''
                ELSE p.mobile
            END AS owner_mobile,
            d.name_en AS department_name_en,
            d.name_ar AS department_name_ar,
            'partial'::TEXT AS match_type
        FROM public.vehicles v
        LEFT JOIN public.staff_vehicles sv ON sv.vehicle_id = v.id AND sv.organization_id = v_org_id
        LEFT JOIN public.profiles p ON p.id = sv.staff_id AND p.organization_id = v_org_id
        LEFT JOIN public.departments d ON d.id = p.department_id AND d.organization_id = v_org_id
        WHERE v.organization_id = v_org_id
          AND v.normalized_plate LIKE ('%' || v_norm_query)
          AND v.is_active = TRUE;

        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            INSERT INTO public.vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count)
            VALUES (v_org_id, auth.uid(), v_norm_query, 'partial', v_count);
            RETURN;
        END IF;
    END IF;

    -- 3. No match found
    INSERT INTO public.vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count)
    VALUES (v_org_id, auth.uid(), v_norm_query, 'none', 0);
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1.7 DASHBOARD OVERVIEW RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(
    p_range_start TIMESTAMPTZ,
    p_range_end TIMESTAMPTZ,
    p_timezone TEXT DEFAULT 'Asia/Qatar'
)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_res JSONB;
    v_staff_count INT;
    v_vehicles_count INT;
    v_staff_with_vehicles INT;
    v_searches_count INT;
    v_successful_searches INT;
    v_no_match_searches INT;
    v_alerts_created INT;
    v_pending_alerts INT;
    v_acknowledged_alerts INT;
    v_resolved_alerts INT;
    v_cancelled_alerts INT;
    v_open_unknown_vehicles INT;
    v_avg_ack_seconds NUMERIC;
    v_avg_res_seconds NUMERIC;
    v_resolved_within_5m_rate NUMERIC;
    v_oldest_active_seconds NUMERIC;
    v_oldest_plate TEXT;
    v_oldest_alert_id UUID;
    v_oldest_status TEXT;
    v_oldest_created TIMESTAMPTZ;
BEGIN
    v_org_id := public.current_user_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Missing organization context';
    END IF;

    -- 1. Counts Overview
    SELECT pg_catalog.count(*) INTO v_staff_count FROM public.profiles WHERE organization_id = v_org_id AND is_active = TRUE;
    SELECT pg_catalog.count(*) INTO v_vehicles_count FROM public.vehicles WHERE organization_id = v_org_id AND is_active = TRUE;
    SELECT pg_catalog.count(DISTINCT staff_id) INTO v_staff_with_vehicles FROM public.staff_vehicles WHERE organization_id = v_org_id;

    -- 2. Range Metric Calculations
    SELECT
        pg_catalog.count(*),
        pg_catalog.count(*) FILTER (WHERE match_type IN ('exact', 'partial')),
        pg_catalog.count(*) FILTER (WHERE match_type = 'none')
    INTO v_searches_count, v_successful_searches, v_no_match_searches
    FROM public.vehicle_search_events
    WHERE organization_id = v_org_id
      AND (p_range_start IS NULL OR created_at >= p_range_start)
      AND (p_range_end IS NULL OR created_at <= p_range_end);

    -- 3. Parking Alert Counts in Range
    SELECT
        pg_catalog.count(*),
        pg_catalog.count(*) FILTER (WHERE status = 'pending'),
        pg_catalog.count(*) FILTER (WHERE status = 'acknowledged'),
        pg_catalog.count(*) FILTER (WHERE status = 'resolved'),
        pg_catalog.count(*) FILTER (WHERE status = 'cancelled'),
        pg_catalog.avg(EXTRACT(epoch FROM (acknowledged_at - created_at))) FILTER (WHERE acknowledged_at IS NOT NULL),
        pg_catalog.avg(EXTRACT(epoch FROM (resolved_at - created_at))) FILTER (WHERE resolved_at IS NOT NULL),
        CASE
            WHEN pg_catalog.count(*) FILTER (WHERE status = 'resolved') > 0 THEN
                pg_catalog.round(
                    (pg_catalog.count(*) FILTER (WHERE status = 'resolved' AND EXTRACT(epoch FROM (resolved_at - created_at)) <= 300)::NUMERIC /
                     pg_catalog.count(*) FILTER (WHERE status = 'resolved')::NUMERIC) * 100, 1
                )
            ELSE NULL
        END
    INTO
        v_alerts_created,
        v_pending_alerts,
        v_acknowledged_alerts,
        v_resolved_alerts,
        v_cancelled_alerts,
        v_avg_ack_seconds,
        v_avg_res_seconds,
        v_resolved_within_5m_rate
    FROM public.parking_alerts
    WHERE organization_id = v_org_id
      AND (p_range_start IS NULL OR created_at >= p_range_start)
      AND (p_range_end IS NULL OR created_at <= p_range_end);

    -- 4. Open Unknown Vehicles
    SELECT pg_catalog.count(*) INTO v_open_unknown_vehicles
    FROM public.unknown_vehicle_reports
    WHERE organization_id = v_org_id AND status = 'open';

    -- 5. Oldest Active Incident
    SELECT
        a.id,
        v.plate_number,
        a.status,
        a.created_at,
        EXTRACT(epoch FROM (pg_catalog.now() - a.created_at))
    INTO
        v_oldest_alert_id,
        v_oldest_plate,
        v_oldest_status,
        v_oldest_created,
        v_oldest_active_seconds
    FROM public.parking_alerts a
    JOIN public.vehicles v ON v.id = a.vehicle_id
    WHERE a.organization_id = v_org_id
      AND a.status IN ('pending', 'acknowledged')
    ORDER BY a.created_at ASC
    LIMIT 1;

    -- Assemble JSON output
    v_res := pg_catalog.jsonb_build_object(
        'schemaVersion', 1,
        'organizationId', v_org_id,
        'timezone', p_timezone,
        'metrics', pg_catalog.jsonb_build_object(
            'registeredStaff', pg_catalog.jsonb_build_object('key', 'registered_staff', 'value', v_staff_count, 'unit', 'count', 'status', 'ok'),
            'registeredVehicles', pg_catalog.jsonb_build_object('key', 'registered_vehicles', 'value', v_vehicles_count, 'unit', 'count', 'status', 'ok'),
            'vehicleCoverage', pg_catalog.jsonb_build_object(
                'key', 'vehicle_coverage',
                'value', CASE WHEN v_staff_count > 0 THEN pg_catalog.round((v_staff_with_vehicles::NUMERIC / v_staff_count::NUMERIC) * 100, 1) ELSE NULL END,
                'unit', 'percentage',
                'status', CASE WHEN v_staff_count > 0 THEN 'ok' ELSE 'empty' END
            ),
            'searches', pg_catalog.jsonb_build_object('key', 'searches', 'value', v_searches_count, 'unit', 'count', 'status', 'ok'),
            'successfulSearches', pg_catalog.jsonb_build_object('key', 'successful_searches', 'value', v_successful_searches, 'unit', 'count', 'status', 'ok'),
            'searchSuccessRate', pg_catalog.jsonb_build_object(
                'key', 'search_success_rate',
                'value', CASE WHEN v_searches_count > 0 THEN pg_catalog.round((v_successful_searches::NUMERIC / v_searches_count::NUMERIC) * 100, 1) ELSE NULL END,
                'unit', 'percentage',
                'status', CASE WHEN v_searches_count > 0 THEN 'ok' ELSE 'empty' END
            ),
            'alertsCreated', pg_catalog.jsonb_build_object('key', 'alerts_created', 'value', v_alerts_created, 'unit', 'count', 'status', 'ok'),
            'activeIncidents', pg_catalog.jsonb_build_object('key', 'active_incidents', 'value', (v_pending_alerts + v_acknowledged_alerts), 'unit', 'count', 'status', 'ok'),
            'pendingAlerts', pg_catalog.jsonb_build_object('key', 'pending_alerts', 'value', v_pending_alerts, 'unit', 'count', 'status', 'ok'),
            'acknowledgedAlerts', pg_catalog.jsonb_build_object('key', 'acknowledged_alerts', 'value', v_acknowledged_alerts, 'unit', 'count', 'status', 'ok'),
            'resolvedAlerts', pg_catalog.jsonb_build_object('key', 'resolved_alerts', 'value', v_resolved_alerts, 'unit', 'count', 'status', 'ok'),
            'resolutionRate', pg_catalog.jsonb_build_object(
                'key', 'resolution_rate',
                'value', CASE WHEN (v_alerts_created - v_cancelled_alerts) > 0 THEN pg_catalog.round((v_resolved_alerts::NUMERIC / (v_alerts_created - v_cancelled_alerts)::NUMERIC) * 100, 1) ELSE NULL END,
                'unit', 'percentage',
                'status', CASE WHEN (v_alerts_created - v_cancelled_alerts) > 0 THEN 'ok' ELSE 'empty' END
            ),
            'averageAcknowledgementTime', pg_catalog.jsonb_build_object('key', 'avg_ack_time', 'value', pg_catalog.round(COALESCE(v_avg_ack_seconds, 0)), 'unit', 'seconds', 'status', CASE WHEN v_avg_ack_seconds IS NOT NULL THEN 'ok' ELSE 'empty' END),
            'averageResolutionTime', pg_catalog.jsonb_build_object('key', 'avg_res_time', 'value', pg_catalog.round(COALESCE(v_avg_res_seconds, 0)), 'unit', 'seconds', 'status', CASE WHEN v_avg_res_seconds IS NOT NULL THEN 'ok' ELSE 'empty' END),
            'resolvedWithinFiveMinutes', pg_catalog.jsonb_build_object('key', 'resolved_within_5m', 'value', pg_catalog.round(COALESCE(v_resolved_within_5m_rate, 0), 1), 'unit', 'percentage', 'status', CASE WHEN v_resolved_within_5m_rate IS NOT NULL THEN 'ok' ELSE 'empty' END),
            'openUnknownVehicles', pg_catalog.jsonb_build_object('key', 'open_unknown', 'value', v_open_unknown_vehicles, 'unit', 'count', 'status', 'ok')
        ),
        'currentIssues', pg_catalog.jsonb_build_object(
            'pending', v_pending_alerts,
            'acknowledged', v_acknowledged_alerts,
            'activeTotal', (v_pending_alerts + v_acknowledged_alerts),
            'openUnknownVehicles', v_open_unknown_vehicles,
            'oldestActiveIncident', CASE
                WHEN v_oldest_alert_id IS NOT NULL THEN pg_catalog.jsonb_build_object(
                    'alertId', v_oldest_alert_id,
                    'plateDisplay', v_oldest_plate,
                    'createdAt', v_oldest_created,
                    'ageSeconds', pg_catalog.round(v_oldest_active_seconds),
                    'status', v_oldest_status
                )
                ELSE NULL
            END
        )
    );

    RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 2. FUNCTION PRIVILEGES & SECURITY HARDENING (ACL REVOCATION)
-- ============================================================================

-- Explicitly revoke ALL privileges from PUBLIC and anon
REVOKE ALL ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

REVOKE ALL ON FUNCTION public.find_vehicle_by_plate(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_vehicle_by_plate(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.normalize_plate_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_plate_number(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.trg_vehicles_normalize_plate() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_unknown_vehicle_normalize() FROM PUBLIC, anon;

-- ============================================================================
-- 3. RLS INITPLAN & MULTIPLE PERMISSIVE POLICIES OPTIMIZATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 ORGANIZATIONS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can update organization" ON public.organizations;

CREATE POLICY "Users can view own organization"
    ON public.organizations FOR SELECT
    USING (id = (SELECT public.current_user_org_id()));

CREATE POLICY "Super admins can update organization"
    ON public.organizations FOR UPDATE
    USING (id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    WITH CHECK (id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.2 DEPARTMENTS (Consolidated to avoid multiple permissive SELECT policies)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view departments in own org" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

CREATE POLICY "Users can view departments in own org"
    ON public.departments FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins can insert departments"
    ON public.departments FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update departments"
    ON public.departments FOR UPDATE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can delete departments"
    ON public.departments FOR DELETE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.3 PROFILES (Consolidated to avoid multiple permissive SELECT and UPDATE policies)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view profiles in own org" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in org" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile or admins update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in own org"
    ON public.profiles FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Users update own profile or admins update org profiles"
    ON public.profiles FOR UPDATE
    USING (
        (id = (SELECT auth.uid()))
        OR
        (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    )
    WITH CHECK (
        (id = (SELECT auth.uid()))
        OR
        (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.4 VEHICLES (Consolidated to avoid multiple permissive SELECT policies)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view vehicles in own org" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and Security can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and Security can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and Security can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and Security can delete vehicles" ON public.vehicles;

CREATE POLICY "Users can view vehicles in own org"
    ON public.vehicles FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins and Security can insert vehicles"
    ON public.vehicles FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin'));

CREATE POLICY "Admins and Security can update vehicles"
    ON public.vehicles FOR UPDATE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin'))
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin'));

CREATE POLICY "Admins and Security can delete vehicles"
    ON public.vehicles FOR DELETE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.5 STAFF VEHICLES (Consolidated to avoid multiple permissive SELECT policies)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view staff vehicles in own org" ON public.staff_vehicles;
DROP POLICY IF EXISTS "Admins can manage staff vehicles" ON public.staff_vehicles;
DROP POLICY IF EXISTS "Admins can insert staff vehicles" ON public.staff_vehicles;
DROP POLICY IF EXISTS "Admins can update staff vehicles" ON public.staff_vehicles;
DROP POLICY IF EXISTS "Admins can delete staff vehicles" ON public.staff_vehicles;

CREATE POLICY "Users can view staff vehicles in own org"
    ON public.staff_vehicles FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins can insert staff vehicles"
    ON public.staff_vehicles FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update staff vehicles"
    ON public.staff_vehicles FOR UPDATE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can delete staff vehicles"
    ON public.staff_vehicles FOR DELETE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.6 PARKING ALERT TYPES (Consolidated to avoid multiple permissive SELECT policies)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view active alert types in org" ON public.parking_alert_types;
DROP POLICY IF EXISTS "Admins can manage alert types" ON public.parking_alert_types;
DROP POLICY IF EXISTS "Users view active or admins view all alert types" ON public.parking_alert_types;
DROP POLICY IF EXISTS "Admins can insert alert types" ON public.parking_alert_types;
DROP POLICY IF EXISTS "Admins can update alert types" ON public.parking_alert_types;
DROP POLICY IF EXISTS "Admins can delete alert types" ON public.parking_alert_types;

CREATE POLICY "Users view active or admins view all alert types"
    ON public.parking_alert_types FOR SELECT
    USING (
        organization_id = (SELECT public.current_user_org_id())
        AND (is_active = TRUE OR (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admins can insert alert types"
    ON public.parking_alert_types FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update alert types"
    ON public.parking_alert_types FOR UPDATE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can delete alert types"
    ON public.parking_alert_types FOR DELETE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.7 PARKING ALERTS (InitPlan optimization on auth.uid() and current_user_org_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view alerts involving them or admins can view all" ON public.parking_alerts;
DROP POLICY IF EXISTS "Users can create parking alerts in org" ON public.parking_alerts;
DROP POLICY IF EXISTS "Alert participants or admins can update status" ON public.parking_alerts;

CREATE POLICY "Users can view alerts involving them or admins can view all"
    ON public.parking_alerts FOR SELECT
    USING (
        organization_id = (SELECT public.current_user_org_id()) AND (
            owner_id = (SELECT auth.uid()) OR
            reporter_id = (SELECT auth.uid()) OR
            (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create parking alerts in org"
    ON public.parking_alerts FOR INSERT
    WITH CHECK (
        organization_id = (SELECT public.current_user_org_id()) AND
        reporter_id = (SELECT auth.uid())
    );

CREATE POLICY "Alert participants or admins can update status"
    ON public.parking_alerts FOR UPDATE
    USING (
        organization_id = (SELECT public.current_user_org_id()) AND (
            owner_id = (SELECT auth.uid()) OR
            reporter_id = (SELECT auth.uid()) OR
            (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin')
        )
    );

-- ----------------------------------------------------------------------------
-- 3.8 VEHICLE SEARCH EVENTS (InitPlan optimization)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can log their search events" ON public.vehicle_search_events;
DROP POLICY IF EXISTS "Admins and Security can view search events" ON public.vehicle_search_events;

CREATE POLICY "Users can log their search events"
    ON public.vehicle_search_events FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins and Security can view search events"
    ON public.vehicle_search_events FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.9 UNKNOWN VEHICLE REPORTS (InitPlan optimization)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can report unknown vehicles" ON public.unknown_vehicle_reports;
DROP POLICY IF EXISTS "Users can view unknown vehicle reports in org" ON public.unknown_vehicle_reports;
DROP POLICY IF EXISTS "Admins and Security can update unknown vehicle reports" ON public.unknown_vehicle_reports;

CREATE POLICY "Users can report unknown vehicles"
    ON public.unknown_vehicle_reports FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Users can view unknown vehicle reports in org"
    ON public.unknown_vehicle_reports FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins and Security can update unknown vehicle reports"
    ON public.unknown_vehicle_reports FOR UPDATE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('security', 'admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.10 CONTACT ACTION EVENTS (InitPlan optimization)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can log contact actions" ON public.contact_action_events;
DROP POLICY IF EXISTS "Admins can view contact actions" ON public.contact_action_events;

CREATE POLICY "Users can log contact actions"
    ON public.contact_action_events FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins can view contact actions"
    ON public.contact_action_events FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.11 IMPORT JOBS (InitPlan optimization)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view and create import jobs" ON public.import_jobs;
DROP POLICY IF EXISTS "Admins can manage import jobs" ON public.import_jobs;

CREATE POLICY "Admins can manage import jobs"
    ON public.import_jobs FOR ALL
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3.12 AUDIT LOGS (InitPlan optimization)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Server and admins can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Server and admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()));

-- ----------------------------------------------------------------------------
-- 3.13 SYSTEM SETTINGS (InitPlan optimization)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;

CREATE POLICY "Users can view org system settings"
    ON public.system_settings FOR SELECT
    USING (organization_id = (SELECT public.current_user_org_id()));

CREATE POLICY "Admins can insert system settings"
    ON public.system_settings FOR INSERT
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update system settings"
    ON public.system_settings FOR UPDATE
    USING (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'))
    WITH CHECK (organization_id = (SELECT public.current_user_org_id()) AND (SELECT public.current_user_role()) IN ('admin', 'super_admin'));

-- ============================================================================
-- 4. REALTIME PUBLICATION REPLICATION
-- ============================================================================
-- Ensure parking_alerts broadcasts INSERT and UPDATE events over Supabase Realtime WebSockets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'parking_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_alerts;
    END IF;
END $$;

