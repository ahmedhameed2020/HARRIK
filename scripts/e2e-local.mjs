/**
 * حَرِّك | HARRIK — one-command end-to-end run against the LOCAL stack.
 *
 *   pnpm test:e2e:local
 *   pnpm test:e2e:local tests/e2e/a11y.spec.ts
 *   pnpm test:e2e:local --project=desktop-en
 *
 * What it does:
 *   1. loads `.env.local.localdev` (local Supabase) without touching `.env.local`
 *   2. starts `next dev` on E2E_PORT (default 3101)
 *   3. waits for it to answer
 *   4. runs Playwright against it with the seeded demo credentials
 *   5. always tears the server down and forwards the exit code
 *
 * Override the account with E2E_EMAIL / E2E_PASSWORD.
 */
import { spawn } from "node:child_process";
import { loadEnvFile, killTree, waitForServer } from "./lib/local-env.mjs";

const PORT = process.env.E2E_PORT || "3101";
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
const localEnv = loadEnvFile(".env.local.localdev");

if (!localEnv.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("[harrik] .env.local.localdev is missing NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}

let server = null;
let tests = null;
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  killTree(tests);
  killTree(server);
  process.exit(code ?? 0);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

// The suite must run against a server started with the LOCAL credentials, so a
// server that is already holding the port is a hard stop: Next would silently
// bind the next free port and the tests would keep hitting the old one.
if (!process.env.E2E_BASE_URL && (await waitForServer(`${BASE_URL}/login`, 2_000))) {
  console.error(
    `[harrik] ${BASE_URL} is already serving.\n` +
      `         Stop it (e.g. the pnpm dev:local session) or pick another port with E2E_PORT=3200.\n` +
      `         To test an already-running deployment on purpose, set E2E_BASE_URL.`
  );
  process.exit(1);
}

console.log(`[harrik] starting dev server on ${BASE_URL} (local Supabase)`);
server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, ...localEnv },
});

const ready = await waitForServer(`${BASE_URL}/login`);
if (!ready) {
  console.error("[harrik] dev server did not become ready in time.");
  shutdown(1);
}

const testEnv = {
  ...process.env,
  ...localEnv,
  E2E_BASE_URL: BASE_URL,
  E2E_EMAIL: process.env.E2E_EMAIL || "ahmed.hassan@school.edu.qa",
  E2E_PASSWORD: process.env.E2E_PASSWORD || "Password123!",
};

console.log("[harrik] running Playwright…");
tests = spawn("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: testEnv,
});

tests.on("exit", (code) => shutdown(code ?? 0));
