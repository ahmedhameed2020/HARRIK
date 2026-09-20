import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { clientIp, isTurnstileConfigured } from "../../src/lib/security/rate-limit";
import { parsePagination, sanitizeTerm, computeHasMore } from "../../src/lib/api/query";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("HARRIK — Abuse protection & server-side query helpers", () => {
  // ------------------------------------------------------------------ clientIp
  it("1. resolves the client IP from proxy headers", () => {
    const a = new Request("http://x/y", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    expect(clientIp(a)).toBe("203.0.113.9");

    const b = new Request("http://x/y", { headers: { "cf-connecting-ip": "198.51.100.4" } });
    expect(clientIp(b)).toBe("198.51.100.4");

    const c = new Request("http://x/y");
    expect(clientIp(c)).toBe("unknown");
  });

  // --------------------------------------------------------------- sanitizeTerm
  it("2. strips characters that would break a PostgREST filter", () => {
    expect(sanitizeTerm("482731")).toBe("482731");
    expect(sanitizeTerm("ali,ahmed")).toBe("ali ahmed");
    expect(sanitizeTerm("a(b)c%")).not.toMatch(/[(),%*'"]/);
    expect(sanitizeTerm("  spaced   out  ")).toBe("spaced out");
    expect(sanitizeTerm("")).toBe("");
    expect(sanitizeTerm(null)).toBe("");
    expect(sanitizeTerm("x".repeat(200)).length).toBeLessThanOrEqual(60);
  });

  // ------------------------------------------------------------ parsePagination
  it("3. keeps legacy full-fetch behaviour when no limit is supplied", () => {
    const p = parsePagination(new URLSearchParams(""));
    expect(p.limit).toBeNull();
    expect(p.paged).toBe(false);
    expect(p.offset).toBe(0);
  });

  it("4. parses limit/offset and caps the page size", () => {
    const p = parsePagination(new URLSearchParams("limit=50&offset=100"));
    expect(p).toEqual({ limit: 50, offset: 100, paged: true });

    const capped = parsePagination(new URLSearchParams("limit=5000"));
    expect(capped.limit).toBe(200);
  });

  it("5. computes hasMore only for paged queries", () => {
    expect(computeHasMore([1, 2, 3], 3)).toBe(true);
    expect(computeHasMore([1, 2], 3)).toBe(false);
    expect(computeHasMore([1, 2, 3], null)).toBe(false);
    expect(computeHasMore(null, 3)).toBe(false);
  });

  // --------------------------------------------------------------- route wiring
  it("6. registration uses durable throttling + optional Turnstile (no in-memory map)", () => {
    const code = read("src/app/api/register/route.ts");
    expect(code).toContain("enforceRateLimit");
    expect(code).toContain("verifyTurnstile");
    expect(code).not.toContain("RECENT_SIGNUPS");
    expect(code).not.toContain("new Map<");
    // Durable limiter lives in the shared helper contract.
    expect(read("src/lib/security/rate-limit.ts")).toContain(
      'rpc("claim_rate_limit_slot"'
    );
  });

  it("7. public scan endpoints are IP-throttled", () => {
    const verify = read("src/app/api/scan/verify/route.ts");
    expect(verify).toContain("enforceRateLimit");
    expect(verify).toContain("scan:verify:ip");

    const alert = read("src/app/api/scan/alert/route.ts");
    expect(alert).toContain("enforceRateLimit");
    expect(alert).toContain("scan:alert:ip");
    expect(alert).toContain("verifyTurnstile");
  });

  it("8. rate limiting fails open so emergencies are never blocked", () => {
    const lib = read("src/lib/security/rate-limit.ts");
    // missing identity → allowed
    expect(lib).toContain('if (!token || token === "unknown")');
    // RPC error / throw → allowed (degraded)
    expect(lib).toContain("if (error) return { allowed: true, degraded: true }");
    expect(lib).toContain("return { allowed: true, degraded: true };");
  });

  it("9. Turnstile is opt-in (disabled unless the secret is configured)", () => {
    const prev = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(isTurnstileConfigured()).toBe(false);
    if (prev !== undefined) process.env.TURNSTILE_SECRET_KEY = prev;
  });

  // ------------------------------------------------------------- migration 08
  it("10. migration 08 defines the durable limiter and escalation marker", () => {
    const sql = read(
      "supabase/migrations/20260918000001_rate_limit_and_timed_escalation.sql"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.rate_limit_buckets");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.claim_rate_limit_slot(");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.claim_rate_limit_slot(TEXT, TEXT, INT, INT) TO anon, authenticated"
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS matched_vehicle_id UUID");
    // Buckets must not be directly readable by clients.
    expect(sql).toContain(
      "REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC, anon, authenticated"
    );
  });

  // ------------------------------------------------------- timed escalation
  it("11. timed escalation is wired into the inbox and exposes a scheduler endpoint", () => {
    const alertsRoute = read("src/app/api/alerts/route.ts");
    expect(alertsRoute).toContain("escalateStaleAlerts");

    const escalator = read("src/lib/notifications/escalate-stale.ts");
    expect(escalator).toContain('eq("status", "pending")');
    expect(escalator).toContain('is("escalated_at", null)');
    expect(escalator).toContain("notifySecurityTeam");

    const endpoint = read("src/app/api/alerts/escalate/route.ts");
    expect(endpoint).toContain("CRON_SECRET");
    expect(endpoint).toContain("x-harrik-cron-secret");
  });

  it("12. unknown-vehicle reports can be promoted to a registered vehicle", () => {
    const promote = read("src/app/api/unknown/promote/route.ts");
    expect(promote).toContain('.from("vehicles")');
    expect(promote).toContain('.from("staff_vehicles")');
    expect(promote).toContain('status: "identified"');
    expect(promote).toContain("promote_unknown_vehicle"); // audit action

    // The admin UI must call the promote endpoint, not just flip the status.
    const page = read("src/app/admin/unknown/page.tsx");
    expect(page).toContain("/api/unknown/promote");
  });

  it("13. paginated list endpoints expose limit/offset and hasMore", () => {
    for (const rel of [
      "src/app/api/alerts/route.ts",
      "src/app/api/unknown/route.ts",
      "src/app/api/admin/staff/route.ts",
      "src/app/api/admin/vehicles/route.ts",
    ]) {
      const code = read(rel);
      expect(code).toContain("parsePagination");
      expect(code).toContain("computeHasMore");
      expect(code).toContain("hasMore");
    }
  });
});
