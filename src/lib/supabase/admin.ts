import { createClient } from "@supabase/supabase-js";
import { readServiceRoleSupabaseEnv } from "./env";

/**
 * Server-side client that bypasses RLS.
 *
 * Throws `SupabaseConfigError` when the service-role key is absent. It used to
 * fall back to the anon key and then to a literal "placeholder-key", which made
 * a missing secret surface as Supabase's `Invalid API key` — an error that
 * describes a wrong key, not an unset one. Worse, the anon fallback could
 * succeed at the wrong privilege level instead of failing.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = readServiceRoleSupabaseEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
