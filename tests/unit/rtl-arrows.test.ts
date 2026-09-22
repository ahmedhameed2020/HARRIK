/**
 * حَرِّك | HARRIK — forward/back arrows must point the right way in Arabic.
 *
 * Found 2026-09-22, on a real phone-width screenshot: the registration
 * wizard's "التالي" (Next) button pointed right — back toward the step you
 * came from — and "السابق" (Previous) pointed left, toward where you were
 * going. The same inversion, or a missing RTL mirror entirely, was present on
 * six links across the app, including the "Select" arrow on the search
 * screen's recent-results list — the single most used screen in the product.
 *
 * `scripts/rtl-arrow-audit.mjs` catches the mechanical version of this (an
 * icon with no `rtl:` mirroring at all, or an unconditional `rotate-180`).
 * It cannot know which icon is semantically "forward" and which is "back" —
 * that needs the surrounding label — so this test pins the specific
 * high-traffic cases by hand, reading the source rather than rendering it,
 * since the bug is about which icon was chosen, not whether the JSX is valid.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Convention used throughout the app: a forward action (Next / Continue /
 * Select / Go to X) pairs `ArrowRight` with `rtl:rotate-180` — right-pointing
 * in English, flipped to left-pointing in Arabic. A back action (Previous /
 * Back to X) is the mirror image: `ArrowLeft` with `rtl:rotate-180`.
 */
function expectForwardArrow(source: string, nearText: string) {
  const idx = source.indexOf(nearText);
  expect(idx, `expected to find "${nearText}"`).toBeGreaterThan(-1);
  const window = source.slice(Math.max(0, idx - 400), idx + 400);
  expect(window).toMatch(/ArrowRight\b/);
  expect(window).toContain("rtl:rotate-180");
  expect(window).not.toMatch(/<ArrowLeft\b/);
}

function expectBackArrow(source: string, nearText: string) {
  const idx = source.indexOf(nearText);
  expect(idx, `expected to find "${nearText}"`).toBeGreaterThan(-1);
  const window = source.slice(Math.max(0, idx - 400), idx + 400);
  expect(window).toMatch(/ArrowLeft\b/);
  expect(window).toContain("rtl:rotate-180");
  expect(window).not.toMatch(/<ArrowRight\b/);
}

describe("registration wizard — Next/Previous point the right way", () => {
  const source = read("src/app/register/page.tsx");

  it('"التالي" (Next) points forward, not back to the previous step', () => {
    expectForwardArrow(source, "t.regNext");
  });

  it('"السابق" (Previous) points back, not forward', () => {
    expectBackArrow(source, "t.regPrev");
  });

  it('the success screen\'s "go to login" link points forward', () => {
    expectForwardArrow(source, "t.regSuccessGo");
  });
});

describe("high-traffic forward/back links point the right way", () => {
  it('PlateSearchHero "Select" (the busiest screen in the app) points forward', () => {
    expectForwardArrow(read("src/features/search/PlateSearchHero.tsx"), '"اختيار" : "Select"');
  });

  it('forgot-password "Back to login" points back', () => {
    expectBackArrow(read("src/app/forgot-password/page.tsx"), "t.forgotBackLogin");
  });

  it('onboarding "skip" points forward, out of the wizard', () => {
    expectForwardArrow(read("src/app/onboarding/page.tsx"), "t.onbSkip");
  });

  it('department detail "back to search" points back', () => {
    expectBackArrow(read("src/app/departments/[id]/page.tsx"), "رجوع للبحث");
  });
});

describe("chevrons that were unconditionally rotated (correct only in Arabic)", () => {
  it("dashboard quick-action chevrons mirror by language instead of always flipping", () => {
    const source = read("src/features/dashboard/DashboardOverview.tsx");
    const matches = source.match(/<ChevronRight className="[^"]*"/g) || [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m).toContain("rtl:rotate-180");
      // A bare, unconditional rotate-180 was the original bug: correct in
      // Arabic by accident, backwards the moment someone switches to English.
      expect(m).not.toMatch(/(?<!rtl:)rotate-180/);
    }
  });

  it("department row chevron mirrors by language", () => {
    const source = read("src/features/departments/DepartmentStrip.tsx");
    expect(source).toMatch(/<ChevronRight\b/);
    expect(source).not.toMatch(/<ChevronLeft\b/);
    expect(source).toContain("rtl:rotate-180");
  });
});
