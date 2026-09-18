-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 06: Platform Control Plane Foundation
-- ============================================================================
-- 1. Fundamental Role Separation: Platform Owner/Admin vs Tenant Admin/Staff
-- 2. Organizations Lifecycle: status (onboarding, active, suspended, archived),
--    entity_type (default 'other'), onboarding_status (default 'organization_created')
-- 3. Dedicated Platform Tables: platform_admins, platform_audit_logs
-- 4. Double-Layer Suspension Enforcement: current_user_org_id() checks o.status = 'active'
-- 5. Least Privilege: Zero Platform Owner bypass on tenant operational tables
-- 6. Zero-PII Platform Aggregates: get_platform_organizations_overview()
-- ============================================================================

-- 1. ENHANCE ORGANIZATIONS TABLE
ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'onboarding' 
        CHECK (status IN ('onboarding', 'active', 'suspended', 'archived')),
    ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'other' 
        CHECK (entity_type IN ('educational', 'commercial_tower', 'residential_complex', 'corporate', 'government', 'healthcare', 'mall', 'other')),
    ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'organization_created' 
        CHECK (onboarding_status IN ('organization_created', 'admin_assigned', 'settings_configured', 'units_configured', 'members_imported', 'ready'));

-- Safely backfill any pre-existing active organization
UPDATE public.organizations
SET status = 'active',
    onboarding_status = 'ready'
WHERE status IS NULL OR status = 'onboarding';

-- Create index on organization status
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- 2. PLATFORM ADMINS TABLE (Platform Authority independent of Tenant Profiles)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'platform_admin', 'platform_support')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_platform_admin_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user_active 
    ON public.platform_admins(user_id) WHERE is_active = TRUE;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Deny direct public/anon access
REVOKE ALL ON public.platform_admins FROM PUBLIC, anon;
GRANT SELECT ON public.platform_admins TO authenticated;

-- 3. PLATFORM AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    change_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action_created 
    ON public.platform_audit_logs(action, created_at DESC);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_audit_logs FROM PUBLIC, anon;
GRANT SELECT ON public.platform_audit_logs TO authenticated;

-- 4. PLATFORM AUTHORIZATION FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
      AND is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'platform_admin')
      AND is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Policies for platform tables
CREATE POLICY "platform_admins_select_own_or_admin"
    ON public.platform_admins FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_platform_admin()));

CREATE POLICY "platform_audit_logs_select_admin"
    ON public.platform_audit_logs FOR SELECT
    TO authenticated
    USING ((SELECT public.is_platform_admin()));

-- 5. REINFORCE TENANT ACCESS & SUSPENSION ENFORCEMENT
-- If organization is suspended or archived, current_user_org_id() returns NULL immediately.
-- All tenant RLS policies filter on organization_id = current_user_org_id(), locking out suspended tenant.
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.organization_id 
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = (SELECT auth.uid())
    AND p.is_active = TRUE
    AND o.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role 
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = (SELECT auth.uid())
    AND p.is_active = TRUE
    AND o.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role();
$$;

REVOKE ALL ON FUNCTION public.current_user_tenant_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_tenant_role() TO authenticated;

-- Ensure users can always view their own profile (e.g. for self-inspection / status verification)
-- while active members can view peer profiles in their active organization
DROP POLICY IF EXISTS "Users can view profiles in own org" ON public.profiles;
CREATE POLICY "Users can view profiles in own org"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = (SELECT auth.uid())
        OR
        organization_id = (SELECT public.current_user_org_id())
    );

-- 6. TRUSTED PLATFORM MUTATION FUNCTIONS

