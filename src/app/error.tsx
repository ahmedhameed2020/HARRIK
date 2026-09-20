"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";
import { reportClientError } from "@/lib/observability/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang, dir } = useLocale();
  const t = translations[lang];

  useEffect(() => {
    reportClientError(error, {
      scope: "client/error-boundary",
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div dir={dir} className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600 dark:bg-red-950/40">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-xl font-black text-slate-900 dark:text-white font-arabic">{t.errTitle}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t.errBody}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-2xl bg-qatar px-5 py-3 text-sm font-bold text-white shadow-md shadow-qatar/25 transition hover:bg-qatar-800"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{t.errRetry}</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <Home className="h-4 w-4" />
          <span>{t.errHome}</span>
        </Link>
      </div>
    </div>
  );
}
