/**
 * حَرِّك | HARRIK — Central error sink (§11.8).
 *
 * Provider-agnostic, privacy-first error reporting:
 *   • `SENTRY_DSN`        → sends an event to Sentry's store endpoint
 *   • `ERROR_WEBHOOK_URL` → POSTs a JSON payload to any collector
 *   • neither configured  → logs to the console only
 *
 * Everything is best-effort: reporting NEVER throws and never blocks a request.
 * All free-text is scrubbed for PII (phone numbers, e-mails, plates, tokens)
 * before it leaves the process.
 */

export interface ErrorContext {
  /** Logical location, e.g. "api/search" or "client/global-error". */
  scope?: string;
  route?: string;
  method?: string;
  /** Opaque identifiers only — never names, e-mails or phones. */
  userId?: string;
  organizationId?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

export { scrubText, scrubExtra } from "./scrub";

import { scrubText, scrubExtra } from "./scrub";

export interface NormalizedEvent {
  message: string;
  stack?: string;
  level: "error";
  timestamp: string;
  scope?: string;
  route?: string;
  method?: string;
  userId?: string;
  organizationId?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

export function normalizeError(error: unknown, context: ErrorContext = {}): NormalizedEvent {
  const err = error as any;
  return {
    message: scrubText(err?.message || err || "Unknown error"),
    stack: err?.stack ? scrubText(err.stack) : undefined,
    level: "error",
    timestamp: new Date().toISOString(),
    scope: context.scope,
    route: context.route ? scrubText(context.route) : undefined,
    method: context.method,
    userId: context.userId,
    organizationId: context.organizationId,
    digest: context.digest,
    extra: scrubExtra(context.extra),
  };
}

function sentryEndpoint(dsn: string): { url: string; auth: string } | null {
  try {
    // DSN: https://<publicKey>@<host>/<projectId>
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    const protocol = u.protocol === "http:" ? "http" : "https";
    return {
      url: `${protocol}://${u.host}/api/${projectId}/store/`,
      auth: `Sentry sentry_version=7, sentry_client=harrik/1.0, sentry_key=${publicKey}`,
    };
  } catch {
    return null;
  }
}

/**
 * Reports an error to the configured sink. Never throws.
 * Returns true when the event was accepted by a remote sink.
 */
export async function reportError(
  error: unknown,
  context: ErrorContext = {}
): Promise<boolean> {
  const event = normalizeError(error, context);

  // Always leave a local trace (useful in dev / when no sink is configured).
  try {
    console.error(`[harrik:${event.scope || "error"}] ${event.message}`, event.stack || "");
  } catch {
    // ignore
  }

  const dsn = process.env.SENTRY_DSN;
  const webhook = process.env.ERROR_WEBHOOK_URL;

  try {
    if (dsn) {
      const target = sentryEndpoint(dsn);
      if (target) {
        const res = await fetch(target.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Sentry-Auth": target.auth,
          },
          body: JSON.stringify({
            message: event.message,
            level: event.level,
            timestamp: event.timestamp,
            platform: "javascript",
            logger: event.scope,
            tags: {
              route: event.route,
              method: event.method,
              digest: event.digest,
            },
            user: event.userId ? { id: event.userId } : undefined,
            extra: { ...event.extra, organizationId: event.organizationId },
            exception: event.stack
              ? { values: [{ type: "Error", value: event.message }] }
              : undefined,
          }),
        });
        return res.ok;
      }
    }

    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: "harrik", ...event }),
      });
      return res.ok;
    }
  } catch {
    // Reporting must never break the caller.
    return false;
  }

  return false;
}

export function isErrorSinkConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN || process.env.ERROR_WEBHOOK_URL);
}
