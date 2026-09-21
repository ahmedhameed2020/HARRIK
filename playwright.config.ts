import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * حَرِّك | HARRIK — Playwright E2E configuration (§13).
 *
 * Quick start:
 *   pnpm build                 # production bundle (or use E2E_START_CMD below)
 *   pnpm exec playwright install chromium
 *   pnpm test:e2e
 *
 * Point it at an already-running deployment instead:
 *   $env:E2E_BASE_URL="https://harrik.example.com"; pnpm test:e2e
 *
 * Authenticated flows additionally need credentials:
 *   E2E_EMAIL / E2E_PASSWORD   (seeded tenant account)
 * They are skipped automatically when those variables are absent.
 */

const PORT = Number(process.env.E2E_PORT || 3100);
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
const hasExternalServer = Boolean(process.env.E2E_BASE_URL);

// Prefer the production server when a build exists; fall back to dev so the
// suite is runnable straight after a clone.
const buildIdExists = fs.existsSync(path.join(__dirname, ".next", "BUILD_ID"));
const startCommand =
  process.env.E2E_START_CMD ||
  (buildIdExists
    ? `pnpm exec next start -p ${PORT}`
    : `pnpm exec next dev -p ${PORT}`);

export default defineConfig({
  testDir: "./tests/e2e",
  // Generous budgets: the suite runs against `next dev` (on-demand compile) and
  // is often executed on a shared/loaded machine. A slow host must not make a
  // healthy app look broken — real assertion failures still fail fast.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "ar-QA",
    timezoneId: "Asia/Qatar",
  },
  projects: [
    {
      name: "mobile-ar",
      use: { ...devices["Pixel 7"], locale: "ar-QA" },
    },
    {
      name: "desktop-en",
      use: { ...devices["Desktop Chrome"], locale: "en-US" },
    },
  ],
  webServer: hasExternalServer
    ? undefined
    : {
        command: startCommand,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
