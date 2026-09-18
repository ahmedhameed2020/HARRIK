import { createClient } from "./server";
import { Profile } from "@/types";

export interface AuthenticatedSession {
  user: any;
  profile: Profile;
  organizationId: string;
  role: string;
}

export async function getAuthenticatedSession(): Promise<{
  session: AuthenticatedSession | null;
  error: string | null;
  status: number;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { session: null, error: "Unauthorized: Authentication required", status: 401 };
    }

    // Fetch verified profile and tenant organization status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, department:departments(*), organization:organizations(status, name_en, name_ar, entity_type)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { session: null, error: "Unauthorized: Profile not found", status: 401 };
    }

    if (!profile.is_active) {
      return { session: null, error: "Forbidden: Account is deactivated", status: 403 };
    }

    // Double-layer tenant lifecycle enforcement: Suspended or archived organizations cannot access API
    const orgStatus = (profile.organization as any)?.status;
    if (orgStatus && orgStatus !== "active") {
      return {
        session: null,
        error: `Forbidden: Tenant organization is ${orgStatus}. Operational access suspended.`,
        status: 403,
      };
    }

    return {
      session: {
        user,
        profile: profile as Profile,
        organizationId: profile.organization_id,
        role: profile.role,
      },
      error: null,
      status: 200,
    };
  } catch (err: any) {
    return { session: null, error: err.message || "Internal server error", status: 500 };
  }
}
