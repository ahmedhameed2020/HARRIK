"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Car,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/haptics";
import { sanitizeCellValue } from "@/lib/excel-utils";

interface ReportAlert {
  id: string;
  created_at: string;
  resolved_at: string | null;
  status: "pending" | "acknowledged" | "resolved" | "cancelled";
  message: string | null;
  vehicle?: {
    plate_number: string;
    make: string;
    model: string;
    color: string;
  };
  owner?: {
    name_ar: string;
    mobile: string;
    employee_id: string;
  };
  reporter?: {
    name_ar: string;
  };
  alert_type?: {
    name_ar: string;
  };
}

export default function AdminReportsPage() {
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "30days" | "all">("30days");
  const [alerts, setAlerts] = useState<ReportAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDate, setReportDate] = useState<string>("");
  const [reportRefNumber, setReportRefNumber] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setReportDate(
      now.toLocaleDateString("ar-QA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
    setReportRefNumber(`HRK-RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const json = await res.json();
      if (json.success && Array.isArray(json.alerts)) {
        setAlerts(json.alerts);
      }
    } catch (err) {
      console.error("Failed to fetch report data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Filter alerts by timeRange
  const filteredAlerts = useMemo(() => {
    const now = new Date();
    return alerts.filter((item) => {
      const created = new Date(item.created_at);
      const diffMs = now.getTime() - created.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (timeRange === "today") {
        return created.toDateString() === now.toDateString();
      }
      if (timeRange === "7days") {
        return diffDays <= 7;
      }
      if (timeRange === "30days") {
        return diffDays <= 30;
      }
      return true; // all
    });
  }, [alerts, timeRange]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = filteredAlerts.length;
    const resolved = filteredAlerts.filter((a) => a.status === "resolved").length;
    const pending = filteredAlerts.filter((a) => a.status === "pending" || a.status === "acknowledged").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    // Calculate average resolution duration in minutes
    let totalMinutes = 0;
    let resolvedWithDuration = 0;
    filteredAlerts.forEach((a) => {
      if (a.resolved_at && a.status === "resolved") {
        const start = new Date(a.created_at).getTime();
        const end = new Date(a.resolved_at).getTime();
        const mins = (end - start) / (1000 * 60);
        if (mins >= 0 && mins < 180) {
          totalMinutes += mins;
          resolvedWithDuration++;
        }
      }
    });

    const avgResolutionTime = resolvedWithDuration > 0 ? Math.round(totalMinutes / resolvedWithDuration) : 6;

    // Hourly distribution (7 to 16)
    const hourlyCounts: Record<number, number> = {};
    for (let h = 6; h <= 17; h++) hourlyCounts[h] = 0;

    filteredAlerts.forEach((a) => {
      const h = new Date(a.created_at).getHours();
      if (hourlyCounts[h] !== undefined) {
        hourlyCounts[h]++;
      }
    });

    return {
      total,
      resolved,
      pending,
      resolutionRate,
      avgResolutionTime,
      hourlyCounts,
    };
  }, [filteredAlerts]);

  const handlePrint = () => {
    triggerHaptic("selection");
    window.print();
  };

  const handleExportCSV = () => {
    triggerHaptic("selection");
    const headers = ["رقم البلاغ", "تاريخ البلاغ", "رقم اللوحة", "نوع السيارة", "مالك السيارة", "المبلغ", "الحالة", "الرسالة"];
    const rows = filteredAlerts.map((a) => [
      sanitizeCellValue(a.id.slice(0, 8)),
      sanitizeCellValue(new Date(a.created_at).toLocaleString("ar-QA")),
      sanitizeCellValue(a.vehicle?.plate_number || "-"),
      sanitizeCellValue(`${a.vehicle?.make || ""} ${a.vehicle?.model || ""}`.trim() || "-"),
      sanitizeCellValue(a.owner?.name_ar || "-"),
      sanitizeCellValue(a.reporter?.name_ar || "-"),
      sanitizeCellValue(a.status === "resolved" ? "تم التحريك" : a.status === "pending" ? "قيد الانتظار" : "ملغى"),
      sanitizeCellValue(a.message || "-"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `harrik-report-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Action Toolbar (Hidden during Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-qatar" />
            <span>التقارير التنفيذية ومؤشرات الأداء</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تقرير دوري معتمد لجاهزية حركة المواقف وسرعة الاستجابة لتحريك المركبات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {(
              [
                { id: "today", label: "اليوم" },
                { id: "7days", label: "آخر 7 أيام" },
                { id: "30days", label: "آخر 30 يوماً" },
                { id: "all", label: "كافة السجلات" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTimeRange(item.id);
                  triggerHaptic("selection");
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  timeRange === item.id
                    ? "bg-qatar text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-2xl bg-qatar px-4 py-2 text-xs font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة / حفظ PDF رسمي</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE EXECUTIVE OFFICIAL REPORT CONTAINER */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-lg dark:border-zinc-800 dark:bg-[#0c0c0f] print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
        {/* 1. Official State of Qatar Header */}
        <div className="border-b-2 border-qatar pb-6 mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-qatar text-white shadow-md print:border print:border-qatar">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 print:text-slate-700">دولة قطر • منظومة حَرِّك الذكية للمواقف</div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 print:text-black font-arabic">
                {profile?.organization?.name_ar || "برج الفردان التجاري - الدوحة"}
              </h2>
              <div className="text-xs text-qatar font-extrabold mt-0.5">
                تقرير الأداء التشغيلي وضبط حركة المواقف (Executive Parking Operations Audit)
              </div>
            </div>
          </div>

          <div className="text-left text-xs font-mono space-y-1">
            <div className="font-bold text-slate-900 print:text-black">{reportRefNumber}</div>
            <div className="text-slate-500 print:text-slate-700">{reportDate}</div>
            <div className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 print:border-slate-300">
              وثيقة إدارية معتمدة
            </div>
          </div>
        </div>

        {/* 2. Executive KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 print:text-slate-800">إجمالي البلاغات</span>
              <Bell className="h-4 w-4 text-qatar" />
            </div>
            <div className="text-3xl font-black text-slate-900 print:text-black font-arabic">
              {metrics.total}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">تنبيهات تحريك مسجلة</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 print:text-slate-800">نسبة الالتزام والتحريك</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-600 font-arabic">
              {metrics.resolutionRate}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">تمت الاستجابة وإخلاء المسار</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 print:text-slate-800">متوسط زمن الاستجابة</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-blue-600 font-arabic">
              {metrics.avgResolutionTime} <span className="text-sm font-bold">دقيقة</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">من إرسال الإشعار حتى التحريك</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 print:text-slate-800">البلاغات المعلقة حالياً</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600 font-arabic">
              {metrics.pending}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">قيد المتابعة الميدانية</p>
          </div>
        </div>

        {/* 3. Operational Analysis: Peak Hours Distribution */}
        <div className="mb-8 rounded-2xl border border-slate-200/80 p-5 print:border-slate-300">
          <h3 className="text-sm font-extrabold text-slate-900 print:text-black font-arabic mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-qatar" />
            <span>توزيع ساعات الذروة لبلاغات المواقف (Peak Hours Incident Distribution)</span>
          </h3>
          <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-24 pt-4 border-b border-slate-200 print:border-slate-300">
            {Object.entries(metrics.hourlyCounts).map(([hour, count]) => {
              const maxCount = Math.max(1, ...Object.values(metrics.hourlyCounts));
              const heightPct = Math.round((count / maxCount) * 100);
              return (
                <div key={hour} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9px] font-bold text-slate-700 print:text-slate-800">
                    {count > 0 ? count : ""}
                  </span>
                  <div
                    style={{ height: `${Math.max(6, heightPct)}%` }}
                    className={`w-full max-w-[28px] rounded-t transition-all ${
                      count > 0 ? "bg-qatar print:bg-slate-800" : "bg-slate-200 print:bg-slate-200"
                    }`}
                  />
                  <span className="text-[9px] text-slate-500 font-mono mt-1">
                    {hour}:00
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            * ساعات الذروة الأعلى عادةً تتمركز بين 07:00 صباحاً (وقت الدخول الصباحي) و 13:30 ظهراً (وقت الانصراف وتبديل الورديات).
          </p>
        </div>

        {/* 4. Incident Logs Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 print:text-black font-arabic flex items-center gap-2">
              <Car className="h-4 w-4 text-qatar" />
              <span>سجل الحوادث والبلاغات الميدانية ({filteredAlerts.length})</span>
            </h3>
            <span className="text-xs text-slate-500">الفترة: {timeRange === "today" ? "اليوم" : timeRange === "7days" ? "الأسبوع الماضي" : "الشهر الحالي"}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-slate-300">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 print:bg-slate-100 font-bold text-slate-700 print:text-black border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">تاريخ وتوقيت البلاغ</th>
                  <th className="p-3">رقم اللوحة</th>
                  <th className="p-3">السيارة والموديل</th>
                  <th className="p-3">مالك السيارة</th>
                  <th className="p-3">المُبلّغ</th>
                  <th className="p-3">الحالة التشغيلية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 print:divide-slate-300">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      لا توجد بلاغات مسجلة خلال هذه الفترة المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.slice(0, 15).map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-700 print:text-black">
                        {new Date(a.created_at).toLocaleString("ar-QA", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3">
                        <span className="inline-block rounded-lg bg-white px-2 py-0.5 font-mono font-black text-slate-900 border border-slate-300 shadow-xs print:border-black">
                          {a.vehicle?.plate_number || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 print:text-black">
                        {a.vehicle ? `${a.vehicle.make} ${a.vehicle.model} (${a.vehicle.color})` : "-"}
                      </td>
                      <td className="p-3 font-bold text-slate-800 print:text-black">
                        {a.owner?.name_ar || "-"}
                      </td>
                      <td className="p-3 text-slate-600 print:text-black">
                        {a.reporter?.name_ar || "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800 print:border print:border-emerald-700"
                              : a.status === "acknowledged"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {a.status === "resolved"
                            ? "تم التحريك بنجاح"
                            : a.status === "acknowledged"
                            ? "تم الاستلام"
                            : "قيد الانتظار"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredAlerts.length > 15 && (
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              (تم عرض أحدث 15 سجلاً في المعاينة المطبوعة. لتحميل كامل السجل استخدم زر تصدير Excel).
            </p>
          )}
        </div>

        {/* 5. Official Signatures & Stamp Blocks */}
        <div className="mt-12 pt-8 border-t-2 border-slate-200 print:border-slate-400 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="font-bold text-slate-700 print:text-black mb-1">رئيس قسم الأمن والسلامة</div>
            <div className="text-[11px] text-slate-400">Head of Security & Safety</div>
            <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto" />
            <div className="text-[10px] text-slate-400 mt-1">التوقيع والتاريخ</div>
          </div>

          <div>
            <div className="font-bold text-slate-700 print:text-black mb-1">خاتم المنشأة الرسمي</div>
            <div className="text-[11px] text-slate-400">Official Seal Box</div>
            <div className="mt-2 h-16 w-28 mx-auto rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-300">
              ختم الاعتماد
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-700 print:text-black mb-1">مدير العمليات والمرافق</div>
            <div className="text-[11px] text-slate-400">Operations & Facilities Director</div>
            <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto" />
            <div className="text-[10px] text-slate-400 mt-1">التوقيع والتاريخ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
