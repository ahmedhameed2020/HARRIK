-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 02: Functions, RPCs & Row Level Security
-- ============================================================================

-- 1. PLATE NUMBER NORMALIZATION FUNCTION
CREATE OR REPLACE FUNCTION normalize_plate_number(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN '';
    END IF;

    -- Trim whitespace
    cleaned := TRIM(input_text);

    -- Convert Eastern Arabic-Indic digits (٠-٩) to Western (0-9)
    cleaned := TRANSLATE(cleaned, '٠١٢٣٤٥٦٧٨٩', '0123456789');

    -- Convert Persian / Urdu digits (۰-۹) to Western (0-9)
    cleaned := TRANSLATE(cleaned, '۰۱۲۳۴۵۶۷۸۹', '0123456789');

    -- Remove common separators: spaces, hyphens, dashes, slashes, underscores, dots
    cleaned := REGEXP_REPLACE(cleaned, '[\s\-_/\.]+', '', 'g');

    -- Convert uppercase for Latin characters if present
    cleaned := UPPER(cleaned);

    RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Trigger to auto-normalize plate on insert or update
CREATE OR REPLACE FUNCTION trg_vehicles_normalize_plate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_plate := normalize_plate_number(NEW.plate_number);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicles_normalize ON vehicles;
CREATE TRIGGER trg_vehicles_normalize
    BEFORE INSERT OR UPDATE OF plate_number ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION trg_vehicles_normalize_plate();

-- Trigger for unknown vehicle report normalization
CREATE OR REPLACE FUNCTION trg_unknown_vehicle_normalize()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_plate := normalize_plate_number(NEW.plate_number);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unknown_normalize ON unknown_vehicle_reports;
CREATE TRIGGER trg_unknown_normalize
    BEFORE INSERT OR UPDATE OF plate_number ON unknown_vehicle_reports
    FOR EACH ROW
    EXECUTE FUNCTION trg_unknown_vehicle_normalize();

-- 2. HELPER FUNCTIONS FOR AUTH & RLS
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. ROW LEVEL SECURITY (RLS) ENABLEMENT
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_alert_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unknown_vehicle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_action_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Organizations
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = current_user_org_id());

