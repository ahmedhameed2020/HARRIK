import { createBrowserClient } from "@supabase/ssr";

/**
 * Long-lived, secure session cookies so the user only signs in once and stays
 * signed in across app reopens (PWA). Biometric unlock is layered on top.
 */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // ~400 days

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
        maxAge: MAX_AGE_SECONDS,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
