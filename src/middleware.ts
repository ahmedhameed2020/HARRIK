import { createServerClient } from "@supabase/ssr";
import { readPublicSupabaseEnv } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Falls back to placeholders so a build, a test and a local `next dev`
  // without credentials still run; see lib/supabase/env.ts for why the
  // placeholder is tracked rather than silently used.
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = readPublicSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      maxAge: 400 * 24 * 60 * 60, // ~400 days — sign in once
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  // Static assets, public scan, and auth check exclusion
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/me") ||
    pathname.startsWith("/api/scan/") ||
    pathname === "/scan" ||
    pathname.startsWith("/scan/") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/register" ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/api/observability/") ||
    pathname.startsWith("/api/alerts/escalate") ||
    pathname.startsWith("/api/retention/purge") ||
    // Must answer without a session: it exists to diagnose the case where
    // sign-in itself is broken by missing configuration.
    pathname.startsWith("/api/health/") ||
    pathname.startsWith("/api/reports/email") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Login page handling
  if (pathname === "/login") {
    if (user) {
      // 1. Check tenant profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.is_active) {
        const redirectUrl = request.nextUrl.searchParams.get("redirectTo") || "/";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }

      // 2. Check platform admin
      const { data: platformAdmin } = await supabase
        .from("platform_admins")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (platformAdmin && platformAdmin.is_active) {
        const redirectUrl = request.nextUrl.searchParams.get("redirectTo") || "/platform";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return response;
  }

  // API Route Protection
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    // Platform APIs (/api/platform/*) validate platform session independently
    if (pathname.startsWith("/api/platform/")) {
      return response;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Account is deactivated" },
        { status: 403 }
      );
    }

    if (pathname.startsWith("/api/admin/")) {
      if (profile.role !== "admin" && profile.role !== "super_admin" && profile.role !== "security") {
        return NextResponse.json(
          { success: false, error: "Forbidden: Insufficient privileges" },
          { status: 403 }
        );
      }
    }

    return response;
  }

  // Page Route Protection
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirectTo", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Platform page protection (/platform)
  if (pathname.startsWith("/platform")) {
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!platformAdmin || !platformAdmin.is_active) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Tenant Page Route Protection (/, /admin, /profile, /inbox, etc.)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, organization:organizations(status)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    // If user is a platform admin trying to access tenant pages, route to /platform
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (platformAdmin && platformAdmin.is_active) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "disabled");
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection: Staff cannot access /admin
  if (pathname.startsWith("/admin")) {
    if (profile.role !== "admin" && profile.role !== "super_admin" && profile.role !== "security") {
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  // Onboarding gate: tenants still being set up are routed to the setup wizard
  const orgStatus = (profile as any)?.organization?.status;
  if (orgStatus === "onboarding" && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
