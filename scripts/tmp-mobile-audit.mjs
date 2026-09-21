/** Temporary: real mobile audit on the live deployment. */
import { chromium } from "@playwright/test";

const BASE = "https://harrik.ahmedhameed2020.workers.dev";
const EMAIL = process.env.LIVE_EMAIL;
const PASSWORD = process.env.LIVE_PASSWORD;
const OUT = process.env.UI_OUT || ".";

const DEVICES = [
  { name: "iphone-390", width: 390, height: 844, dsr: 3 },
  { name: "android-360", width: 360, height: 740, dsr: 3 },
];

const PAGES = [
  ["/", "home", true],
  ["/inbox", "inbox", true],
  ["/profile", "profile", true],
  ["/admin", "dashboard", true],
  ["/admin/staff", "staff", true],
  ["/admin/settings", "settings", true],
  ["/departments/30ea3e04-cd27-4ee4-903b-13e5f913205c", "department", true],
  ["/login", "login", false],
];

const browser = await chromium.launch();

async function auditViewport(device, { shoot }) {
  const ctx = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.dsr,
    isMobile: true,
    hasTouch: true,
    locale: "ar-QA",
  });
  await ctx.addCookies([{ name: "harrik_lang", value: "ar", url: BASE }]);
  const page = await ctx.newPage();

  if (EMAIL && PASSWORD) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector('[data-testid="login-email"]', { timeout: 90_000 });
    await page.waitForTimeout(3000);
    await page.getByTestId("login-email").fill(EMAIL);
    await page.getByTestId("login-password").fill(PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 120_000 });
    await page.waitForTimeout(2000);
  }

  console.log(`\n=== ${device.name} (${device.width}x${device.height}) ===`);
  for (const [path, name, needsAuth] of PAGES) {
    if (needsAuth && !EMAIL) continue;
    if (!needsAuth && !EMAIL) continue; // already audited public pages
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(7000);

    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const doc = document.documentElement;

      const interactive = [...document.querySelectorAll("a,button,[role=button],input,select,textarea")].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      const small = interactive
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { h: Math.round(r.height), w: Math.round(r.width), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 18) };
        })
        .filter((x) => x.h < 44);

      const tinyText = [...document.querySelectorAll("p,span,div,a,li")]
        .filter((el) => {
          if (!el.textContent || el.children.length > 0) return false;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const r = el.getBoundingClientRect();
          return fs < 12 && r.width > 0 && r.height > 0 && el.textContent.trim().length > 2;
        })
        .map((el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize))}px:${el.textContent.trim().slice(0, 16)}`)
        .slice(0, 6);

      // content hidden behind the floating bottom island
      const island = document.querySelector('nav[aria-label="Mobile Navigation"]');
      let islandCovered = 0;
      let islandTop = null;
      if (island) {
        const ir = island.getBoundingClientRect();
        islandTop = Math.round(ir.top);
        for (const el of document.querySelectorAll("main p, main h1, main h2, main a, main button")) {
          const r = el.getBoundingClientRect();
          if (r.bottom > ir.top + 4 && r.top < ir.bottom && r.width > 0) islandCovered++;
        }
      }

      const main = document.querySelector("main");
      const mainRect = main?.getBoundingClientRect();

      return {
        overflowX: doc.scrollWidth - vw,
        pageHeight: doc.scrollHeight,
        viewports: Math.round((doc.scrollHeight / vh) * 10) / 10,
        tapUnder44: small.length,
        worstTargets: small.sort((a, b) => a.h - b.h).slice(0, 4).map((s) => `${s.h}px ${s.label}`),
        tinyTextCount: tinyText.length,
        tinyText,
        islandCovered,
        islandTop,
        mainTop: mainRect ? Math.round(mainRect.top) : null,
        h1Top: (() => {
          const h = document.querySelector("main h1, main h2");
          return h ? Math.round(h.getBoundingClientRect().top) : null;
        })(),
      };
    });

    console.log(
      `${name.padEnd(11)} overflowX=${String(m.overflowX).padStart(3)} height=${String(m.viewports).padStart(4)}vp ` +
        `tap<44=${String(m.tapUnder44).padStart(2)} tinyText=${String(m.tinyTextCount).padStart(2)} islandCovered=${m.islandCovered}`
    );
    if (m.worstTargets.length) console.log(`            smallest: ${m.worstTargets.join(" | ")}`);
    if (m.tinyText.length) console.log(`            tiny: ${m.tinyText.join(" | ")}`);
    if (m.islandCovered > 0) console.log(`            ⚠ ${m.islandCovered} elements sit under the bottom island (island top ${m.islandTop})`);

    if (shoot && (name === "home" || name === "inbox" || name === "dashboard" || name === "staff")) {
      await page.screenshot({ path: `${OUT}/${device.name}-${name}.png` });
    }
  }
  await ctx.close();
}

for (const device of DEVICES) {
  await auditViewport(device, { shoot: true });
}

await browser.close();