-- Assign or update platform admin role (Restricted strictly to Platform Owner)
CREATE OR REPLACE FUNCTION public.assign_platform_admin(
    p_user_id UUID,
    p_role TEXT DEFAULT 'platform_admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_new_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL OR NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Unauthorized: Only Platform Owner can assign platform admins' USING ERRCODE = '42501';
    END IF;

    IF p_role NOT IN ('owner', 'platform_admin', 'platform_support') THEN
        RAISE EXCEPTION 'Invalid platform role: %', p_role USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.platform_admins (user_id, role, is_active, updated_at)
    VALUES (p_user_id, p_role, TRUE, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_active = TRUE,
        updated_at = NOW()
    RETURNING id INTO v_new_id;

    INSERT INTO public.platform_audit_logs (action, actor_id, entity_type, entity_id, change_summary)
    VALUES (
        'platform.admin.assigned',
        v_actor_id,
        'platform_admin',
        v_new_id,
        jsonb_build_object('target_user_id', p_user_id, 'assigned_role', p_role)
    );

    RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_platform_admin(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_platform_admin(UUID, TEXT) TO authenticated;

-- Revoke platform admin role (Restricted strictly to Platform Owner)
CREATE OR REPLACE FUNCTION public.revoke_platform_admin(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_admin_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL OR NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Unauthorized: Only Platform Owner can revoke platform admins' USING ERRCODE = '42501';
    END IF;

    IF p_user_id = v_actor_id THEN
        RAISE EXCEPTION 'Platform Owner cannot revoke their own platform role' USING ERRCODE = '22023';
    END IF;

    UPDATE public.platform_admins
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO v_admin_id;

    IF v_admin_id IS NULL THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.platform_audit_logs (action, actor_id, entity_type, entity_id, change_summary)
    VALUES (
        'platform.admin.revoked',
        v_actor_id,
        'platform_admin',
        v_admin_id,
        jsonb_build_object('target_user_id', p_user_id)
    );

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_platform_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_platform_admin(UUID) TO authenticated;

-- Suspend or update organization lifecycle status (Restricted strictly to Platform Admin)
CREATE OR REPLACE FUNCTION public.set_organization_status(
    p_organization_id UUID,
    p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_old_status TEXT;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL OR NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only Platform Admin can modify organization status' USING ERRCODE = '42501';
    END IF;

    IF p_status NOT IN ('onboarding', 'active', 'suspended', 'archived') THEN
        RAISE EXCEPTION 'Invalid organization status: %', p_status USING ERRCODE = '22023';
    END IF;

    SELECT status INTO v_old_status FROM public.organizations WHERE id = p_organization_id;
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Organization not found' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.organizations
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_organization_id;

    INSERT INTO public.platform_audit_logs (action, actor_id, entity_type, entity_id, change_summary)
    VALUES (
        'platform.organization.status_changed',
        v_actor_id,
        'organization',
        p_organization_id,
        jsonb_build_object('old_status', v_old_status, 'new_status', p_status)
    );

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organization_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_organization_status(UUID, TEXT) TO authenticated;

-- 7. ZERO-PII AGGREGATE PLATFORM RPC
-- Returns aggregate metrics for platform management ONLY.
-- Exposes ZERO member names, mobile numbers, plates, visitor PII, or tenant audit logs.
CREATE OR REPLACE FUNCTION public.get_platform_organizations_overview()
RETURNS TABLE (
    organization_id UUID,
    name_en TEXT,
    name_ar TEXT,
    entity_type TEXT,
    status TEXT,
    onboarding_status TEXT,
    member_count BIGINT,
    vehicle_count BIGINT,
    active_alert_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Platform Admin privilege required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        o.id AS organization_id,
        o.name_en,
        o.name_ar,
        o.entity_type,
        o.status,
        o.onboarding_status,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = TRUE) AS member_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.permit_status = 'active') AS vehicle_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'active') AS active_alert_count,
        o.created_at
    FROM public.organizations o
    LEFT JOIN public.profiles p ON p.organization_id = o.id
    LEFT JOIN public.vehicles v ON v.organization_id = o.id
    LEFT JOIN public.parking_alerts a ON a.organization_id = o.id
    GROUP BY o.id, o.name_en, o.name_ar, o.entity_type, o.status, o.onboarding_status, o.created_at
    ORDER BY o.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_organizations_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_organizations_overview() TO authenticated;
