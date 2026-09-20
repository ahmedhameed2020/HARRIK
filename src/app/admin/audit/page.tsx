"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Filter, RefreshCw, CheckCircle2, FileText } from "lucide-react";
import { AuditLog } from "@/types";
import { triggerHaptic } from "@/lib/haptics";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdminAuditPage() {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");

  const fetchLogs = async () => {
    setIsLoading(true);
    triggerHaptic("light");
    try {
      let url = "/api/admin/audit?";
      if (actionFilter !== "ALL") url += `action=${actionFilter}&`;
      if (entityFilter !== "ALL") url += `entityType=${entityFilter}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, entityFilter]);

  const badgeClass = "rounded-full px-2.5 py-1 text-xs font-bold";

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create_staff":
        return <span className={`${badgeClass} bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>{L("إضافة موظف", "Add staff")}</span>;
      case "update_staff":
        return <span className={`${badgeClass} bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300`}>{L("تعديل موظف", "Edit staff")}</span>;
      case "toggle_staff_status":
        return <span className={`${badgeClass} bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300`}>{L("تغيير حالة موظف", "Toggle staff status")}</span>;
      case "create_vehicle":
        return <span className={`${badgeClass} bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>{L("إضافة سيارة", "Add vehicle")}</span>;
      case "update_vehicle":
        return <span className={`${badgeClass} bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300`}>{L("تعديل سيارة", "Edit vehicle")}</span>;
      case "reassign_vehicle":
        return <span className={`${badgeClass} bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300`}>{L("إعادة تعيين المالك", "Reassign owner")}</span>;
      case "create_department":
        return <span className={`${badgeClass} bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300`}>{L("إضافة قسم", "Add department")}</span>;
      default:
        return <span className={`${badgeClass} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>{action}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-qatar hover:underline mb-2 transition active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            <span>{L("العودة للوحة الإدارة", "Back to dashboard")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-qatar" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
              {L("سجل التدقيق والأمان والامتثال", "Security & Compliance Audit Log")}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {L(
              "سجل توثيقي للعمليات الإدارية الحساسة لحماية الخصوصية ومطابقة المعايير الأمنية",
              "A verifiable record of sensitive administrative operations for privacy and compliance"
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur transition active:scale-95 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
        >
          <RefreshCw className={`h-4 w-4 text-qatar ${isLoading ? "animate-spin" : ""}`} />
          <span>{L("تحديث السجل", "Refresh log")}</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ms-1">
          <Filter className="h-3.5 w-3.5" />
          <span>{L("تصفية:", "Filter:")}</span>
        </span>

        {[
          { id: "ALL", label: L("كافة العمليات", "All actions") },
          { id: "create_staff", label: L("إضافة موظف", "Add staff") },
          { id: "update_staff", label: L("تعديل موظف", "Edit staff") },
          { id: "create_vehicle", label: L("إضافة سيارة", "Add vehicle") },
          { id: "reassign_vehicle", label: L("إعادة تعيين مالك", "Reassign owner") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic("selection");
              setActionFilter(tab.id);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
              actionFilter === tab.id
                ? "bg-qatar text-white shadow-sm shadow-qatar/20"
                : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table / Cards */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-md overflow-hidden dark:border-slate-800/80 dark:bg-slate-900/80">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={4} />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              {L("لا توجد عمليات مسجلة تطابق التصفية", "No recorded actions match the filter")}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {L("كل العمليات الإدارية الحساسة تسجل هنا تلقائياً", "All sensitive administrative actions are logged here automatically")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <FileText className="h-4 w-4 text-qatar" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {L("بواسطة:", "By:")} {log.actor?.name_ar || log.actor?.name_en || L("مدير النظام", "System admin")}
                      </span>
                      {log.actor?.employee_id && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({L("رقم", "ID")}: {log.actor.employee_id})
                        </span>
                      )}
                    </div>
                    {(log.change_summary || log.new_values) && (() => {
                      const details: any = log.change_summary || log.new_values;
                      return (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {log.action === "create_vehicle" && L(`تمت إضافة اللوحة: ${details?.plate_number || details?.normalized_plate}`, `Plate added: ${details?.plate_number || details?.normalized_plate}`)}
                          {log.action === "reassign_vehicle" && L("تم إعادة تعيين ملكية السيارة", "Vehicle ownership reassigned")}
                          {log.action === "create_staff" && L(`تمت إضافة الموظف: ${details?.name_ar || ""} ${details?.employee_id ? `(رقم: ${details.employee_id})` : ""}`, `Staff added: ${details?.name_en || details?.name_ar || ""} ${details?.employee_id ? `(ID: ${details.employee_id})` : ""}`)}
                          {log.action === "update_staff" && L("تم تعديل بيانات الموظف بنجاح", "Staff record updated successfully")}
                          {log.action === "toggle_staff_status" && L("تم تعديل حالة تفعيل الحساب", "Account activation status changed")}
                          {log.action === "create_department" && L(`تمت إضافة قسم: ${details?.name_ar}`, `Department added: ${details?.name_en || details?.name_ar}`)}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-start sm:text-end text-[11px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString(lang === "ar" ? "ar-QA" : "en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
