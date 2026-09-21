"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Car,
  Lock,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { QatarPlate } from "@/components/ui/QatarPlate";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";
import { useDepartments } from "@/features/departments/useDepartments";
import type { DepartmentSummary } from "@/types";

interface MemberVehicle {
  id: string;
  plateNumber: string;
  make: string | null;
  model: string | null;
  color: string | null;
  isPrimary: boolean;
}

interface DepartmentMember {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  employeeId: string | null;
  mobile: string | null;
  role: string;
  vehicles: MemberVehicle[];
}

const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  admin: { ar: "مدير", en: "Admin" },
  security: { ar: "أمن", en: "Security" },
  staff: { ar: "كادر", en: "Staff" },
  super_admin: { ar: "مشرف عام", en: "Super admin" },
};

/**
 * Department detail — everyone in the unit with the vehicles registered to
 * them, so an officer can move from "a car from the science department" to the
 * owner and act, without knowing the plate.
 *
 * The API already masks whatever the tenant's privacy mode hides; this screen
 * simply shows a lock instead of the masked value.
 */
export default function DepartmentPage() {
  const params = useParams<{ id: string }>();
  const { lang } = useLocale();
  const t = translations[lang];
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  const [department, setDepartment] = useState<DepartmentSummary | null>(null);
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [privacyMode, setPrivacyMode] = useState<string>("mode_a");
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [query, setQuery] = useState("");
  const { recordVisit } = useDepartments();

  // Deep links count too, so the home strip learns what this operator uses.
  useEffect(() => {
    if (params?.id) recordVisit(params.id);
  }, [params?.id, recordVisit]);

  useEffect(() => {
    if (!params?.id) return;
    let alive = true;
    setStatus("loading");
    fetch(`/api/departments/${params.id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.status === 404) return setStatus("missing");
        if (!res.ok || !json?.success) return setStatus("error");
        setDepartment(json.department);
        setMembers(json.members ?? []);
        setPrivacyMode(json.privacyMode ?? "mode_a");
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [params?.id]);

  const filtered = query.trim()
    ? members.filter((m) => {
        const haystack = [
          m.nameAr,
          m.nameEn,
          m.employeeId,
          ...m.vehicles.map((v) => v.plateNumber),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      })
    : members;

  const name = department
    ? lang === "ar"
      ? department.name_ar
      : department.name_en
    : "";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-caption font-bold text-slate-500 transition hover:text-qatar dark:text-slate-400"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        {L("رجوع للبحث", "Back to search")}
      </Link>

      {/* Header */}
      <header className="mt-4 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-qatar text-white shadow-float shadow-qatar/20">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="heading-page truncate font-arabic">
              {status === "ready" ? name : L("قسم", "Department")}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-slate-500 dark:text-slate-400">
              {department && (
                <>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {department.staffCount} {L("فرد", "people")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" aria-hidden="true" />
                    {department.vehicleCount} {L("مركبة", "vehicles")}
                  </span>
                  <span className="rounded-pill bg-slate-100 px-2 py-0.5 text-micro font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {department.kind === "administrative"
                      ? L("إداري", "Administrative")
                      : department.kind === "support"
                      ? L("خدمات مساندة", "Support")
                      : L("أكاديمي", "Academic")}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {privacyMode !== "mode_a" && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-micro font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {L("خصوصية مفعّلة", "Privacy enforced")}
          </span>
        )}
      </header>

      {/* Search inside the department */}
      {status === "ready" && members.length > 3 && (
        <div className="relative mt-5">
          <Search
            className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("ابحث بالاسم أو رقم اللوحة داخل القسم", "Search by name or plate in this department")}
            aria-label={L("بحث داخل القسم", "Search within the department")}
            className="field ps-10"
          />
        </div>
      )}

      {/* Members */}
      <div className="mt-5 space-y-3">
        {status === "loading" && (
          <div className="surface-card p-6" aria-busy="true">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-control bg-slate-200/80 dark:bg-slate-800/80" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "missing" && (
          <div className="surface-card px-6 py-16 text-center">
            <p className="text-body font-bold text-slate-800 dark:text-slate-200">
              {L("القسم غير موجود", "Department not found")}
            </p>
            <Link href="/" className="btn btn-secondary mt-4">
              {L("رجوع للبحث", "Back to search")}
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="surface-card px-6 py-16 text-center">
            <p className="text-body font-bold text-slate-800 dark:text-slate-200">
              {L("تعذّر تحميل بيانات القسم", "Could not load this department")}
            </p>
            <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">
              {L("حاول تحديث الصفحة.", "Try refreshing the page.")}
            </p>
          </div>
        )}

        {status === "ready" && members.length === 0 && (
          <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-body font-bold text-slate-800 dark:text-slate-200">
              {L("لا يوجد أفراد مسجّلون في هذا القسم", "Nobody is assigned to this department yet")}
            </p>
            <p className="mt-1 max-w-sm text-caption text-slate-500 dark:text-slate-400">
              {L(
                "عيّن الأفراد للقسم من دليل الأفراد ليظهروا هنا.",
                "Assign people to this department from the directory so they appear here."
              )}
            </p>
          </div>
        )}

        {status === "ready" && members.length > 0 && filtered.length === 0 && (
          <div className="surface-card px-6 py-12 text-center">
            <p className="text-body font-bold text-slate-800 dark:text-slate-200">
              {L("لا توجد نتائج مطابقة داخل القسم", "No matches inside this department")}
            </p>
            <button type="button" onClick={() => setQuery("")} className="btn btn-secondary mt-4">
              {L("مسح البحث", "Clear search")}
            </button>
          </div>
        )}

        {filtered.map((member) => {
          const memberName =
            (lang === "ar" ? member.nameAr : member.nameEn) ||
            member.nameAr ||
            member.nameEn ||
            L("فرد مصرح له", "Authorized member");
          const maskedName = !member.nameAr && !member.nameEn;
          const role = ROLE_LABEL[member.role] ?? { ar: member.role, en: member.role };

          return (
            <article key={member.id} className="surface-card surface-card-hover p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-caption font-bold text-qatar dark:text-rose-300">
                    {maskedName ? (
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      memberName.trim().charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="heading-card truncate font-arabic">{memberName}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-micro text-slate-500 dark:text-slate-400">
                      <span className="rounded-pill bg-slate-100 px-2 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {lang === "ar" ? role.ar : role.en}
                      </span>
                      {member.employeeId && <span className="font-mono">#{member.employeeId}</span>}
                      {!member.employeeId && maskedName && (
                        <span>{L("الهوية مخفية حسب إعدادات الخصوصية", "Identity hidden by privacy settings")}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Contact — only when privacy lets us show a number */}
                {member.mobile ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`tel:${member.mobile}`}
                      onClick={() => triggerHaptic("medium")}
                      aria-label={`${t.callAction} ${memberName}`}
                      className="flex h-11 w-11 items-center justify-center rounded-control border border-emerald-300/80 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <a
                      href={`https://wa.me/${member.mobile.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => triggerHaptic("medium")}
                      aria-label={`${t.whatsappAction} ${memberName}`}
                      className="flex h-11 w-11 items-center justify-center rounded-control bg-[#25d366] text-white transition hover:bg-[#20ba59]"
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                ) : (
                  <span
                    className="flex shrink-0 items-center gap-1.5 rounded-control border border-line px-2.5 py-2 text-micro font-bold text-slate-500 dark:text-slate-400"
                    title={L("التواصل المباشر مخفي", "Direct contact hidden")}
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    {L("بدون رقم", "No number")}
                  </span>
                )}
              </div>

              {/* Registered vehicles */}
              {member.vehicles.length > 0 ? (
                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3.5">
                  {member.vehicles.map((vehicle) => (
                    <span
                      key={vehicle.id}
                      className="flex items-center gap-2 rounded-control border border-line bg-surface-sunken/60 px-2.5 py-1.5"
                    >
                      <QatarPlate plateNumber={vehicle.plateNumber} size="sm" />
                      <span className="text-micro font-semibold text-slate-600 dark:text-slate-300">
                        {[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" ") || "—"}
                        {vehicle.isPrimary && (
                          <span className="ms-1.5 rounded-pill bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {t.primaryVehicle}
                          </span>
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3.5 border-t border-line pt-3.5 text-micro text-slate-500 dark:text-slate-400">
                  {L("لا توجد مركبات مسجّلة لهذا الفرد", "No vehicles registered for this person")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
