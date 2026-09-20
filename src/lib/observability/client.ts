/**
 * حَرِّك | HARRIK — Browser-side error reporter (§11.8).
 *
 * Forwards client errors to /api/observability/report where they are funnelled
 * into the configured sink. Uses `sendBeacon` when available so reports survive
 * page unload, with a `fetch(keepalive)` fallback. Never throws.
 */

import { scrubText, scrubExtra } from "./scrub";

export interface ClientErrorContext {
  scope?: string;
  route?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

const REPORT_ENDPOINT = "/api/observability/report";

export function reportClientError(error: unknown, context: ClientErrorContext = {}): void {
  if (typeof window === "undefined") return;

  try {
    const err = error as any;
    const payload = {
      scope: context.scope || "client",
      route: context.route || window.location.pathname,
      digest: context.digest,
      message: scrubText(err?.message || err || "Unknown client error"),
      stack: err?.stack ? scrubText(err.stack) : undefined,
      userAgent: scrubText(navigator.userAgent),
      extra: scrubExtra(context.extra),
    };

    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(REPORT_ENDPOINT, blob)) return;
    }

    fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Reporting must never surface to the user.
    });
  } catch {
    // ignore
  }
}
