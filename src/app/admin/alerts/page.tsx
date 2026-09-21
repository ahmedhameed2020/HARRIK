"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, Download } from "lucide-react";
import { ParkingAlert } from "@/types";
import { QatarPlate } from "@/components/ui/QatarPlate";
import { exportAlertsToExcel } from "@/lib/excel-utils";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";

export default function ParkingAlertsManagerPage() {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
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

  const statusLabel = (status: string) =>
    status === "pending"
      ? L("بانتظار الاستجابة", "Awaiting response")
      : status === "acknowledged"
      ? L("تمت الاستجابة", "Acknowledged")
      : L("تم تحريك السيارة", "Vehicle moved");

  return (
    <div className="relative min-h-screen">
      <div className="ambient-glow-qatar top-10 start-10 opacity-60" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 mb-2 inline-flex min-h-[44px] items-center text-caption font-bold text-qatar transition hover:underline active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span>{L("العودة للوحة الإدارة", "Back to dashboard")}</span>
            </Link>
            <h1 className="heading-page font-arabic">
              {L("إدارة ومتابعة تنبيهات المواقف (Parking Alerts)", "Parking Alerts Management")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {L(
                "متابعة بلاغات حجز السيارات والأنوار المفتوحة ووقت الحل في المواقف",
                "Track blocking incidents, open lights and resolution time"
              )}
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
              <span>{L("تصدير إلى Excel (.xlsx)", "Export to Excel (.xlsx)")}</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic("light");
                fetchAlerts();
              }}
              className="glass-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>{L("تحديث الحالات", "Refresh")}</span>
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
            {tab === "ALL" ? L("الكل", "All") : statusLabel(tab)}
          </button>
        ))}
      </div>

      {/* Alerts — cards on phones, table from md up */}
      <div className="space-y-3 md:hidden">
        {filtered.map((alert) => (
          <article key={alert.id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <QatarPlate plateNumber={alert.vehicle?.plate_number || "482731"} size="sm" />
                <p className="mt-2 text-caption font-bold text-slate-800 dark:text-slate-100 font-arabic">
                  {alert.message || L("سيارتك حاجزة سيارتي", "Blocking my vehicle")}
                </p>
                <p className="mt-1 text-caption text-slate-500 dark:text-slate-400 font-arabic">
                  {alert.owner?.name_ar || L("مالك مسجل", "Registered owner")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-pill px-2.5 py-1 text-caption font-bold ${
                  alert.status === "pending"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    : alert.status === "acknowledged"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                }`}
              >
                {statusLabel(alert.status)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-caption text-slate-500 dark:text-slate-400">
              <span className="font-mono font-bold">
                {new Date(alert.created_at).toLocaleTimeString(lang === "ar" ? "ar-QA" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {alert.resolved_at ? L("مُحلّة", "Resolved") : "—"}
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="glass-panel hidden overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm md:block dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="border-b bg-slate-100/70 text-xs font-bold text-slate-600 dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3.5 text-start">{L("اللوحة", "Plate")}</th>
                <th className="px-5 py-3.5 text-start">{L("نوع التنبيه", "Alert type")}</th>
                <th className="px-5 py-3.5 text-start">{L("مالك السيارة", "Owner")}</th>
                <th className="px-5 py-3.5 text-start">{L("الحالة", "Status")}</th>
                <th className="px-5 py-3.5 text-start">{L("تاريخ البلاغ", "Reported at")}</th>
                <th className="px-5 py-3.5 text-start">{L("مدة الحل", "Resolution time")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
              {filtered.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                  <td className="px-5 py-4 font-mono font-black text-slate-900 dark:text-white">
                    {alert.vehicle?.plate_number || "482731"}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    {alert.message || L("سيارتك حاجزة سيارتي", "Blocking my vehicle")}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 font-arabic">
                    {alert.owner?.name_ar || L("أحمد حسن", "Registered owner")}
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
                      {statusLabel(alert.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                    {new Date(alert.created_at).toLocaleTimeString(lang === "ar" ? "ar-QA" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono font-bold text-emerald-600">
                    {alert.resolved_at ? L("3 د 45 ث", "3m 45s") : "—"}
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
