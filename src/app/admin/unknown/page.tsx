"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface UnknownReport {
  id: string;
  plate_number: string;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  note?: string | null;
  created_at: string;
  status: "open" | "identified" | "dismissed";
  reporter?: { name_ar?: string; name_en?: string; employee_id?: string } | null;
}

export default function UnknownVehiclesPage() {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [reports, setReports] = useState<UnknownReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Promote-to-registered state
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteReport, setPromoteReport] = useState<UnknownReport | null>(null);
  const [promoteOwnerId, setPromoteOwnerId] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [staffOptions, setStaffOptions] = useState<Array<{ id: string; name_ar: string; name_en: string; employee_id: string }>>([]);

  const PAGE_SIZE = 50;

  const fetchReports = async (offset = 0, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      const res = await fetch(`/api/unknown?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports((prev) => {
          if (!append) return data.reports;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...data.reports.filter((r: UnknownReport) => !seen.has(r.id))];
        });
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      // Handled
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = async (id: string) => {
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/unknown", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "dismissed" }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)));
      }
    } catch {
      // Handled
    }
  };

  // ------------------ Promote report → registered vehicle ------------------
  const openPromote = async (report: UnknownReport) => {
    triggerHaptic("selection");
    setPromoteReport(report);
    setPromoteOwnerId("");
    setPromoteError(null);
    setIsPromoteOpen(true);

    if (staffOptions.length === 0) {
      try {
        const res = await fetch("/api/admin/staff");
        const data = await res.json();
        if (data.success && Array.isArray(data.staff)) setStaffOptions(data.staff);
      } catch {
        // Options stay empty; the vehicle can still be registered unassigned.
      }
    }
  };

  const handlePromote = async () => {
    if (!promoteReport) return;
    setPromoteBusy(true);
    setPromoteError(null);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/unknown/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: promoteReport.id,
          ownerId: promoteOwnerId || null,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        triggerHaptic("success");
        const promotedId = promoteReport.id;
        setIsPromoteOpen(false);
        setPromoteReport(null);
        setReports((prev) => prev.map((r) => (r.id === promotedId ? { ...r, status: "identified" } : r)));
      } else {
        triggerHaptic("error");
        setPromoteError(json.error || L("تعذّر تسجيل المركبة", "Could not register the vehicle"));
      }
    } catch {
      triggerHaptic("error");
      setPromoteError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setPromoteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          <span>{L("العودة للوحة الإدارة", "Back to dashboard")}</span>
        </Link>
        <h1 className="heading-page font-arabic">
          {L("السيارات غير المعروفة (Unknown Vehicles)", "Unknown Vehicles")}
        </h1>
        <p className="text-xs text-slate-500">
          {L(
            "بلاغات السيارات غير المسجلة في قاعدة بيانات المنشأة",
            "Reports of vehicles not registered in the organization database"
          )}
        </p>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-black text-slate-950 dark:text-white">
                  {L("لوحة", "Plate")}: {report.plate_number}
                </span>
                {(report.vehicle_make || report.vehicle_model || report.vehicle_color) && (
                  <span className="text-xs font-bold text-slate-500">
                    {report.vehicle_make} {report.vehicle_model} {report.vehicle_color ? `(${report.vehicle_color})` : ""}
                  </span>
                )}
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  report.status === "open"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                    : report.status === "identified"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {report.status === "open"
                  ? L("معلق للمراجعة", "Pending review")
                  : report.status === "identified"
                  ? L("تم تحديد المالك", "Owner identified")
                  : L("تم الاستبعاد", "Dismissed")}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 font-arabic">{report.note}</p>

            <div className="mt-4 flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">{report.created_at}</span>

              {report.status === "open" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDismiss(report.id)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {L("استبعاد", "Dismiss")}
                  </button>
                  <button
                    onClick={() => openPromote(report)}
                    className="rounded-xl bg-qatar px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-qatar-900"
                  >
                    {L("تسجيل وربط بالمالك", "Register & link owner")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Server-side pagination */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchReports(reports.length, true)}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {isLoadingMore ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-qatar" /> : null}
            <span>{L("تحميل المزيد", "Load more")}</span>
          </button>
        </div>
      )}
      {/* Promote report → registered vehicle */}
      <BottomSheet
        isOpen={isPromoteOpen}
        onClose={() => setIsPromoteOpen(false)}
        title={L("تسجيل المركبة في الدليل", "Register the vehicle in the directory")}
        subtitle={
          promoteReport
            ? `${L("اللوحة", "Plate")}: ${promoteReport.plate_number}`
            : undefined
        }
      >
        <div className="space-y-4">
          {promoteError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{promoteError}</span>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {L(
              "سيتم إنشاء سجل مركبة جديد بهذه اللوحة في دليل المركبات، وربطه بالمالك المحدد (اختياري)، ثم إغلاق البلاغ.",
              "A new vehicle record will be created in the directory for this plate, linked to the selected owner (optional), and the report will be closed."
            )}
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {L("المالك (اختياري)", "Owner (optional)")}
            </label>
            <select
              value={promoteOwnerId}
              onChange={(e) => setPromoteOwnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{L("بدون مالك", "No owner")}</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en || s.name_ar} (#{s.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPromoteOpen(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              {L("إلغاء", "Cancel")}
            </button>
            <button
              type="button"
              onClick={handlePromote}
              disabled={promoteBusy}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-qatar px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition hover:bg-qatar-800 disabled:opacity-50"
            >
              {promoteBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>{L("تسجيل المركبة", "Register vehicle")}</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
