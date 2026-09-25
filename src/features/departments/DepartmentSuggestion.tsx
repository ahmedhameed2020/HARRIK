"use client";

import React from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { useDepartments } from "./useDepartments";

/**
 * Shown when a plate lookup returns nothing: instead of a dead end, offer the
 * department route ("the car belongs to someone from the science department").
 * Renders nothing when the tenant has no departments to offer.
 */
export function DepartmentSuggestion({ limit = 5 }: { limit?: number }) {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const { departments } = useDepartments();

  if (!departments || departments.length === 0) return null;

  const suggestions = [...departments]
    .sort((a, b) => b.staffCount - a.staffCount)
    .slice(0, limit);

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-soft text-qatar dark:text-qatar-300">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-body font-bold text-slate-800 dark:text-slate-100 font-arabic">
            {L("مفيش نتيجة باللوحة؟ جرّب القسم", "No plate match? Try the department")}
          </p>
          <p className="text-caption text-slate-500 dark:text-slate-400">
            {L(
              "لو عارف إن العربية لحد في قسم معيّن، افتح القسم ووصل لصاحبها.",
              "If you know the unit the owner belongs to, open it and reach them directly."
            )}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {suggestions.map((dept) => (
          <Link
            key={dept.id}
            href={`/departments/${dept.id}`}
            onClick={() => triggerHaptic("selection")}
            className="flex min-h-[44px] items-center gap-2 rounded-control border border-line bg-surface-sunken/50 px-3.5 text-caption font-bold text-slate-700 transition hover:border-qatar/40 hover:text-qatar dark:text-slate-200"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="truncate">{lang === "ar" ? dept.name_ar : dept.name_en}</span>
            <span className="text-micro font-semibold text-slate-400">{dept.staffCount}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
