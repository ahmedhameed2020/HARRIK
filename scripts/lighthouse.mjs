/**
 * حَرِّك | HARRIK — Lighthouse audit runner (§11.6).
 *
 *   pnpm test:lighthouse                          # http://127.0.0.1:3101/login
 *   pnpm test:lighthouse http://127.0.0.1:3101/   # any URL
 *
 * Uses the Chromium that Playwright already downloaded (no extra browser), so
 * it works offline. Reports are written to `lighthouse-report.{json,html}`.
 *
 * Exits non-zero when a threshold is missed:
 *   accessibility ≥ 90 · best-practices ≥ 90 · performance ≥ 70
 *
 * Override a threshold with LH_MIN_ACCESSIBILITY / LH_MIN_BEST_PRACTICES /
 * LH_MIN_PERFORMANCE. A threshold of 0 turns the category into an
 * informational score that is reported but never fails the run — this is what
 * `pnpm test:lighthouse:local` uses, because `next dev` serves unminified
 * bundles and its performance score is not representative of production.
 * `seo` is always informational.
 */
import fs from "node:fs";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const url = process.argv[2] || process.env.LH_URL || "http://127.0.0.1:3101/login";

const THRESHOLDS = {
  accessibility: Number(process.env.LH_MIN_ACCESSIBILITY ?? 90),
  "best-practices": Number(process.env.LH_MIN_BEST_PRACTICES ?? 90),
  performance: Number(process.env.LH_MIN_PERFORMANCE ?? 70),
  seo: 0,
};

const chromePath = chromium.executablePath();
if (!fs.existsSync(chromePath)) {
  console.error(
    `[harrik] Chromium not found at ${chromePath}\n         Run: pnpm exec playwright install chromium`
  );
  process.exit(1);
}

let chrome;
try {
  chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const runnerResult = await lighthouse(
    url,
    { port: chrome.port, logLevel: "error" },
    {
      extends: "lighthouse:default",
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 2, disabled: false },
      },
    }
  );

  const report = runnerResult.lhr;
  fs.writeFileSync("lighthouse-report.json", JSON.stringify(report, null, 2));
  if (runnerResult.report) {
    const html = Array.isArray(runnerResult.report) ? runnerResult.report[1] : runnerResult.report;
    if (typeof html === "string") fs.writeFileSync("lighthouse-report.html", html);
  }

  console.log(`\n[harrik] Lighthouse — ${url}\n`);
  let failed = false;
  for (const [id, threshold] of Object.entries(THRESHOLDS)) {
    const category = report.categories[id];
    if (!category) continue;
    const score = Math.round((category.score ?? 0) * 100);
    if (threshold <= 0) {
      console.log(`  • ${category.title.padEnd(18)} ${String(score).padStart(3)} / 100  (informational)`);
      continue;
    }
    const ok = score >= threshold;
    if (!ok) failed = true;
    console.log(`  ${ok ? "✓" : "✗"} ${category.title.padEnd(18)} ${String(score).padStart(3)} / 100  (min ${threshold})`);
  }
  console.log("\n  Reports: lighthouse-report.html (open in a browser), lighthouse-report.json\n");

  process.exitCode = failed ? 1 : 0;
} catch (err) {
  console.error("[harrik] Lighthouse run failed:", err?.message || err);
  process.exitCode = 1;
} finally {
  // Chrome can still hold files in its temp profile on Windows, which makes
  // chrome-launcher's cleanup throw EPERM *after* the report was written.
  // That must not turn a successful audit into a failed run.
  try {
    if (chrome) await chrome.kill();
  } catch (err) {
    console.warn(`[harrik] Chrome cleanup warning (ignored): ${err?.message || err}`);
  }
}
