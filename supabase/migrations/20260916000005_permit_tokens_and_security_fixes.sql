-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 05: High-Entropy Permit Tokens, Rotation & Zero-Identifier Contract
-- ============================================================================

-- 1. Add permit_token, permit_status, and permit_issued_at columns to vehicles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles' 
        AND column_name = 'permit_token'
    ) THEN
        ALTER TABLE public.vehicles 
        ADD COLUMN permit_token UUID NOT NULL DEFAULT gen_random_uuid();
        
        ALTER TABLE public.vehicles 
        ADD CONSTRAINT uq_vehicles_permit_token UNIQUE (permit_token);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles' 
        AND column_name = 'permit_status'
    ) THEN
        ALTER TABLE public.vehicles 
        ADD COLUMN permit_status TEXT NOT NULL DEFAULT 'active' CHECK (permit_status IN ('active', 'revoked'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles' 
        AND column_name = 'permit_issued_at'
    ) THEN
        ALTER TABLE public.vehicles 
        ADD COLUMN permit_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicles_permit_token ON public.vehicles(permit_token);

-- 2. Add permit_token column to visitor_passes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'visitor_passes' 
        AND column_name = 'permit_token'
    ) THEN
        ALTER TABLE public.visitor_passes 
        ADD COLUMN permit_token UUID NOT NULL DEFAULT gen_random_uuid();
        
        ALTER TABLE public.visitor_passes 
        ADD CONSTRAINT uq_visitor_passes_permit_token UNIQUE (permit_token);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitor_passes_permit_token ON public.visitor_passes(permit_token);

