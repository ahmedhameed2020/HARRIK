/**
 * حَرِّك | HARRIK — Next.js instrumentation hook.
 *
 * Centralised server-side error reporting: every unhandled error thrown from a
 * route handler, server component or middleware is funnelled into the error
 * sink (§11.8) without touching individual routes.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import { reportError, isErrorSinkConfigured } from "@/lib/observability/error-sink";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!isErrorSinkConfigured()) {
      console.info(
        "[harrik] Error sink not configured (SENTRY_DSN / ERROR_WEBHOOK_URL). Errors are logged locally only."
      );
    }
  }
}

export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string; headers?: Record<string, string | undefined> },
  context: {
    routerKind?: string;
    routePath?: string;
    routeType?: string;
    renderSource?: string;
  }
) {
  try {
    // Never forward raw headers or query strings — they may carry tokens/PII.
    await reportError(error, {
      scope: `server/${context?.routeType || "request"}`,
      route: context?.routePath || request?.path,
      method: request?.method,
      extra: {
        routerKind: context?.routerKind,
        renderSource: context?.renderSource,
      },
    });
  } catch {
    // Reporting must never break the request lifecycle.
  }
}
