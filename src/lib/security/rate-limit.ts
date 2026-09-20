/**
 * حَرِّك | HARRIK — Shared abuse-protection helpers.
 *
 * Two independent layers:
 *  1. Durable, database-backed rate limiting (works across worker instances).
 *  2. Optional Cloudflare Turnstile bot challenge (enabled when configured).
 *
 * Both layers fail OPEN on infrastructure errors so that a legitimate emergency
 * parking action is never blocked by a protective mechanism outage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Extracts the best-available client IP from proxy headers. */
export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}

export interface RateLimitResult {
  allowed: boolean;
  /** True when the durable database check was unavailable and we failed open. */
  degraded: boolean;
}

/**
 * Claims one slot in a durable rate-limit bucket.
 *
 * @param bucket         Logical limit name, e.g. "register:ip".
 * @param token          Identity within the bucket, e.g. the client IP.
 * @param windowSeconds  Rolling window length.
 * @param maxHits        Allowed hits inside the window.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  bucket: string,
  token: string,
  windowSeconds: number,
  maxHits = 1
): Promise<RateLimitResult> {
  if (!token || token === "unknown") {
    // No reliable identity — do not block, but report degraded.
    return { allowed: true, degraded: true };
  }

  try {
    const { data, error } = await supabase.rpc("claim_rate_limit_slot", {
      p_bucket: bucket,
      p_token: token,
      p_window_seconds: windowSeconds,
      p_max_hits: maxHits,
    });

    if (error) return { allowed: true, degraded: true };
    return { allowed: data !== false, degraded: false };
  } catch {
    return { allowed: true, degraded: true };
  }
}

export interface TurnstileResult {
  ok: boolean;
  /** False when Turnstile is not configured — the challenge is then skipped. */
  configured: boolean;
}

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is configured.
 * Returns `{ ok: true, configured: false }` when the feature is disabled.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, configured: false };

  if (!token) return { ok: false, configured: true };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      // Provider outage: fail open rather than locking out real users.
      return { ok: true, configured: true };
    }

    const json: any = await res.json();
    return { ok: Boolean(json?.success), configured: true };
  } catch {
    return { ok: true, configured: true };
  }
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}
