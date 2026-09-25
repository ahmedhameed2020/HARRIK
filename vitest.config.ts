import { defineConfig } from "vitest/config";
import path from "path";

/**
 * حَرِّك | HARRIK — Vitest configuration.
 *
 * `pnpm test` (unit suites) stays green on a fresh clone: it never needs a
 * database. The live-DB integration suites under `tests/integration` require a
 * seeded local Supabase stack (see `pnpm dev:local` + `supabase db push`), so
 * they are only collected when RUN_LIVE_INTEGRATION is set — i.e. via
 * `pnpm test:integration` — mirroring how the Playwright E2E specs skip
 * themselves without credentials.
 */
const runLiveIntegration = process.env.RUN_LIVE_INTEGRATION === "1";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Playwright specs live in tests/e2e and are driven by `pnpm test:e2e`.
      "tests/e2e/**",
      // Live-DB suites run only through `pnpm test:integration`.
      ...(runLiveIntegration ? [] : ["tests/integration/supabase-live.test.ts", "tests/integration/auth-and-crud.test.ts", "tests/integration/enterprise-v1-features.test.ts"]),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
