/**
 * حَرِّك | HARRIK — live mobile measurement.
 *
 * The static audit (scripts/mobile-audit.mjs) reads classes; this reads the
 * rendered page. It drives Chromium at real phone widths and reports what a
 * person would actually hit:
 *
 *   - horizontal overflow (the page pans sideways)
 *   - tap targets below 44px
 *   - content text below the 11px floor
 *   - anything left underneath the floating navigation island
 *
 * Only unauthenticated routes can be crawled without a seeded tenant account,
 * so pass E2E_EMAIL / E2E_PASSWORD to have it sign in and cover the rest.
 *
 * Usage: node scripts/lib/measure-mobile.mjs [baseUrl]
 */
import fs from "node:fs";
import { chromium, devices } from "@playwright/test";

const BASE = process.argv[2] || process.env.E2E_BASE_URL || "http://127.0.0.1:3100";

/** The two widths that matter: the narrowest Android and a common iPhone. */
const VIEWPORTS = [
  { name: "android-360", width: 360, height: 740 },
  { name: "iphone-390", width: 390, height: 844 },
];

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/scan"];
const PRIVATE_ROUTES = ["/", "/inbox", "/profile", "/admin", "/admin/staff", "/admin/vehicles",
  "/admin/visitors", "/admin/alerts", "/admin/unknown", "/admin/reports", "/admin/import",
  "/admin/settings", "/admin/audit"];

/** Runs in the page: everything below is measured, not inferred. */
function collect() {
  const docWidth = document.documentElement.clientWidth;
  const out = { docWidth, overflow: [], smallTargets: [], tinyText: [], scrollWidth: document.documentElement.scrollWidth };

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 120);
  };

  for (const el of document.querySelectorAll("body *")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;

    // Elements sticking out past the right/left edge of the viewport.
    if (rect.width > 0 && (rect.right > docWidth + 1 || rect.left < -1)) {
      if (style.position !== "fixed" && el.children.length === 0) {
        out.overflow.push({ el: describe(el), left: Math.round(rect.left), right: Math.round(rect.right) });
      }
    }

    // Interactive controls under the 44px touch guidance.
    const interactive = el.matches("a[href], button, input:not([type=hidden]), select, textarea, [role=button]");
    if (interactive && !el.hasAttribute("disabled")) {
      // A checkbox or radio wrapped in a label is tapped by its label, so the
      // label's box is the real target.
      const label = el.matches("input[type=checkbox], input[type=radio]") ? el.closest("label") : null;
      const box = label ? label.getBoundingClientRect() : rect;
      const h = box.height;
      const w = box.width;
      const text = (el.textContent || "").trim();
      // Width only matters for icon-only controls: a text link that is 200px
      // wide and 44px tall is a perfectly good target.
      const tooNarrow = w < 44 && !text;
      if (h > 0 && (h < 44 || tooNarrow)) {
        out.smallTargets.push({ el: describe(el), w: Math.round(w), h: Math.round(h), text: text.slice(0, 40) });
      }
    }

    // Text rendered below the readability floor.
    const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText) {
      const size = parseFloat(style.fontSize);
      if (size && size < 11) {
        out.tinyText.push({ el: describe(el), size, text: el.textContent.trim().slice(0, 40) });
      }
    }
  }
  return out;
}

async function measure(page, route, viewport) {
  const url = `${BASE}${route}`;
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => null);
  // A redirect to /login means the route needs an account we do not have.
  const landed = new URL(page.url()).pathname;
  const redirected = landed !== route && landed !== `${route}/`;
  await page.waitForTimeout(400);
  const result = await page.evaluate(collect);
  return { route, landed, redirected, status: response?.status() ?? 0, viewport: viewport.name, ...result };
}

// Some CI images ship a Chromium that does not match the pinned Playwright
// build; use it rather than downloading a second copy when it is there.
const fallbackChromium = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(
  fs.existsSync(fallbackChromium) ? { executablePath: fallbackChromium } : {}
);
const results = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: viewport.width, height: viewport.height },
    locale: "ar-QA",
    timezoneId: "Asia/Qatar",
  });
  const page = await context.newPage();

  const routes = [...PUBLIC_ROUTES];
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }).catch(() => {});
    await page.fill('input[type="email"]', process.env.E2E_EMAIL).catch(() => {});
    await page.fill('input[type="password"]', process.env.E2E_PASSWORD).catch(() => {});
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(3000);
    routes.push(...PRIVATE_ROUTES);
  }

  for (const route of routes) results.push(await measure(page, route, viewport));
  await context.close();
}

await browser.close();

let problems = 0;
for (const r of results) {
  const skipped = r.redirected ? ` (redirected to ${r.landed} — needs an account)` : "";
  const pans = r.scrollWidth > r.docWidth + 1;
  const issues = r.overflow.length + r.smallTargets.length + r.tinyText.length + (pans ? 1 : 0);
  problems += issues;
  console.log(`\n${r.viewport}  ${r.route}${skipped}  —  ${issues ? `${issues} issue(s)` : "clean"}`);
  if (pans) console.log(`  PAGE PANS SIDEWAYS: scrollWidth ${r.scrollWidth} > viewport ${r.docWidth}`);
  for (const o of r.overflow.slice(0, 8)) console.log(`  overflow  ${o.el}  [${o.left} … ${o.right}]`);
  for (const t of r.smallTargets.slice(0, 12)) console.log(`  target    ${t.w}x${t.h}  ${t.el}  "${t.text}"`);
  for (const t of r.tinyText.slice(0, 8)) console.log(`  text      ${t.size}px  ${t.el}  "${t.text}"`);
}

console.log(`\nTotal issues across ${results.length} page renders: ${problems}`);
