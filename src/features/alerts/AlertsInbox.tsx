"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, RefreshCw, BellRing, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ParkingAlert } from "@/types";
import { translations, Language } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { requestNotificationPermission } from "@/lib/notifications";
import { QatarPlate } from "@/components/ui/QatarPlate";
import { SPRINGS } from "@/lib/motion";

interface AlertsInboxProps {
  lang: Language;
}

export function AlertsInbox({ lang }: AlertsInboxProps) {
  const [alerts, setAlerts] = useState<ParkingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const t = translations[lang];

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    triggerHaptic("selection");
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const fetchAlerts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Hook into Realtime WebSockets for instant delivery
  useRealtimeAlerts({
    onAlertInserted: (newAlert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
    },
    onAlertUpdated: (updated) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
      );
    },
    onAnyChange: () => {
      fetchAlerts();
    },
  });

  const handleUpdateStatus = async (alertId: string, newStatus: "acknowledged" | "resolved") => {
    if (newStatus === "acknowledged") {
      triggerHaptic("medium");
    } else {
      triggerHaptic("success");
    }

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
      triggerHaptic("error");
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === "pending" || a.status === "acknowledged");
  const pastAlerts = alerts.filter((a) => a.status === "resolved" || a.status === "cancelled");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5 border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/20">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">
                {t.navInbox}
              </h1>
              {/* Live Realtime Indicator Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lang === "ar" ? "بث مباشر" : "Live"}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === "ar"
                ? "تنبيهات مواقف السيارات الموجهة لك فورياً عبر WebSockets"
                : "Parking alerts received in realtime via WebSockets"}
            </p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic("light");
            fetchAlerts();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-qatar" : ""}`} />
        </motion.button>
      </div>

      {/* Browser Notification Banner Prompt */}
      {notifPermission === "default" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-qatar/20 bg-qatar/5 p-4 backdrop-blur-sm dark:bg-qatar-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qatar text-white">
              <BellRing className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {lang === "ar" ? "تفعيل إشعارات المتصفح الفورية" : "Enable Web Notifications"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "لتلقي رنين واهتزاز وإشعار عند ورود طلب تحريك سيارتك"
                  : "Get chime, vibration, and banners when someone alerts you"}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEnableNotifications}
            className="shrink-0 rounded-xl bg-qatar px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-qatar-800"
          >
            {lang === "ar" ? "تفعيل الآن 🔔" : "Enable 🔔"}
          </motion.button>
        </motion.div>
      )}

      {/* Active Incidents Section */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white font-arabic">
            {lang === "ar" ? "التنبيهات النشطة الحالية" : "Active Alerts"}
          </h2>
          <span className="rounded-full bg-qatar/10 px-2.5 py-0.5 text-xs font-bold text-qatar dark:bg-qatar-950/60 dark:text-qatar-300">
            {activeAlerts.length}
          </span>
        </div>

        {activeAlerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-dashed border-slate-300/90 bg-white/80 p-8 text-center backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white font-arabic">
              {t.allClear}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === "ar" ? "لا توجد أي سيارة محجوزة أو بلاغات معلقة لمواقفك" : "No active blocking alerts reported"}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {activeAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={SPRINGS.sheet}
              className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-lg shadow-slate-200/40 transition-all dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
            >
              <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 to-slate-100/60 px-5 py-3 border-slate-100 dark:from-slate-800/60 dark:to-slate-900/60 dark:border-slate-800">
                {/* Authentic Qatar Plate Header */}
                <QatarPlate
                  plateNumber={alert.vehicle?.plate_number || "482731"}
                  size="sm"
                />

                <motion.span
                  layout
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    alert.status === "pending"
                      ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      : "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                  }`}
                >
                  {alert.status === "pending" ? t.alertStatus_pending : t.alertStatus_acknowledged}
                </motion.span>
              </div>

              <div className="p-5">
                <p className="text-lg font-black text-slate-900 dark:text-white font-arabic">
                  {alert.message || t.alertType_BLOCKING}
                </p>

                {/* Action Buttons with smooth layout animation */}
                <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <AnimatePresence>
                    {alert.status === "pending" && (
                      <motion.button
                        key="ack-button"
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleUpdateStatus(alert.id, "acknowledged")}
                        className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 px-4 text-center text-sm font-bold text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-600 active:scale-95"
                      >
                        <span>🏃‍♂️</span>
                        <span>{t.ackButton}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <motion.button
                    layout
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdateStatus(alert.id, "resolved")}
                    className={`flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 px-4 text-center text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 ${
                      alert.status !== "pending" ? "col-span-full" : ""
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{t.resolveButton}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
                <div className="flex items-center gap-3">
                  <QatarPlate
                    plateNumber={alert.vehicle?.plate_number || "482731"}
                    size="sm"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white font-arabic">
                      {alert.message}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                      {new Date(alert.created_at).toLocaleTimeString(lang === "ar" ? "ar-QA" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
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
