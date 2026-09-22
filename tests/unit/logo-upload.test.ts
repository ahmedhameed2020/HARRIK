/**
 * حَرِّك | HARRIK — organization logo upload rules.
 *
 * `organizations.logo_url` has existed since the first migration and the
 * onboarding wizard was specified to take a logo (§9.2), but there was nowhere
 * to put the file, so the column could only ever hold a hand-typed URL.
 *
 * The storage policies (migration 11) authorise writes by the object's first
 * path segment, so the path builder is a security boundary, not a formatting
 * detail: a path that does not start with the caller's own organization id is
 * rejected by Postgres, and one that accidentally started with someone else's
 * would be a cross-tenant write.
 */
import { describe, it, expect } from "vitest";
import {
  validateLogo,
  logoObjectPath,
  MAX_LOGO_BYTES,
  ALLOWED_LOGO_TYPES,
  LOGO_BUCKET,
} from "@/lib/branding/logo";

describe("logo validation", () => {
  it("accepts the formats the bucket allows", () => {
    for (const type of ALLOWED_LOGO_TYPES) {
      expect(validateLogo({ type, size: 50_000 }).ok).toBe(true);
    }
  });

  it("rejects anything else, with a reason in both languages", () => {
    const result = validateLogo({ type: "application/pdf", size: 10_000 });
    expect(result.ok).toBe(false);
    expect(result.errorAr).toBeTruthy();
    expect(result.errorEn).toBeTruthy();

    expect(validateLogo({ type: "", size: 10_000 }).ok).toBe(false);
    // A disguised executable must not pass on extension alone.
    expect(validateLogo({ type: "application/x-msdownload", size: 10_000 }).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateLogo({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(validateLogo({ type: "image/png", size: Number.NaN }).ok).toBe(false);
  });

  it("enforces the same size ceiling as the bucket", () => {
    expect(validateLogo({ type: "image/png", size: MAX_LOGO_BYTES }).ok).toBe(true);
    expect(validateLogo({ type: "image/png", size: MAX_LOGO_BYTES + 1 }).ok).toBe(false);
  });
});

describe("where the object is stored", () => {
  const ORG = "11111111-2222-4333-8444-555555555555";

  it("puts the file in the caller's own organization folder", () => {
    const path = logoObjectPath(ORG, "image/png");
    // The storage policy authorises on exactly this segment.
    expect(path.split("/")[0]).toBe(ORG);
    expect(path.endsWith(".png")).toBe(true);
  });

  it("maps each allowed type to a sensible extension", () => {
    expect(logoObjectPath(ORG, "image/jpeg")).toMatch(/\.jpg$/);
    expect(logoObjectPath(ORG, "image/webp")).toMatch(/\.webp$/);
    expect(logoObjectPath(ORG, "image/svg+xml")).toMatch(/\.svg$/);
    // Unknown types never reach here (validation runs first), but the builder
    // must still produce something storable rather than an extensionless blob.
    expect(logoObjectPath(ORG, "image/tiff")).toMatch(/\.png$/);
  });

  it("gives each upload a fresh name so a replaced logo is not served from cache", () => {
    const first = logoObjectPath(ORG, "image/png", new Date("2026-01-01T00:00:00Z"));
    const second = logoObjectPath(ORG, "image/png", new Date("2026-01-01T00:00:01Z"));
    expect(first).not.toBe(second);
  });

  it("uses the bucket the migration creates", () => {
    expect(LOGO_BUCKET).toBe("org-logos");
  });
});
