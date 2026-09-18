"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Car, AlertTriangle, CheckCircle2, X, RefreshCw } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

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
  const [reports, setReports] = useState<UnknownReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/unknown");
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
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

  const handleIdentify = async (id: string) => {
    triggerHaptic("success");
    try {
      const res = await fetch("/api/unknown", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "identified" }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "identified" } : r)));
      }
    } catch {
      // Handled
    }
  };


  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>العودة للوحة الإدارة</span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
          السيارات غير المعروفة (Unknown Vehicles)
        </h1>
        <p className="text-xs text-slate-500">
          بلاغات السيارات غير المسجلة في قاعدة بيانات المنشأة
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
                  لوحة: {report.plate_number}
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
                {report.status === "open" ? "معلق للمراجعة" : report.status === "identified" ? "تم تحديد المالك" : "تم الاستبعاد"}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 font-arabic">
              {report.note}
            </p>

            <div className="mt-4 flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">{report.created_at}</span>

              {report.status === "open" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDismiss(report.id)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    استبعاد
                  </button>
                  <button
                    onClick={() => handleIdentify(report.id)}
                    className="rounded-xl bg-qatar px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-qatar-900"
                  >
                    تسجيل وربط بالمالك
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
