"use client";

import React from "react";
import Link from "next/link";
import { Car, ArrowRight } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";

export default function NotFound() {
  const { lang, dir } = useLocale();
  const t = translations[lang];

  return (
    <div dir={dir} className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-qatar text-white shadow-xl shadow-qatar/25">
        <Car className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-3xl font-black text-slate-900 dark:text-white font-arabic">404</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t.notFoundBody}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-qatar px-5 py-3 text-sm font-bold text-white shadow-md shadow-qatar/25 transition hover:bg-qatar-800"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>{t.notFoundHome}</span>
      </Link>
    </div>
  );
}
