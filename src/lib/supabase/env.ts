/**
 * حَرِّك | HARRIK — Supabase configuration, read once and honestly.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every Supabase client used to fall back to a literal placeholder when its
 * environment variable was missing:
 *
 *     process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
 *
 * Supabase answers a placeholder with `Invalid API key`. So a *missing* secret
 * produced an error that reads like a *wrong* one, and the registration screen
 * showed "Invalid API key" to an administrator while the real problem was that
 * nothing had been configured at all. That error sends you hunting through the
 * Supabase dashboard for a key that was never the problem.
 *
 * The helpers below keep the placeholders — a build, a unit test and a local
 * `next dev` must all still run without credentials — but they mark the value
 * as unconfigured, so the server can say which variable is missing instead of
 * letting Supabase reject a fake key.
 *
 * DEPLOYMENT NOTE (Cloudflare Workers)
 * ------------------------------------
 * Build-time and runtime variables are separate on Workers, and Cloudflare's
 * own documentation is explicit: "Build variables will not be accessible at
 * runtime", and "unlike Pages, Workers does not share the same set of runtime
 * and build-time variables."
 *
 * That matters here because `NEXT_PUBLIC_*` values are inlined into the browser
 * bundle by `next build`. A value that exists only as a Worker secret or only
 * in `wrangler.jsonc` `vars` is a RUNTIME value: the build never sees it, and
 * the browser bundle ships the placeholder. Anything `NEXT_PUBLIC_` therefore
 * has to be set in **both** places — Workers Builds → Build variables, and the
 * Worker's runtime variables — while `SUPABASE_SERVICE_ROLE_KEY` is
 * server-only and belongs solely in the runtime secrets.
 */

export const PLACEHOLDER_URL = "https://placeholder-project.supabase.co";
export const PLACEHOLDER_ANON_KEY = "placeholder-anon-key";

export interface SupabaseEnv {
  url: string;
  anonKey: string;
  /** Names of the variables that are missing; empty when fully configured. */
  missing: string[];
}

/** The public pair, used by the browser, the server components and middleware. */
export function readPublicSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing: string[] = [];

  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  // A build that ran without the variable bakes the placeholder into the
  // bundle, so the literal counts as missing too — otherwise the check passes
  // while every request still carries a fake key.
  if (!anonKey || anonKey === PLACEHOLDER_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return {
    url: url || PLACEHOLDER_URL,
    anonKey: anonKey || PLACEHOLDER_ANON_KEY,
    missing,
  };
}

/**
 * The service-role pair, for server-side work that must bypass RLS.
 *
 * Throws rather than falling back: an admin client silently downgraded to the
 * anon key does not fail — it succeeds at the wrong privilege level, or fails
 * much later with an error that describes neither cause.
 */
export function readServiceRoleSupabaseEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new SupabaseConfigError(missing);
  }

  return { url: url as string, serviceRoleKey: serviceRoleKey as string };
}

/** Carries the missing variable names so a route can report them precisely. */
export class SupabaseConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Supabase is not configured on this deployment: ${missing.join(", ")} ` +
        `${missing.length === 1 ? "is" : "are"} missing. ` +
        `Set the runtime values on the Worker (Settings → Variables & Secrets); ` +
        `NEXT_PUBLIC_* values must ALSO be set as Workers Builds build variables, ` +
        `because next build inlines them into the browser bundle.`
    );
    this.name = "SupabaseConfigError";
    this.missing = missing;
  }
}

/** The Arabic sentence shown to an administrator when configuration is missing. */
export function configErrorMessageAr(missing: string[]): string {
  return `إعدادات الاتصال بقاعدة البيانات غير مكتملة على هذا النشر (${missing.join("، ")}). يرجى ضبط المتغيّرات في إعدادات Worker ثم إعادة المحاولة.`;
}
