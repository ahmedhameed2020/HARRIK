/**
 * حَرِّك | HARRIK — scheduled job routing.
 *
 * The escalation job is a safety net: when a blocked car's owner cannot be
 * reached, this is what tells the security team. Before the worker gained a
 * `scheduled()` export it only ran when somebody happened to open the app, so
 * the routing below is the part that must not silently break.
 *
 * A Cloudflare cron cannot be exercised from a unit test, but everything that
 * decides what it *does* can be: which route each schedule drives, that the
 * shared secret is attached, that a missing secret is reported rather than
 * firing an unauthenticated call every minute, and that one failing job never
 * throws out of the handler.
 */
import { describe, it, expect, vi } from "vitest";
import {
  runScheduledJob,
  CRON_ESCALATE_STALE_ALERTS,
  CRON_DAILY_OPERATIONS_REPORT,
  CRON_JOBS,
} from "../../worker/cron-jobs.mjs";

const env = { CRON_SECRET: "test-secret" };
const ctx = {};
const silent = () => {};

function okHandler() {
  return vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
}

describe("scheduled job routing", () => {
  it("drives the escalation route with the cron secret attached", async () => {
    const fetchHandler = okHandler();

    const result = await runScheduledJob({
      cron: CRON_ESCALATE_STALE_ALERTS,
      env,
      ctx,
      fetchHandler,
      log: silent,
    });

    expect(result).toEqual({ status: "ok" });
    expect(fetchHandler).toHaveBeenCalledTimes(1);

    const request: Request = fetchHandler.mock.calls[0][0];
    expect(new URL(request.url).pathname).toBe("/api/alerts/escalate");
    expect(request.method).toBe("POST");
    // Without this header the route treats the call as unauthenticated and the
    // escalation silently never happens.
    expect(request.headers.get("x-harrik-cron-secret")).toBe("test-secret");
  });

  it("drives the daily report route", async () => {
    const fetchHandler = okHandler();

    await runScheduledJob({
      cron: CRON_DAILY_OPERATIONS_REPORT,
      env,
      ctx,
      fetchHandler,
      log: silent,
    });

    const request: Request = fetchHandler.mock.calls[0][0];
    expect(new URL(request.url).pathname).toBe("/api/reports/email");
    expect(await request.json()).toEqual({ days: 7 });
  });

  it("skips, and says why, when CRON_SECRET is not configured", async () => {
    const fetchHandler = okHandler();
    const log = vi.fn();

    const result = await runScheduledJob({
      cron: CRON_ESCALATE_STALE_ALERTS,
      env: {},
      ctx,
      fetchHandler,
      log,
    });

    expect(result).toEqual({ status: "skipped", reason: "missing_secret" });
    // Calling the route without the secret would just produce a 401 a minute.
    expect(fetchHandler).not.toHaveBeenCalled();
    expect(log.mock.calls[0][0]).toContain("CRON_SECRET");
  });

  it("reports an unregistered schedule instead of calling anything", async () => {
    const fetchHandler = okHandler();

    const result = await runScheduledJob({
      cron: "30 4 * * 6",
      env,
      ctx,
      fetchHandler,
      log: silent,
    });

    expect(result).toEqual({ status: "unregistered" });
    expect(fetchHandler).not.toHaveBeenCalled();
  });

  it("never throws when the route fails, so the invocation survives", async () => {
    const throwing = vi.fn().mockRejectedValue(new Error("supabase unreachable"));

    const result = await runScheduledJob({
      cron: CRON_ESCALATE_STALE_ALERTS,
      env,
      ctx,
      fetchHandler: throwing,
      log: silent,
    });

    expect(result).toEqual({ status: "failed", reason: "threw" });
  });

  it("reports a non-2xx response as failed", async () => {
    const failing = vi
      .fn()
      .mockResolvedValue(new Response("email provider not configured", { status: 503 }));

    const result = await runScheduledJob({
      cron: CRON_DAILY_OPERATIONS_REPORT,
      env,
      ctx,
      fetchHandler: failing,
      log: silent,
    });

    expect(result).toEqual({ status: "failed", reason: "http_503" });
  });
});

describe("cron registry", () => {
  it("registers exactly the schedules wrangler.jsonc triggers", async () => {
    // Drift here is silent in production: wrangler fires a cron that the
    // handler does not recognise, and the job simply never runs.
    const fs = await import("node:fs");
    const config = fs.readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8");
    const withoutComments = config.replace(/^\s*\/\/.*$/gm, "");
    const { triggers } = JSON.parse(withoutComments);

    expect(triggers?.crons).toBeDefined();
    expect([...triggers.crons].sort()).toEqual([...Object.keys(CRON_JOBS)].sort());
  });
});
