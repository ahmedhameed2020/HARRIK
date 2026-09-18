"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Filter, RefreshCw, Calendar, User, FileText, CheckCircle2 } from "lucide-react";
import { AuditLog } from "@/types";
import { triggerHaptic } from "@/lib/haptics";

export default function AdminAuditPage() {
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
  }, [actionFilter, entityFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create_staff":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">إضافة موظف</span>;
      case "update_staff":
        return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">تعديل موظف</span>;
      case "toggle_staff_status":
        return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">تغيير حالة موظف</span>;
      case "create_vehicle":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">إضافة سيارة</span>;
      case "update_vehicle":
        return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">تعديل سيارة</span>;
      case "reassign_vehicle":
        return <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">إعادة تعيين المالك</span>;
      case "create_department":
        return <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">إضافة قسم</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{action}</span>;
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
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>العودة للوحة الإدارة</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-qatar" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
              سجل التدقيق والأمان والامتثال
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            سجل توثيقي للعمليات الإدارية الحساسة لحماية الخصوصية ومطابقة المعايير الأمنية
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur transition active:scale-95 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
        >
          <RefreshCw className={`h-4 w-4 text-qatar ${isLoading ? "animate-spin" : ""}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ms-1">
          <Filter className="h-3.5 w-3.5" />
          <span>تصفية:</span>
        </span>

        {[
          { id: "ALL", label: "كافة العمليات" },
          { id: "create_staff", label: "إضافة موظف" },
          { id: "update_staff", label: "تعديل موظف" },
          { id: "create_vehicle", label: "إضافة سيارة" },
          { id: "reassign_vehicle", label: "إعادة تعيين مالك" },
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
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-qatar" />
            <p className="mt-2 text-xs font-bold">جاري تحميل سجل التدقيق...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              لا توجد عمليات مسجلة تطابق التصفية
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              كل العمليات الإدارية الحساسة تسجل هنا تلقائياً
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
                        بواسطة: {log.actor?.name_ar || log.actor?.name_en || "مدير النظام"}
                      </span>
                      {log.actor?.employee_id && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          (رقم: {log.actor.employee_id})
                        </span>
                      )}
                    </div>
                    {(log.change_summary || log.new_values) && (() => {
                      const details = log.change_summary || log.new_values;
                      return (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {log.action === "create_vehicle" && `تمت إضافة اللوحة: ${details?.plate_number || details?.normalized_plate}`}
                          {log.action === "reassign_vehicle" && `تم إعادة تعيين ملكية السيارة`}
                          {log.action === "create_staff" && `تمت إضافة الموظف: ${details?.name_ar || ""} ${details?.employee_id ? `(رقم: ${details.employee_id})` : ""}`}
                          {log.action === "update_staff" && `تم تعديل بيانات الموظف بنجاح`}
                          {log.action === "toggle_staff_status" && `تم تعديل حالة تفعيل الحساب`}
                          {log.action === "create_department" && `تمت إضافة قسم: ${details?.name_ar}`}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-start sm:text-end text-[11px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString("ar-QA", {
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
