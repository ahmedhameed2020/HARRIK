"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Car, AlertTriangle, CheckCircle2, X } from "lucide-react";

interface UnknownReport {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  color: string;
  note: string;
  created_at: string;
  status: "open" | "identified" | "dismissed";
}

const SEED_UNKNOWN: UnknownReport[] = [
  {
    id: "60000000-0000-0000-0000-000000000001",
    plate_number: "883201",
    make: "Chevrolet",
    model: "Tahoe",
    color: "White",
    note: "متوقفة أمام بوابة الخروج الرئيسية للمدرسة وتكرر الوقوف مرتين",
    created_at: "اليوم 14:15",
    status: "open",
  },
  {
    id: "60000000-0000-0000-0000-000000000002",
    plate_number: "412093",
    make: "Mitsubishi",
    model: "Pajero",
    color: "Silver",
    note: "سيارة زائر بدون تصريح دخول المواقف الداخلية",
    created_at: "أمس 11:30",
    status: "open",
  },
];

export default function UnknownVehiclesPage() {
  const [reports, setReports] = useState<UnknownReport[]>(SEED_UNKNOWN);

  const handleDismiss = (id: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)));
  };

  const handleIdentify = (id: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "identified" } : r)));
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
          بلاغات السيارات التي بحث عنها الموظفون ولم تكن مسجلة في قاعدة بيانات المدرسة
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
                <span className="text-xs font-bold text-slate-500">
                  {report.make} {report.model} ({report.color})
                </span>
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
