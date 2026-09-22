"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Users, Car, ChevronRight } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { useDepartments } from "./useDepartments";
import type { DepartmentKind } from "@/types";

const KIND_ORDER: DepartmentKind[] = ["academic", "administrative", "support"];

/**
 * Quick-access strip: the tenant's units with how many people and vehicles sit
 * in each, so a security officer who does not know the plate can still get to
 * the owner ("someone from the science department blocked the gate").
 *
 * Counts only — no personal data — and it disappears entirely when the tenant
 * has no departments, so it never adds noise to the primary plate search.
 */
export function DepartmentStrip() {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const { departments, visits, recordVisit } = useDepartments();
  const [expanded, setExpanded] = useState(false);

  if (!departments || departments.length === 0) return null;

  // Units this operator actually opens come first, then teaching departments,
  // then by size — so the strip adapts to real usage instead of a fixed order.
  const sorted = [...departments].sort(
    (a, b) =>
      (visits[b.id] ?? 0) - (visits[a.id] ?? 0) ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      b.staffCount - a.staffCount ||
      a.name_ar.localeCompare(b.name_ar, "ar")
  );
  const visible = expanded ? sorted : sorted.slice(0, 6);
  const hiddenCount = sorted.length - visible.length;
  const hasPersonalOrder = Object.keys(visits).length > 0;

  return (
    <section className="mx-auto mt-14 w-full max-w-2xl" aria-labelledby="dept-strip-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="dept-strip-title"
            className="flex items-center gap-2 text-body font-bold text-slate-800 dark:text-slate-200 font-arabic"
          >
            <Building2 className="h-4 w-4 text-qatar" aria-hidden="true" />
            {L("تصفّح حسب القسم", "Browse by department")}
          </h2>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            {hasPersonalOrder
              ? L(
                  "مرتّبة حسب الأقسام اللي تفتحها أكتر.",
                  "Ordered by the units you open most."
                )
              : L(
                  "مش لاقي اللوحة؟ اوصل لصاحب المركبة من قسمه.",
                  "No plate number? Reach the owner through their department."
                )}
          </p>
        </div>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setExpanded(true);
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-caption font-bold text-qatar transition hover:bg-brand-soft dark:text-rose-300"
          >
            {L(`عرض الكل (${sorted.length})`, `Show all (${sorted.length})`)}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map((dept) => {
          const name = lang === "ar" ? dept.name_ar : dept.name_en;
          return (
            <Link
              key={dept.id}
              href={`/departments/${dept.id}`}
              onClick={() => {
                triggerHaptic("selection");
                recordVisit(dept.id);
              }}
              className="surface-card surface-card-hover group flex min-h-[52px] items-center gap-3 px-3.5 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-soft text-qatar dark:text-rose-300">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-caption font-bold text-slate-800 dark:text-slate-100">
                  {name}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-micro text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {dept.staffCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Car className="h-3 w-3" aria-hidden="true" />
                    {dept.vehicleCount}
                  </span>
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-300 transition rtl:rotate-180 group-hover:text-qatar dark:text-slate-600"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
