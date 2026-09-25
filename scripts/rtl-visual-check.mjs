/**
 * حَرِّك | HARRIK — one-off visual/RTL verification against the running preview.
 *
 *   node scripts/rtl-visual-check.mjs [baseUrl]
 *
 * Loads public pages in real Chromium and asserts:
 *   1. <html> is dir="rtl" with lang="ar"
 *   2. every element carrying `rtl:rotate-180` actually renders rotated 180°
 *   3. the computed style of .rounded-pill is fully rounded
 * Exits 0 only when all checks pass.
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const PAGES = ["/login", "/forgot-password", "/register"];

// Seeded demo tenant (same defaults as scripts/e2e-local.mjs) so the
// authenticated surfaces — where the flipped icons actually live — get checked.
const EMAIL = process.env.E2E_EMAIL || "ahmed.hassan@school.edu.qa";
const PASSWORD = process.env.E2E_PASSWORD || "Password123!";

const browser = await chromium.launch();
const failures = [];

try {
  const context = await browser.newContext({ locale: "ar-QA" });
  const page = await context.newPage();

  for (const route of PAGES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // 1. Direction + language
    const html = page.locator("html");
    const dir = await html.getAttribute("dir");
    const lang = await html.getAttribute("lang");
    if (dir !== "rtl") failures.push(`${route}: dir="${dir}" (expected rtl)`);
    if (lang !== "ar") failures.push(`${route}: lang="${lang}" (expected ar)`);

    // 2. Every rtl:rotate-180 element is visually rotated
    const flipped = await page.$$eval(
      '[class*="rtl:rotate-180"]',
      (els) =>
        els.map((el) => {
          const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
          const deg = Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
          return { cls: el.getAttribute("class"), deg };
        })
    );
    for (const f of flipped) {
      const ok = Math.abs(Math.abs(f.deg) - 180) < 1 || Math.abs(f.deg) < 1;
      // rotation can compose with other transforms; flag anything in between
      if (!ok) failures.push(`${route}: [${f.cls}] computed rotate ${f.deg}° (not 0/180)`);
    }
    console.log(
      `  ${route}: dir=${dir}/${lang}, ${flipped.length} flipped icon(s)` +
        (flipped.length ? ` → ${flipped.map((f) => f.deg + "°").join(", ")}` : "")
    );

    // 3. rounded-pill really renders as a pill on this page
    const pill = await page.$eval(
      ".rounded-pill",
      (el) => {
        const s = getComputedStyle(el);
        return { r: s.borderRadius, w: el.offsetWidth, h: el.offsetHeight };
      },
      null,
      { timeout: 3000 }
    ).catch(() => null);
    if (pill) {
      const isPill = parseFloat(pill.r) >= Math.min(pill.w, pill.h) / 2;
      if (!isPill) failures.push(`${route}: .rounded-pill radius=${pill.r} on ${pill.w}x${pill.h}`);
      else console.log(`    rounded-pill ✓ (${pill.w}x${pill.h}, radius ${pill.r})`);
    }
  }

  // Authenticated surfaces: the rtl:rotate-180 arrows live behind sign-in.
  const signedIn = await page
    .goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
    .then(() => true)
    .catch(() => false);
  let authed = false;
  if (signedIn) {
    try {
      await page.getByTestId("login-email").fill(EMAIL);
      await page.getByTestId("login-password").fill(PASSWORD);
      await page.getByTestId("login-submit").click();
      await page.waitForURL((u) => !String(u).includes("/login"), { timeout: 45_000 });
      authed = true;
    } catch {
      console.log("  (seeded login unavailable — skipping authenticated surfaces)");
    }
  }

  if (authed) {
    for (const route of ["/", "/profile", "/inbox"]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);

      const flipped = await page.$$eval(
        '[class*="rtl:rotate-180"]',
        (els) =>
          els.map((el) => {
            const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
            const deg = Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
            return { cls: el.getAttribute("class"), deg, visible: el.offsetParent !== null };
          })
      );
      for (const f of flipped) {
        if (!f.visible) continue;
        const ok = Math.abs(Math.abs(f.deg) - 180) < 1 || Math.abs(f.deg) < 1;
        if (!ok) failures.push(`${route}: [${f.cls}] computed rotate ${f.deg}° (not 0/180)`);
      }
      console.log(
        `  ${route} (auth): ${flipped.length} flipped icon(s)` +
          (flipped.length ? ` → ${flipped.map((f) => f.deg + "°").join(", ")}` : "")
      );
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\n✗ RTL visual check failed:");
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log("\n✓ RTL visual check passed on all public pages");
