"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

/**
 * Captures uncaught browser errors and unhandled promise rejections and
 * forwards them to the central sink. Renders nothing.
 */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError(event.error || event.message, {
        scope: "client/window-error",
        extra: {
          source: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      reportClientError(reason?.message || reason || "Unhandled promise rejection", {
        scope: "client/unhandled-rejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