CREATE POLICY "Super admins can update organization"
    ON organizations FOR UPDATE
    USING (id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Departments
CREATE POLICY "Users can view departments in own org"
    ON departments FOR SELECT
    USING (organization_id = current_user_org_id());

CREATE POLICY "Admins can manage departments"
    ON departments FOR ALL
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Profiles
CREATE POLICY "Users can view profiles in own org"
    ON profiles FOR SELECT
    USING (organization_id = current_user_org_id());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles in org"
    ON profiles FOR ALL
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Vehicles
CREATE POLICY "Users can view vehicles in own org"
    ON vehicles FOR SELECT
    USING (organization_id = current_user_org_id());

CREATE POLICY "Admins and Security can manage vehicles"
    ON vehicles FOR ALL
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Staff Vehicles
CREATE POLICY "Users can view staff vehicles in own org"
    ON staff_vehicles FOR SELECT
    USING (organization_id = current_user_org_id());

CREATE POLICY "Admins can manage staff vehicles"
    ON staff_vehicles FOR ALL
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Parking Alert Types
CREATE POLICY "Users can view active alert types in org"
    ON parking_alert_types FOR SELECT
    USING (organization_id = current_user_org_id() AND is_active = TRUE);

CREATE POLICY "Admins can manage alert types"
    ON parking_alert_types FOR ALL
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Parking Alerts
CREATE POLICY "Users can view alerts involving them or admins can view all"
    ON parking_alerts FOR SELECT
    USING (
        organization_id = current_user_org_id() AND (
            owner_id = auth.uid() OR
            reporter_id = auth.uid() OR
            current_user_role() IN ('security', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create parking alerts in org"
    ON parking_alerts FOR INSERT
    WITH CHECK (
        organization_id = current_user_org_id() AND
        reporter_id = auth.uid()
    );

CREATE POLICY "Alert participants or admins can update status"
    ON parking_alerts FOR UPDATE
    USING (
        organization_id = current_user_org_id() AND (
            owner_id = auth.uid() OR
            reporter_id = auth.uid() OR
            current_user_role() IN ('security', 'admin', 'super_admin')
        )
    );

-- Vehicle Search Events
CREATE POLICY "Users can log their search events"
    ON vehicle_search_events FOR INSERT
    WITH CHECK (organization_id = current_user_org_id());

CREATE POLICY "Admins and Security can view search events"
    ON vehicle_search_events FOR SELECT
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('security', 'admin', 'super_admin'));

-- Unknown Vehicle Reports
CREATE POLICY "Users can report unknown vehicles"
    ON unknown_vehicle_reports FOR INSERT
    WITH CHECK (organization_id = current_user_org_id());

CREATE POLICY "Users can view unknown vehicle reports in org"
    ON unknown_vehicle_reports FOR SELECT
    USING (organization_id = current_user_org_id());

CREATE POLICY "Admins and Security can update unknown vehicle reports"
    ON unknown_vehicle_reports FOR UPDATE
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('security', 'admin', 'super_admin'));

-- Contact Action Events
CREATE POLICY "Users can log contact actions"
    ON contact_action_events FOR INSERT
    WITH CHECK (organization_id = current_user_org_id());

CREATE POLICY "Admins can view contact actions"
    ON contact_action_events FOR SELECT
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Import Jobs
CREATE POLICY "Admins can view and create import jobs"
    ON import_jobs FOR ALL
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

-- Audit Logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Server and admins can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (organization_id = current_user_org_id());

-- System Settings
CREATE POLICY "Users can view org system settings"
    ON system_settings FOR SELECT
    USING (organization_id = current_user_org_id());

CREATE POLICY "Admins can update system settings"
    ON system_settings FOR UPDATE
    USING (organization_id = current_user_org_id() AND current_user_role() IN ('admin', 'super_admin'));


-- 5. SECURE PLATE SEARCH RPC: find_vehicle_by_plate
CREATE OR REPLACE FUNCTION find_vehicle_by_plate(
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

    v_org_id := current_user_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not associated with an organization';
    END IF;

    -- Normalize user input
    v_norm_query := normalize_plate_number(p_query);
    IF LENGTH(v_norm_query) = 0 THEN
        RETURN;
    END IF;

    -- Fetch organization settings
    SELECT
        COALESCE(min_partial_digits, 3),
        COALESCE(partial_search_enabled, TRUE),
        COALESCE(privacy_mode, 'mode_a')
    INTO v_min_digits, v_partial_enabled, v_privacy_mode
    FROM system_settings
    WHERE organization_id = v_org_id;

    -- 1. Try Exact Match
    IF EXISTS (
        SELECT 1 FROM vehicles v
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
        FROM vehicles v
        LEFT JOIN staff_vehicles sv ON sv.vehicle_id = v.id AND sv.organization_id = v_org_id
        LEFT JOIN profiles p ON p.id = sv.staff_id AND p.organization_id = v_org_id
        LEFT JOIN departments d ON d.id = p.department_id AND d.organization_id = v_org_id
        WHERE v.organization_id = v_org_id
          AND v.normalized_plate = v_norm_query
          AND v.is_active = TRUE;

        -- Record search event
        GET DIAGNOSTICS v_count = ROW_COUNT;
        INSERT INTO vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count)
        VALUES (v_org_id, auth.uid(), v_norm_query, 'exact', v_count);
        RETURN;
    END IF;

    -- 2. Try Partial Suffix Match if enabled and meets minimum length
    IF v_partial_enabled AND LENGTH(v_norm_query) >= v_min_digits THEN
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
        FROM vehicles v
        LEFT JOIN staff_vehicles sv ON sv.vehicle_id = v.id AND sv.organization_id = v_org_id
        LEFT JOIN profiles p ON p.id = sv.staff_id AND p.organization_id = v_org_id
        LEFT JOIN departments d ON d.id = p.department_id AND d.organization_id = v_org_id
        WHERE v.organization_id = v_org_id
          AND v.normalized_plate LIKE ('%' || v_norm_query)
          AND v.is_active = TRUE;

        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            INSERT INTO vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count)
            VALUES (v_org_id, auth.uid(), v_norm_query, 'partial', v_count);
            RETURN;
        END IF;
    END IF;

    -- 3. No match found
    INSERT INTO vehicle_search_events (organization_id, searched_by, normalized_query, match_type, result_count)
    VALUES (v_org_id, auth.uid(), v_norm_query, 'none', 0);
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. DASHBOARD OVERVIEW RPC: get_dashboard_overview
CREATE OR REPLACE FUNCTION get_dashboard_overview(
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
    v_org_id := current_user_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Missing organization context';
    END IF;

    -- Registered Staff
    SELECT COUNT(*) INTO v_staff_count
    FROM profiles WHERE organization_id = v_org_id AND is_active = TRUE;

    -- Registered Vehicles
    SELECT COUNT(*) INTO v_vehicles_count
    FROM vehicles WHERE organization_id = v_org_id AND is_active = TRUE;

    -- Staff with vehicles
    SELECT COUNT(DISTINCT staff_id) INTO v_staff_with_vehicles
    FROM staff_vehicles sv
    JOIN vehicles v ON v.id = sv.vehicle_id AND v.is_active = TRUE
    JOIN profiles p ON p.id = sv.staff_id AND p.is_active = TRUE
    WHERE sv.organization_id = v_org_id;

    -- Searches in range
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE match_type IN ('exact', 'partial')),
        COUNT(*) FILTER (WHERE match_type = 'none')
    INTO v_searches_count, v_successful_searches, v_no_match_searches
    FROM vehicle_search_events
    WHERE organization_id = v_org_id AND created_at >= p_range_start AND created_at <= p_range_end;

    -- Alerts in range
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'acknowledged'),
        COUNT(*) FILTER (WHERE status = 'resolved'),
        COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_alerts_created, v_pending_alerts, v_acknowledged_alerts, v_resolved_alerts, v_cancelled_alerts
    FROM parking_alerts
    WHERE organization_id = v_org_id AND created_at >= p_range_start AND created_at <= p_range_end;

    -- Open unknown vehicles
    SELECT COUNT(*) INTO v_open_unknown_vehicles
    FROM unknown_vehicle_reports WHERE organization_id = v_org_id AND status = 'open';

    -- Average acknowledgement time (seconds)
    SELECT AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at)))
    INTO v_avg_ack_seconds
    FROM parking_alerts
    WHERE organization_id = v_org_id
      AND created_at >= p_range_start AND created_at <= p_range_end
      AND acknowledged_at IS NOT NULL
      AND acknowledged_at >= created_at;

    -- Average resolution time (seconds)
    SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))
    INTO v_avg_res_seconds
    FROM parking_alerts
    WHERE organization_id = v_org_id
      AND created_at >= p_range_start AND created_at <= p_range_end
      AND status = 'resolved'
      AND resolved_at IS NOT NULL
      AND resolved_at >= created_at;

    -- Resolved within 5 minutes rate
    SELECT
        CASE
            WHEN COUNT(*) = 0 THEN NULL
            ELSE (COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (resolved_at - created_at)) <= 300)::NUMERIC / COUNT(*)::NUMERIC) * 100
        END
    INTO v_resolved_within_5m_rate
    FROM parking_alerts
    WHERE organization_id = v_org_id
      AND created_at >= p_range_start AND created_at <= p_range_end
      AND status = 'resolved'
      AND resolved_at IS NOT NULL;

    -- Oldest active incident
    SELECT
        id,
        status,
        created_at,
        EXTRACT(EPOCH FROM (NOW() - created_at))
    INTO v_oldest_alert_id, v_oldest_status, v_oldest_created, v_oldest_active_seconds
    FROM parking_alerts
    WHERE organization_id = v_org_id AND status IN ('pending', 'acknowledged')
    ORDER BY created_at ASC
    LIMIT 1;

    -- Fetch oldest plate
    IF v_oldest_alert_id IS NOT NULL THEN
        SELECT v.plate_number INTO v_oldest_plate
        FROM parking_alerts pa
        JOIN vehicles v ON v.id = pa.vehicle_id
        WHERE pa.id = v_oldest_alert_id;
    END IF;

    -- Build structured response
    v_res := jsonb_build_object(
        'schemaVersion', 1,
        'organizationId', v_org_id,
        'timezone', p_timezone,
        'metrics', jsonb_build_object(
            'registeredStaff', jsonb_build_object('key', 'registered_staff', 'value', v_staff_count, 'unit', 'count', 'status', 'ok'),
            'registeredVehicles', jsonb_build_object('key', 'registered_vehicles', 'value', v_vehicles_count, 'unit', 'count', 'status', 'ok'),
            'vehicleCoverage', jsonb_build_object(
                'key', 'vehicle_coverage',
                'value', CASE WHEN v_staff_count > 0 THEN ROUND((v_staff_with_vehicles::NUMERIC / v_staff_count::NUMERIC) * 100, 1) ELSE NULL END,
                'unit', 'percentage',
                'status', CASE WHEN v_staff_count > 0 THEN 'ok' ELSE 'empty' END
            ),
            'searches', jsonb_build_object('key', 'searches', 'value', v_searches_count, 'unit', 'count', 'status', 'ok'),
            'successfulSearches', jsonb_build_object('key', 'successful_searches', 'value', v_successful_searches, 'unit', 'count', 'status', 'ok'),
            'searchSuccessRate', jsonb_build_object(
                'key', 'search_success_rate',
                'value', CASE WHEN v_searches_count > 0 THEN ROUND((v_successful_searches::NUMERIC / v_searches_count::NUMERIC) * 100, 1) ELSE NULL END,
                'unit', 'percentage',
                'status', CASE WHEN v_searches_count > 0 THEN 'ok' ELSE 'empty' END
            ),
            'alertsCreated', jsonb_build_object('key', 'alerts_created', 'value', v_alerts_created, 'unit', 'count', 'status', 'ok'),
            'activeIncidents', jsonb_build_object('key', 'active_incidents', 'value', (v_pending_alerts + v_acknowledged_alerts), 'unit', 'count', 'status', 'ok'),
            'pendingAlerts', jsonb_build_object('key', 'pending_alerts', 'value', v_pending_alerts, 'unit', 'count', 'status', 'ok'),
            'acknowledgedAlerts', jsonb_build_object('key', 'acknowledged_alerts', 'value', v_acknowledged_alerts, 'unit', 'count', 'status', 'ok'),
            'resolvedAlerts', jsonb_build_object('key', 'resolved_alerts', 'value', v_resolved_alerts, 'unit', 'count', 'status', 'ok'),
            'resolutionRate', jsonb_build_object(
                'key', 'resolution_rate',
                'value', CASE WHEN (v_alerts_created - v_cancelled_alerts) > 0 THEN ROUND((v_resolved_alerts::NUMERIC / (v_alerts_created - v_cancelled_alerts)::NUMERIC) * 100, 1) ELSE NULL END,
                'unit', 'percentage',
                'status', CASE WHEN (v_alerts_created - v_cancelled_alerts) > 0 THEN 'ok' ELSE 'empty' END
            ),
            'averageAcknowledgementTime', jsonb_build_object('key', 'avg_ack_time', 'value', ROUND(COALESCE(v_avg_ack_seconds, 0)), 'unit', 'seconds', 'status', CASE WHEN v_avg_ack_seconds IS NOT NULL THEN 'ok' ELSE 'empty' END),
            'averageResolutionTime', jsonb_build_object('key', 'avg_res_time', 'value', ROUND(COALESCE(v_avg_res_seconds, 0)), 'unit', 'seconds', 'status', CASE WHEN v_avg_res_seconds IS NOT NULL THEN 'ok' ELSE 'empty' END),
            'resolvedWithinFiveMinutes', jsonb_build_object('key', 'resolved_within_5m', 'value', ROUND(COALESCE(v_resolved_within_5m_rate, 0), 1), 'unit', 'percentage', 'status', CASE WHEN v_resolved_within_5m_rate IS NOT NULL THEN 'ok' ELSE 'empty' END),
            'openUnknownVehicles', jsonb_build_object('key', 'open_unknown', 'value', v_open_unknown_vehicles, 'unit', 'count', 'status', 'ok')
        ),
        'currentIssues', jsonb_build_object(
            'pending', v_pending_alerts,
            'acknowledged', v_acknowledged_alerts,
            'activeTotal', (v_pending_alerts + v_acknowledged_alerts),
            'openUnknownVehicles', v_open_unknown_vehicles,
            'oldestActiveIncident', CASE
                WHEN v_oldest_alert_id IS NOT NULL THEN jsonb_build_object(
                    'alertId', v_oldest_alert_id,
                    'plateDisplay', v_oldest_plate,
                    'createdAt', v_oldest_created,
                    'ageSeconds', ROUND(v_oldest_active_seconds),
                    'status', v_oldest_status
                )
                ELSE NULL
            END
        )
    );

    RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 7. FUNCTION PRIVILEGES & SECURITY HARDENING
-- ============================================================================
-- Revoke public execution on security definer functions to prevent unauthenticated access
REVOKE EXECUTE ON FUNCTION find_vehicle_by_plate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_vehicle_by_plate(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_dashboard_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION current_user_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_org_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

