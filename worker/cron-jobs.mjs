/**
 * حَرِّك | HARRIK — scheduled job routing.
 *
 * Kept separate from worker/index.mjs so it can be tested: index.mjs imports
 * the generated `.open-next/worker.js`, which only exists after a Cloudflare
 * build, and a unit test must not depend on a build artefact. Here the fetch
 * handler is a parameter, so the routing, the authentication header and the
 * failure handling can all be asserted directly.
 */

/** Keep these identical to `triggers.crons` in wrangler.jsonc. */
export const CRON_ESCALATE_STALE_ALERTS = "* * * * *";
export const CRON_DAILY_OPERATIONS_REPORT = "0 3 * * *";

/** Which route each schedule drives, and what to send it. */
export const CRON_JOBS = {
  [CRON_ESCALATE_STALE_ALERTS]: { path: "/api/alerts/escalate", body: {} },
  [CRON_DAILY_OPERATIONS_REPORT]: { path: "/api/reports/email", body: { days: 7 } },
};

/**
 * Runs the job registered for `cron`.
 *
 * The request is handed to the app's own fetch handler in-process rather than
 * sent over the network: there is no public URL to configure, and the shared
 * secret never leaves the isolate. Both target routes are excluded from the
 * session middleware and authenticate the caller themselves with CRON_SECRET.
 *
 * Never throws — a failing job must not take down the scheduled invocation,
 * and on a tick with several jobs the others still deserve to run.
 *
 * @returns {Promise<{status: "ok"|"skipped"|"failed"|"unregistered", reason?: string}>}
 */
export async function runScheduledJob({ cron, env, ctx, fetchHandler, log = console.log }) {
  const job = CRON_JOBS[cron];
  if (!job) {
    log(`[harrik cron] no job registered for "${cron}"`);
    return { status: "unregistered" };
  }

  const secret = env?.CRON_SECRET;
  if (!secret) {
    // Without the secret the route would reject the call as unauthenticated,
    // so say plainly what is missing instead of logging a 401 every minute.
    log(`[harrik cron] ${job.path} skipped: CRON_SECRET is not set`);
    return { status: "skipped", reason: "missing_secret" };
  }

  const request = new Request(`https://harrik.internal${job.path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-harrik-cron-secret": secret,
    },
    body: JSON.stringify(job.body),
  });

  try {
    const response = await fetchHandler(request, env, ctx);
    if (!response?.ok) {
      // Read the body so the reason reaches the logs, not just the status.
      const detail = await response?.text?.().catch(() => "");
      log(`[harrik cron] ${job.path} -> ${response?.status} ${(detail || "").slice(0, 300)}`);
      return { status: "failed", reason: `http_${response?.status}` };
    }
    log(`[harrik cron] ${job.path} -> ok`);
    return { status: "ok" };
  } catch (error) {
    log(`[harrik cron] ${job.path} failed: ${error?.message || error}`);
    return { status: "failed", reason: "threw" };
  }
}
