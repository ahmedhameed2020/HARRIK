import { readPublicSupabaseEnv } from "./env";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // ~400 days (sign in once)

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    readPublicSupabaseEnv().url,
    readPublicSupabaseEnv().anonKey,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        maxAge: MAX_AGE_SECONDS,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled when called from server component
          }
        },
      },
    }
  );
}
