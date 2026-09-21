/**
 * حَرِّك | HARRIK — a missing secret must say so.
 *
 * Every Supabase client used to fall back to a literal placeholder when its
 * variable was unset, and Supabase answers a placeholder with `Invalid API
 * key`. An administrator creating an organization was shown that error while
 * the real problem was that the deployment had never been configured — an
 * error describing a *wrong* key when the key was simply *absent*.
 *
 * These pin both directions: unset configuration is reported by name, and
 * correctly configured values are left completely alone.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readPublicSupabaseEnv,
  readServiceRoleSupabaseEnv,
  SupabaseConfigError,
  configErrorMessageAr,
  PLACEHOLDER_ANON_KEY,
  PLACEHOLDER_URL,
} from "@/lib/supabase/env";

const REAL_URL = "https://example-project.supabase.co";
const REAL_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake-anon-for-tests";
const REAL_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake-service-for-tests";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("public configuration", () => {
  it("reports each missing variable by name", () => {
    const env = readPublicSupabaseEnv();
    expect(env.missing).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    // The placeholders remain so a build, a test and `next dev` still run.
    expect(env.url).toBe(PLACEHOLDER_URL);
    expect(env.anonKey).toBe(PLACEHOLDER_ANON_KEY);
  });

  it("treats a build-inlined placeholder as missing, not as configured", () => {
    // `next build` bakes NEXT_PUBLIC_* into the browser bundle. A build that
    // ran without the variable ships the placeholder, and every request from
    // that bundle then carries a fake key — so the literal must not pass.
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = PLACEHOLDER_ANON_KEY;

    expect(readPublicSupabaseEnv().missing).toEqual(["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  });

  it("passes real values through untouched", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REAL_ANON;

    const env = readPublicSupabaseEnv();
    expect(env.missing).toEqual([]);
    expect(env.url).toBe(REAL_URL);
    expect(env.anonKey).toBe(REAL_ANON);
  });
});

describe("service-role configuration", () => {
  it("throws, naming the variables, instead of sending a placeholder", () => {
    try {
      readServiceRoleSupabaseEnv();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SupabaseConfigError);
      const configError = err as SupabaseConfigError;
      expect(configError.missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
      // The message has to point at the deployment, not at the key's validity.
      expect(configError.message).not.toContain("Invalid API key");
      expect(configError.message).toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("never silently downgrades to the anon key", () => {
    // The old chain was `SERVICE_ROLE || ANON || "placeholder-key"`, so a
    // deployment missing its service-role key ran admin work at anon
    // privileges — succeeding at the wrong level rather than failing.
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REAL_ANON;

    expect(() => readServiceRoleSupabaseEnv()).toThrow(SupabaseConfigError);
  });

  it("returns the configured pair when both are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;

    expect(readServiceRoleSupabaseEnv()).toEqual({
      url: REAL_URL,
      serviceRoleKey: REAL_SERVICE,
    });
  });
});

describe("the message an administrator sees", () => {
  it("names the variables in Arabic and asks for configuration, not a new key", () => {
    const message = configErrorMessageAr(["SUPABASE_SERVICE_ROLE_KEY"]);
    expect(message).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(message).toMatch(/[؀-ۿ]/);
  });
});
