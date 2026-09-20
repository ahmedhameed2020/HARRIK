/**
 * حَرِّك | HARRIK — one-command Lighthouse audit against the LOCAL stack.
 *
 *   pnpm test:lighthouse:local                 # next dev  — fast, perf is informational
 *   pnpm test:lighthouse:local --prod          # next build + next start — real numbers
 *   pnpm test:lighthouse:local --prod http://127.0.0.1:3101/admin
 *   LH_AUDIT_PATH=/login pnpm test:lighthouse:local
 *
 * What it does:
 *   1. loads `.env.local.localdev` (local Supabase) as *process* env, so
 *      `.env.local` (remote credentials) is never touched
 *   2. reuses a server already answering on the port, otherwise starts one on
 *      LH_PORT (default 3101 — the same port `pnpm dev:local` and
 *      `pnpm test:e2e:local` use, so a running server is reused instead of
 *      starting a second process on the same `.next` directory)
 *   3. runs `scripts/lighthouse.mjs` against the requested path
 *   4. tears down only the server it started, and forwards the exit code
 *
 * `--prod` replaces the app's `.next` build output with a local-stack build
 * (`pnpm build:cf` still produces the deployment build).
 *
 * Dev mode enforces accessibility / best-practices (≥ 90) and reports
 * performance + SEO as informational. `--prod` enforces performance ≥ 70 too.
 * Auditing a *deployment* instead (no local server involved):
 *
 *   pnpm test:lighthouse https://<your-deployment>/login
 */
import { spawn, spawnSync } from "node:child_process";
import { loadEnvFile, killTree, waitForServer } from "./lib/local-env.mjs";

const PROD = process.argv.includes("--prod") || process.env.LH_PROD === "1";
const explicitUrl = process.argv.slice(2).find((a) => !a.startsWith("--"));

const PORT = process.env.LH_PORT || "3101";
const BASE_URL = process.env.LH_BASE_URL || `http://127.0.0.1:${PORT}`;
const TARGET = explicitUrl || `${BASE_URL}${process.env.LH_AUDIT_PATH || "/login"}`;
const localEnv = loadEnvFile(".env.local.localdev");

if (!localEnv.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("[harrik] .env.local.localdev is missing NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}

let server = null;
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  killTree(server);
  process.exit(code ?? 0);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

const alreadyUp = await waitForServer(`${BASE_URL}/login`, 2_000);

if (alreadyUp) {
  console.log(`[harrik] reusing the server already running on ${BASE_URL}`);
} else {
  if (PROD) {
    console.log("[harrik] production build (next build) with the local Supabase env…");
    const build = spawnSync("npx", ["next", "build"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...localEnv },
    });
    if (build.status !== 0) {
      console.error("[harrik] production build failed.");
      shutdown(build.status ?? 1);
    }
    console.log(`[harrik] starting production server on ${BASE_URL}`);
    server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...localEnv },
    });
  } else {
    console.log(`[harrik] starting dev server on ${BASE_URL} (local Supabase)`);
    server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...localEnv },
    });
  }

  if (!(await waitForServer(`${BASE_URL}/login`))) {
    console.error(
      PROD
        ? "[harrik] production server did not become ready in time."
        : "[harrik] dev server did not become ready in time."
    );
    shutdown(1);
  }
}

console.log(`[harrik] auditing ${TARGET}${PROD ? " (production build)" : ""}\n`);

const audit = spawnSync("node", ["scripts/lighthouse.mjs", TARGET], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    // In dev mode the raw performance score is meaningless (unminified
    // bundles): report it without failing the run. In prod mode keep the real
    // default thresholds.
    ...(PROD
      ? {}
      : { LH_MIN_PERFORMANCE: process.env.LH_MIN_PERFORMANCE ?? "0" }),
  },
});

shutdown(audit.status ?? 1);
