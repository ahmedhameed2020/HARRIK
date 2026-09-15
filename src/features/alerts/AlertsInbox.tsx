"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, Clock, Car, RefreshCw } from "lucide-react";
import { ParkingAlert } from "@/types";
import { translations, Language } from "@/i18n/translations";

interface AlertsInboxProps {
  lang: Language;
}

export function AlertsInbox({ lang }: AlertsInboxProps) {
  const [alerts, setAlerts] = useState<ParkingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = translations[lang];

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

  const handleUpdateStatus = async (alertId: string, newStatus: "acknowledged" | "resolved") => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status: newStatus }),
      });

      if (res.ok) {
        // Optimistic update
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
        );
      }
    } catch {
      // Handled
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === "pending" || a.status === "acknowledged");
  const pastAlerts = alerts.filter((a) => a.status === "resolved" || a.status === "cancelled");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-qatar-50 text-qatar dark:bg-qatar-950/50 dark:text-qatar-300">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-arabic">
              {t.navInbox}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === "ar"
                ? "تنبيهات مواقف السيارات الموجهة لك من الزملاء"
                : "Parking alerts received for your registered vehicles"}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAlerts}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Active Incidents Section */}
      <div className="mt-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
          {lang === "ar" ? "التنبيهات النشطة الحالية" : "Active Alerts"} ({activeAlerts.length})
        </h2>

        {activeAlerts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
              {t.allClear}
            </h3>
          </div>
        )}

        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-qatar" />
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                  {alert.vehicle?.plate_number || "482731"}
                </span>
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  alert.status === "pending"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                }`}
              >
                {alert.status === "pending" ? t.alertStatus_pending : t.alertStatus_acknowledged}
              </span>
            </div>

            <div className="p-5">
              <p className="text-base font-bold text-slate-900 dark:text-white font-arabic">
                {alert.message || t.alertType_BLOCKING}
              </p>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                {alert.status === "pending" && (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, "acknowledged")}
                    className="w-full sm:w-auto flex-1 rounded-xl bg-amber-500 py-3 text-center text-sm font-bold text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-600 active:scale-95"
                  >
                    {t.ackButton}
                  </button>
                )}

                <button
                  onClick={() => handleUpdateStatus(alert.id, "resolved")}
                  className="w-full sm:w-auto flex-1 rounded-xl bg-emerald-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
                >
                  {t.resolveButton}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resolved History */}
      {pastAlerts.length > 0 && (
        <div className="mt-10 space-y-3">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 font-arabic">
            {lang === "ar" ? "سجل التنبيهات السابقة التي تم حلها" : "Resolved History"}
          </h2>

          <div className="divide-y rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {pastAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white font-arabic">
                    {alert.message}
                  </span>
                  <span className="block text-xs text-slate-400 font-mono mt-0.5">
                    لوحة {alert.vehicle?.plate_number || "482731"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t.alertStatus_resolved}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