-- 3. MINIMAL PUBLIC QR VERIFICATION RPC (ZERO INTERNAL IDENTIFIERS RETURNED)
-- Exposes ONLY: is_valid, status_reason, permit_kind, make, model, color, venue_name.
-- ZERO internal database identifiers (no vehicle_id, organization_id, profile_id).
CREATE OR REPLACE FUNCTION public.verify_permit_token(p_token UUID)
RETURNS TABLE (
    is_valid BOOLEAN,
    status_reason TEXT,
    permit_kind TEXT,
    make TEXT,
    model TEXT,
    color TEXT,
    venue_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_veh RECORD;
    v_vis RECORD;
BEGIN
    -- 1. Check registered staff vehicles
    SELECT v.make, v.model, v.color, v.is_active, v.permit_status, o.name_ar AS venue_name
    INTO v_veh
    FROM public.vehicles v
    JOIN public.organizations o ON o.id = v.organization_id
    WHERE v.permit_token = p_token;

    IF FOUND THEN
        IF NOT v_veh.is_active OR v_veh.permit_status = 'revoked' THEN
            RETURN QUERY SELECT FALSE, 'revoked', 'staff'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
            RETURN;
        END IF;

        RETURN QUERY SELECT 
            TRUE, 
            'active', 
            'staff'::TEXT, 
            v_veh.make, 
            v_veh.model, 
            v_veh.color, 
            v_veh.venue_name;
        RETURN;
    END IF;

    -- 2. Check visitor passes
    SELECT vp.vehicle_make, vp.vehicle_model, vp.vehicle_color, vp.status, vp.valid_until, o.name_ar AS venue_name
    INTO v_vis
    FROM public.visitor_passes vp
    JOIN public.organizations o ON o.id = vp.organization_id
    WHERE vp.permit_token = p_token;

    IF FOUND THEN
        IF v_vis.status = 'revoked' THEN
            RETURN QUERY SELECT FALSE, 'revoked', 'visitor'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
            RETURN;
        END IF;

        IF v_vis.status = 'expired' OR v_vis.valid_until <= NOW() THEN
            RETURN QUERY SELECT FALSE, 'expired', 'visitor'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
            RETURN;
        END IF;

        RETURN QUERY SELECT 
            TRUE, 
            'active', 
            'visitor'::TEXT, 
            v_vis.vehicle_make, 
            v_vis.vehicle_model, 
            v_vis.vehicle_color, 
            v_vis.venue_name;
        RETURN;
    END IF;

    -- 3. Not found
    RETURN QUERY SELECT FALSE, 'not_found', NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
END;
$$;

-- Configure verify_permit_token privileges:
-- PUBLIC is revoked, anon and authenticated are granted.
REVOKE ALL ON FUNCTION public.verify_permit_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_permit_token(UUID) TO anon, authenticated;

-- 4. TRUSTED SERVER-SIDE RESOLUTION (Strictly internal / authenticated only)
CREATE OR REPLACE FUNCTION public.resolve_permit_for_alert(p_token UUID)
RETURNS TABLE (
    is_valid BOOLEAN,
    status_reason TEXT,
    entity_type TEXT,
    resolved_vehicle_id UUID,
    resolved_organization_id UUID,
    resolved_owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_veh RECORD;
    v_vis RECORD;
BEGIN
    -- Check vehicles
    SELECT v.id, v.organization_id, v.is_active, v.permit_status, sv.staff_id
    INTO v_veh
    FROM public.vehicles v
    LEFT JOIN public.staff_vehicles sv ON sv.vehicle_id = v.id AND sv.organization_id = v.organization_id
    WHERE v.permit_token = p_token;

    IF FOUND THEN
        IF NOT v_veh.is_active OR v_veh.permit_status = 'revoked' THEN
            RETURN QUERY SELECT FALSE, 'revoked', 'staff'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
            RETURN;
        END IF;

        RETURN QUERY SELECT TRUE, 'active', 'staff'::TEXT, v_veh.id, v_veh.organization_id, v_veh.staff_id;
        RETURN;
    END IF;

    -- Check visitors
    SELECT vp.id, vp.organization_id, vp.status, vp.valid_until, vp.host_profile_id
    INTO v_vis
    FROM public.visitor_passes vp
    WHERE vp.permit_token = p_token;

    IF FOUND THEN
        IF v_vis.status = 'revoked' THEN
            RETURN QUERY SELECT FALSE, 'revoked', 'visitor'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
            RETURN;
        END IF;

        IF v_vis.status = 'expired' OR v_vis.valid_until <= NOW() THEN
            RETURN QUERY SELECT FALSE, 'expired', 'visitor'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
            RETURN;
        END IF;

        RETURN QUERY SELECT TRUE, 'active', 'visitor'::TEXT, v_vis.id, v_vis.organization_id, v_vis.host_profile_id;
        RETURN;
    END IF;

    RETURN QUERY SELECT FALSE, 'not_found', NULL::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
END;
$$;

-- Restricted strictly to authenticated/service callers
REVOKE ALL ON FUNCTION public.resolve_permit_for_alert(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_permit_for_alert(UUID) TO authenticated;

-- 5. STAFF PERMIT ROTATION & REVOCATION RPCs
-- Rotate permit capability: immediately invalidates old token and activates new token
CREATE OR REPLACE FUNCTION public.rotate_vehicle_permit(p_vehicle_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_org UUID;
    v_new_token UUID;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT role, organization_id INTO v_caller_role, v_caller_org
    FROM public.profiles WHERE id = v_caller_id;

    -- Verify caller owns the vehicle or is admin/security in the same organization
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_vehicles sv
        WHERE sv.vehicle_id = p_vehicle_id AND sv.staff_id = v_caller_id
    ) AND NOT (
        v_caller_role IN ('admin', 'super_admin', 'security') AND EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = p_vehicle_id AND v.organization_id = v_caller_org
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized to rotate permit for this vehicle';
    END IF;

    v_new_token := gen_random_uuid();

    UPDATE public.vehicles
    SET 
        permit_token = v_new_token,
        permit_status = 'active',
        permit_issued_at = NOW(),
        updated_at = NOW()
    WHERE id = p_vehicle_id;

    RETURN v_new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_vehicle_permit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_vehicle_permit(UUID) TO authenticated;

-- Revoke permit capability: invalidates QR without deactivating entire vehicle record
CREATE OR REPLACE FUNCTION public.revoke_vehicle_permit(p_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_org UUID;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT role, organization_id INTO v_caller_role, v_caller_org
    FROM public.profiles WHERE id = v_caller_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.staff_vehicles sv
        WHERE sv.vehicle_id = p_vehicle_id AND sv.staff_id = v_caller_id
    ) AND NOT (
        v_caller_role IN ('admin', 'super_admin', 'security') AND EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = p_vehicle_id AND v.organization_id = v_caller_org
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized to revoke permit for this vehicle';
    END IF;

    UPDATE public.vehicles
    SET 
        permit_status = 'revoked',
        updated_at = NOW()
    WHERE id = p_vehicle_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_vehicle_permit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_vehicle_permit(UUID) TO authenticated;
