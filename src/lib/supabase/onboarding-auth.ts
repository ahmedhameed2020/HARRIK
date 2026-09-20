import { createClient } from "./server";
import type { Profile } from "@/types";

/**
 * Session resolver for the onboarding (tenant provisioning) flow.
 *
 * Unlike getAuthenticatedSession(), this intentionally ALLOWS organizations that
 * are still in `onboarding` status so a freshly-registered tenant admin can
 * complete setup. It still strictly requires an authenticated, active profile
 * with an admin-level role.
 */
export async function getOnboardingSession(): Promise<{
  session: {
    userId: string;
    profile: Profile;
    organizationId: string;
    role: string;
    organizationStatus: string;
  } | null;
  error: string | null;
  status: number;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { session: null, error: "Unauthorized: Authentication required", status: 401 };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, organization:organizations(id, status, name_ar, name_en, entity_type, onboarding_status)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { session: null, error: "Unauthorized: Profile not found", status: 401 };
    }

    if (!profile.is_active) {
      return { session: null, error: "Forbidden: Account is deactivated", status: 403 };
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return { session: null, error: "Forbidden: Admin privileges required", status: 403 };
    }

    const orgStatus = (profile.organization as any)?.status || "active";
    if (orgStatus !== "onboarding" && orgStatus !== "active") {
      return {
        session: null,
        error: `Forbidden: Tenant organization is ${orgStatus}.`,
        status: 403,
      };
    }

    return {
      session: {
        userId: user.id,
        profile: profile as Profile,
        organizationId: profile.organization_id,
        role: profile.role,
        organizationStatus: orgStatus,
      },
      error: null,
      status: 200,
    };
  } catch (err: any) {
    return { session: null, error: err.message || "Internal server error", status: 500 };
  }
}
