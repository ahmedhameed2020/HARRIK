"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/observability/client";

/**
 * Root error boundary — catches errors thrown while rendering the root layout
 * (where AppShell/LocaleProvider are unavailable) and reports them to the
 * central sink. Styling is inlined deliberately: global CSS may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, {
      scope: "client/global-error",
      digest: error?.digest,
    });
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            "IBM Plex Sans Arabic, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 20px",
              borderRadius: 20,
              background: "#8A1538",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 20px", lineHeight: 1.7 }}>
            نعتذر عن الإزعاج. يمكنك إعادة المحاولة، وإن استمرت المشكلة تواصل مع إدارة المنشأة.
            <br />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              Something went wrong. Please try again.
            </span>
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#8A1538",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "12px 22px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              إعادة المحاولة
            </button>
            <Link
              href="/"
              style={{
                background: "#fff",
                color: "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 22px",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              الصفحة الرئيسية
            </Link>
          </div>

          {error?.digest && (
            <p style={{ marginTop: 18, fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
