import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * حَرِّك | HARRIK — RTL direction guards.
 *
 * Regression tests for the bidi icon flips introduced across the UI: in an
 * RTL-first product a mis-flipped arrow is a correctness bug, not styling.
 */

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("HARRIK — RTL directional icon guards", () => {
  // Scenario: trailing chevrons on dashboard rows must point *forward* in both
  // directions — maroon-left in RTL, mirrored right in LTR. A bare
  // `rtl:rotate-0` would leave the un-rotated ChevronRight pointing *backwards*
  // in RTL, the opposite of the intended direction.
  it("dashboard quick-action chevrons mirror direction (rtl:rotate-180), never rtl:rotate-0", () => {
    const src = read("src/features/dashboard/DashboardOverview.tsx");

    expect(src).toContain("rtl:rotate-180");
    expect(src).not.toContain("rtl:rotate-0");

    const chevrons = src.match(/ChevronRight[^/>]*aria-hidden="true"/g) ?? [];
    expect(chevrons.length).toBeGreaterThanOrEqual(4);
    for (const chevron of chevrons) {
      expect(chevron).toContain("rtl:rotate-180");
      expect(chevron).not.toContain("rtl:rotate-0");
    }
  });

  // Scenario: back-links go *back* in reading order, so ArrowRight must flip
  // in RTL (`rtl:rotate-180`). Icons without either guard are the old bug.
  it("back-links and platform arrows carry the rtl:rotate-180 flip", () => {
    const files = [
      "src/app/departments/[id]/page.tsx",
      "src/app/platform/page.tsx",
      "src/app/profile/page.tsx",
      "src/app/not-found.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src).toContain("rtl:rotate-180");
      // The pre-fix regression: an unguarded directional arrow.
      expect(src).not.toMatch(/<(ArrowRight|ArrowLeft|ChevronRight|ChevronLeft)(?![^/>]*rtl:rotate-180)[^/>]*aria-hidden="true"/);
    }
  });

  // Scenario: the DepartmentStrip chevron is a *forward* affordance on a row
  // link, so it follows the dashboard rule (flip in RTL, mirror in LTR).
  it("DepartmentStrip row chevron mirrors like the dashboard rows", () => {
    const src = read("src/features/departments/DepartmentStrip.tsx");
    expect(src).toContain("rtl:rotate-180");
    expect(src).not.toContain("rtl:rotate-0");
  });
});

describe("HARRIK — design-system utility guards", () => {
  // Scenario: `rounded-pill` is referenced by status chips across admin and
  // department screens but was never defined — chips silently rendered square.
  it("rounded-pill is defined once in globals.css", () => {
    const css = read("src/app/globals.css");
    expect(css).toContain(".rounded-pill");
    expect(css).toContain("border-radius: 9999px");
  });

  // Scenario: guard against re-adding the broken empty-plate detection that
  // made the •••••• placeholder unreachable.
  it("QatarPlate detects an empty plate from the trimmed source string", () => {
    const src = read("src/components/ui/QatarPlate.tsx");
    expect(src).toMatch(/isEmpty\s*=\s*plateNumber\.trim\(\)\.length === 0/);
    expect(src).not.toMatch(/isEmpty\s*=\s*digits\.length === 0/);
  });
});
