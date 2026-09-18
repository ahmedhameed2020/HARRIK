import { createClient } from "./supabase/server";

export interface PlatformSession {
  user: any;
  userId: string;
  role: "owner" | "platform_admin" | "platform_support";
  isPlatformOwner: boolean;
  isPlatformAdmin: boolean;
}

export async function getPlatformSession(): Promise<{
  session: PlatformSession | null;
  error: string | null;
  status: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        session: null,
        error: "Unauthorized: Platform Authentication required",
        status: 401,
      };
    }

    // Query platform_admins table strictly — NEVER fallback to tenant profiles.role
    const { data: admin, error: adminError } = await supabase
      .from("platform_admins")
      .select("role, is_active")
      .eq("user_id", user.id)
      .single();

    if (adminError || !admin) {
      return {
        session: null,
        error: "Forbidden: Platform Administrator access required",
        status: 403,
      };
    }

    if (!admin.is_active) {
      return {
        session: null,
        error: "Forbidden: Platform Administrator account is inactive",
        status: 403,
      };
    }

    const role = admin.role as "owner" | "platform_admin" | "platform_support";
    if (!["owner", "platform_admin", "platform_support"].includes(role)) {
      return {
        session: null,
        error: "Forbidden: Platform Administrator access required",
        status: 403,
      };
    }

    const isOwner = role === "owner";
    const isAdmin = role === "owner" || role === "platform_admin";

    return {
      session: {
        user,
        userId: user.id,
        role,
        isPlatformOwner: isOwner,
        isPlatformAdmin: isAdmin,
      },
      error: null,
      status: 200,
    };
  } catch (err: any) {
    return {
      session: null,
      error: err.message || "Internal server error",
      status: 500,
    };
  }
}
