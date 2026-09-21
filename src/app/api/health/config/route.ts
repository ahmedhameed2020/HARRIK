import { NextResponse } from "next/server";
import {
  readPublicSupabaseEnv,
  PLACEHOLDER_ANON_KEY,
  PLACEHOLDER_URL,
} from "@/lib/supabase/env";

/**
 * GET /api/health/config — is this deployment actually wired up?
 *
 * Diagnosing a misconfigured deployment used to mean reading `Invalid API key`
 * on a form and guessing which of several keys, in which of two places, was
 * wrong. This answers that in one request.
 *
 * It reports **presence only** — never a key, never a prefix, never a length.
 * A name and a boolean are enough to tell a missing variable from a wrong one,
 * and anything more would put credentials in a public response.
 *
 * On Cloudflare Workers the build and the runtime have separate variables, and
 * `NEXT_PUBLIC_*` values are inlined into the browser bundle by `next build`.
 * So a value present at runtime can still be a placeholder in the browser;
 * `publicAnonKeyInlinedAtBuild` is what distinguishes those two cases.
 */
export async function GET() {
  const publicEnv = readPublicSupabaseEnv();

  // Evaluated inside the server bundle, but Next inlines NEXT_PUBLIC_* at build
  // time in both bundles — so this reflects what the build actually saw.
  const inlinedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const inlinedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const checks = {
    supabaseUrl: Boolean(inlinedUrl) && inlinedUrl !== PLACEHOLDER_URL,
    publicAnonKeyInlinedAtBuild:
      Boolean(inlinedAnonKey) && inlinedAnonKey !== PLACEHOLDER_ANON_KEY,
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    vapidPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    vapidPublicKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    smsProvider: Boolean(process.env.SMS_PROVIDER),
    emailProvider: Boolean(process.env.EMAIL_PROVIDER),
  };

  // Without these the app cannot sign anyone in or create anything.
  const blocking = (["supabaseUrl", "publicAnonKeyInlinedAtBuild", "serviceRoleKey"] as const).filter(
    (key) => !checks[key]
  );

  return NextResponse.json(
    {
      ok: blocking.length === 0,
      blocking,
      checks,
      missingPublic: publicEnv.missing,
      hint:
        blocking.length === 0
          ? undefined
          : "Runtime values go on the Worker (Settings → Variables & Secrets). NEXT_PUBLIC_* must ALSO be set as Workers Builds build variables and the Worker rebuilt, because next build inlines them into the browser bundle.",
    },
    { status: blocking.length === 0 ? 200 : 503 }
  );
}
