/**
 * حَرِّك | HARRIK — schema / migration verification over the REST API.
 *
 *   pnpm db:verify                 # uses .env.local     (remote / production project)
 *   pnpm db:verify:local           # uses .env.local.localdev (local Docker stack)
 *   node scripts/db-verify.mjs .env.staging
 *
 * Why this exists: `supabase db push` needs an Owner/Admin login on the
 * Supabase account. This script needs nothing but the project URL and the
 * service-role key already present in the env file, so a migration can be
 * confirmed (or ruled out) from the machine that runs the app — and it doubles
 * as a post-deploy smoke test.
 *
 * Exit code 0 only when every probe passes.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./lib/local-env.mjs";

const envFile = process.argv[2] || ".env.local";
const env = { ...loadEnvFile(envFile), ...process.env };

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error(`[harrik] ${envFile} is missing NEXT_PUBLIC_SUPABASE_URL.`);
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    `[harrik] ${envFile} is missing SUPABASE_SERVICE_ROLE_KEY.\n` +
      `         Column probes need it because the hardening migrations revoke\n` +
      `         table access from anon/authenticated.`
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Table reachable + a column exists (PostgREST reports 42703 otherwise). */
const column = (table, select) => async () => {
  const { error } = await db.from(table).select(select).limit(1);
  return error ? error.message : "ok";
};

/** Function exists with this exact signature (PGRST202 = no such overload). */
const rpc = (fn, args, expect) => async () => {
  const { data, error } = await db.rpc(fn, args);
  if (error) return error.message;
  if (expect !== undefined && data !== expect) return `returned ${JSON.stringify(data)}`;
  return "ok";
};

/**
 * Function is reachable with these arguments. PostgREST matches overloads by
 * the exact argument set, so any error other than PGRST202 still proves the
 * function exists — e.g. the plate-search RPC raises "Unauthorized" for a
 * service-role caller because it has no auth.uid().
 */
const rpcExists = (fn, args) => async () => {
  const { error } = await db.rpc(fn, args);
  if (error && (error.code === "PGRST202" || error.code === "PGRST203")) {
    return `no such signature: ${error.message}`;
  }
  return "ok";
};

const token = () => `verify-${crypto.randomUUID()}`;

const CHECKS = [
  // ---- migration 03: secure plate search (the RPC takes p_query ONLY) ----
  {
    migration: "03",
    label: "find_vehicle_by_plate(p_query) is reachable",
    run: rpcExists("find_vehicle_by_plate", { p_query: "000000" }),
  },
  {
    migration: "03",
    label: "no stale 2-arg find_vehicle_by_plate(p_query, p_org_id)",
    run: async () => {
      const { error } = await db.rpc("find_vehicle_by_plate", {
        p_query: "000000",
        p_org_id: "00000000-0000-0000-0000-000000000000",
      });
      if (!error) return "a 2-arg overload exists — /api/search would resolve to the wrong signature";
      return error.code === "PGRST202" ? "ok" : `ok (${error.code || "error"})`;
    },
  },
  // ---- migration 07: visitor alerts, durable throttle, channel prefs ----
  {
    migration: "07",
    label: "parking_alerts.visitor_pass_id",
    run: column("parking_alerts", "id,visitor_pass_id"),
  },
  {
    migration: "07",
    label: "profiles.notification_channel + onboarded_at",
    run: column("profiles", "id,notification_channel,onboarded_at"),
  },
  {
    migration: "07",
    label: "alert_throttle table",
    run: column("alert_throttle", "permit_token"),
  },
  {
    migration: "07",
    label: "claim_alert_slot RPC",
    run: rpc("claim_alert_slot", { p_token: token(), p_window_seconds: 300 }, true),
  },
  // ---- migration 08: generic rate-limit buckets + timed escalation ----
  {
    migration: "08",
    label: "rate_limit_buckets table",
    run: column("rate_limit_buckets", "bucket,token"),
  },
  {
    migration: "08",
    label: "claim_rate_limit_slot RPC",
    run: rpc(
      "claim_rate_limit_slot",
      { p_bucket: "verify", p_token: token(), p_window_seconds: 60, p_max_hits: 1 },
      true
    ),
  },
  {
    migration: "08",
    label: "parking_alerts.escalated_at",
    run: column("parking_alerts", "id,escalated_at"),
  },
  {
    migration: "08",
    label: "unknown_vehicle_reports.matched_vehicle_id",
    run: column("unknown_vehicle_reports", "id,matched_vehicle_id"),
  },
];

console.log(`\n[harrik] schema verification — ${url}  (env: ${envFile})\n`);

const failed = [];
for (const check of CHECKS) {
  let detail;
  try {
    detail = await check.run();
  } catch (err) {
    detail = err?.message || String(err);
  }
  const ok = detail === "ok";
  if (!ok) failed.push(check);
  console.log(`  ${ok ? "✓" : "✗"} ${check.migration}  ${check.label}${ok ? "" : `\n        → ${detail}`}`);
}

const passed = CHECKS.length - failed.length;
console.log(`\n[harrik] ${passed}/${CHECKS.length} checks passed`);

if (failed.length) {
  const migrations = [...new Set(failed.map((f) => f.migration))].sort();
  console.error(
    `\n[harrik] migration(s) ${migrations.join(", ")} are NOT fully applied to this project.\n` +
      `         Local stack:  pnpm db:local:up\n` +
      `         Remote:       see docs/MIGRATION_08_REMOTE.md (CLI login, --db-url, or SQL Editor)\n`
  );
  // `process.exitCode` (not `process.exit`) lets pending sockets drain; calling
  // process.exit() here trips a libuv assertion on Windows.
  process.exitCode = 1;
} else {
  console.log("[harrik] schema is up to date.\n");
}
