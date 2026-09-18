import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Login page handling
  if (pathname === "/login") {
    if (user) {
      // Check if user is active
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .single();

      if (profile && profile.is_active) {
        const redirectUrl = request.nextUrl.searchParams.get("redirectTo") || "/";
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, organization_id")
      .eq("id", user.id)
      .single();

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

  // Verify profile and role for page access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
