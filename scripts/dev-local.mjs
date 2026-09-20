/**
 * حَرِّك | HARRIK — run the dev server against the LOCAL Supabase stack.
 *
 *   pnpm dev:local            # http://localhost:3000
 *   $env:PORT=3200; pnpm dev:local
 *
 * Reads `supabase/.env.local.localdev`… actually `.env.local.localdev` and
 * injects it as *process* environment, which takes precedence over the
 * `.env.local` file Next.js loads — so your remote credentials are untouched.
 */
import { spawn } from "node:child_process";
import { loadEnvFile } from "./lib/local-env.mjs";

const PORT = process.env.PORT || "3000";
const localEnv = loadEnvFile(".env.local.localdev");

if (!localEnv.NEXT_PUBLIC_SUPABASE_URL) {
  console.error(
    "[harrik] .env.local.localdev is missing NEXT_PUBLIC_SUPABASE_URL.\n" +
      "         Start the local stack with `supabase start` and copy .env.example → .env.local.localdev."
  );
  process.exit(1);
}

console.log(`[harrik] dev server → :${PORT}  |  Supabase: ${localEnv.NEXT_PUBLIC_SUPABASE_URL}`);

const child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, ...localEnv },
});

child.on("exit", (code) => process.exit(code ?? 0));
