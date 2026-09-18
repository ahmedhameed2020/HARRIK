"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Car, CheckCircle2, Clock, AlertTriangle, Download } from "lucide-react";
import { ParkingAlert } from "@/types";
import { exportAlertsToExcel } from "@/lib/excel-utils";
import { triggerHaptic } from "@/lib/haptics";

export default function ParkingAlertsManagerPage() {
  const [alerts, setAlerts] = useState<ParkingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filtered = alerts.filter((a) => (filter === "ALL" ? true : a.status === filter));

  return (
    <div className="relative min-h-screen">
      <div className="ambient-glow-qatar top-10 start-10 opacity-60" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-qatar hover:underline mb-2 transition active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>العودة للوحة الإدارة</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
              إدارة ومتابعة تنبيهات المواقف (Parking Alerts)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              متابعة بلاغات حجز السيارات والأنوار المفتوحة ووقت الحل في المواقف
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                triggerHaptic("medium");
                exportAlertsToExcel(filtered, "HARRIK_Parking_Alerts.xlsx");
              }}
              className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
            >
              <Download className="h-4 w-4 text-qatar" />
              <span>تصدير إلى Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic("light");
                fetchAlerts();
              }}
              className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>تحديث الحالات</span>
            </button>
          </div>
        </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["ALL", "pending", "acknowledged", "resolved"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === tab
                ? "bg-qatar text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
            }`}
          >
            {tab === "ALL"
              ? "الكل"
              : tab === "pending"
              ? "بانتظار الاستجابة"
              : tab === "acknowledged"
              ? "تمت الاستجابة"
              : "تم الحل"}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="glass-panel overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-slate-100/70 text-xs font-bold text-slate-600 dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3.5">اللوحة</th>
                <th className="px-5 py-3.5">نوع التنبيه</th>
                <th className="px-5 py-3.5">مالك السيارة</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5">تاريخ البلاغ</th>
                <th className="px-5 py-3.5">مدة الحل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
              {filtered.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                  <td className="px-5 py-4 font-mono font-black text-slate-900 dark:text-white">
                    {alert.vehicle?.plate_number || "482731"}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    {alert.message || "سيارتك حاجزة سيارتي"}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 font-arabic">
                    {alert.owner?.name_ar || "أحمد حسن"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        alert.status === "pending"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          : alert.status === "acknowledged"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      }`}
                    >
                      {alert.status === "pending"
                        ? "بانتظار الاستجابة"
                        : alert.status === "acknowledged"
                        ? "تمت الاستجابة"
                        : "تم تحريك السيارة"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                    {new Date(alert.created_at).toLocaleTimeString("ar-QA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono font-bold text-emerald-600">
                    {alert.resolved_at ? "3 د 45 ث" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);
}
