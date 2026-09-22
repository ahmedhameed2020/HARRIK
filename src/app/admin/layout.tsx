"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  Bell,
  AlertTriangle,
  FileSpreadsheet,
  History,
  Settings,
  Building2,
  Sparkles,
  FileText,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { triggerHaptic } from "@/lib/haptics";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { useEntityConfig } from "@/contexts/EntityConfigContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Live Doha clock.
 *
 * The time is only produced after mount: formatting `new Date()` on the server
 * and again on the client yields different text and trips a React hydration
 * mismatch (#418) on every admin page, which forces React to throw the tree away
 * and re-render it. The placeholder keeps both markups identical, and the value
 * then ticks every 30 seconds.
 */
function DohaClock({ isRtl }: { isRtl: boolean }) {
  const [time, setTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString(isRtl ? "ar-QA" : "en-QA", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [isRtl]);

  return (
    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
      {time ?? "--:--"}
    </span>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { memberLabel, memberLabelEn, venueName } = useEntityConfig();
  const { activeCount } = useRealtimeAlerts({
    organizationId: profile?.organization_id,
    enableNotifications: false,
  });

  const [isRtl, setIsRtl] = React.useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const updateDir = () => {
      setIsRtl(document.documentElement.dir !== "ltr");
    };
    updateDir();
    const observer = new MutationObserver(updateDir);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });
    return () => observer.disconnect();
  }, []);

  const navItems = [
    {
      href: "/admin",
      label: "لوحة المؤشرات",
      labelEn: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/staff",
      label: memberLabel || "الأفراد المصرح لهم",
      labelEn: memberLabelEn || "Authorized Members",
      icon: Users,
    },
    {
      href: "/admin/vehicles",
      label: "دليل المركبات",
      labelEn: "Vehicles",
      icon: Car,
    },
    {
      href: "/admin/alerts",
      label: "بلاغات المواقف",
      labelEn: "Alerts",
      icon: Bell,
      badge: activeCount,
    },
    {
      href: "/admin/unknown",
      label: "سيارات غير مسجلة",
      labelEn: "Unknown",
      icon: AlertTriangle,
    },
    {
      href: "/admin/import",
      label: "استيراد وتصدير Excel",
      labelEn: "Import / Export",
      icon: FileSpreadsheet,
    },
    {
      href: "/admin/reports",
      label: "التقارير التنفيذية",
      labelEn: "Reports",
      icon: FileText,
    },
    {
      href: "/admin/visitors",
      label: "تصاريح الزوار",
      labelEn: "Visitors",
      icon: UserCheck,
    },
    {
      href: "/admin/audit",
      label: "سجل التدقيق",
      labelEn: "Audit Logs",
      icon: History,
    },
    {
      href: "/admin/settings",
      label: "إعدادات النظام",
      labelEn: "Settings",
      icon: Settings,
    },
  ];

  const isLinkActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 dark:bg-surface-page">
      {/* Container with responsive flex: vertical sidebar on lg+, horizontal sub-header on mobile */}
      <div className="mx-auto flex max-w-7xl">
        {/* ==================================================================== */}
        {/* DESKTOP DOCKED SIDEBAR (Visible on lg+)                              */}
        {/* In RTL (Arabic): docked on the RIGHT. In LTR (English): on the LEFT. */}
        {/* ==================================================================== */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col justify-between border-e border-slate-200/80 bg-white/80 p-5 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-surface-card/80 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto z-20">
          <div className="space-y-6">
            {/* Tenant Organization Branding */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/25 ring-1 ring-white/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-900 dark:text-zinc-50 font-arabic truncate">
                  {profile?.organization?.name_ar || profile?.organization?.name_en || (isRtl ? "منظومة المواقف الذكية" : "Smart Parking System")}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-caption font-bold text-emerald-600 dark:text-emerald-400">
                    {isRtl ? "متصل مباشر" : "Live Connected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Nav List */}
            <nav aria-label="Admin Navigation" className="space-y-1">
              <p className="px-3 pb-2 text-micro font-bold tracking-wider text-slate-500 dark:text-zinc-500 uppercase font-arabic">
                {isRtl ? "أقسام الإدارة" : "Administration"}
              </p>
              {navItems.map((item) => {
                const active = isLinkActive(item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => triggerHaptic("selection")}
                    className={`group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${
                      active
                        ? "bg-qatar text-white shadow-md shadow-qatar/20 dark:bg-qatar dark:text-white font-black"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          active
                            ? "scale-110 text-white"
                            : "text-slate-400 group-hover:scale-105 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        }`}
                      />
                      <span className="font-arabic truncate">
                        {isRtl ? item.label : item.labelEn}
                      </span>
                    </div>

                    {/* Pending Alerts Live Counter Badge */}
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span
                        className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-micro font-black ${
                          active
                            ? "bg-white text-qatar shadow-sm ring-2 ring-qatar"
                            : "bg-red-600 text-white animate-pulse"
                        }`}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Info / Timezone */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/60">
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 text-caption text-slate-500 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400">
              <div className="flex items-center justify-between font-mono">
                <span className="text-qatar font-bold">
                  {isRtl ? "توقيت الدوحة:" : "Doha Time:"}
                </span>
                <span>
                  <DohaClock isRtl={isRtl} />
                </span>
              </div>
              <p className="mt-1 text-micro text-slate-500 dark:text-zinc-400 truncate">
                {profile?.organization?.timezone || "Asia/Qatar"} • {isRtl ? "نظام آمن" : "Secure Node"}
              </p>
            </div>
          </div>
        </aside>

        {/* ==================================================================== */}
        {/* MAIN ADMIN WORKSPACE (Takes full remaining width on desktop)         */}
        {/* ==================================================================== */}
        <div className="flex-1 min-w-0">
          {/* Mobile Sub-Header Banner (Only visible on < lg screens) */}
          <div className="lg:hidden border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-surface-card/70">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qatar text-white shadow-sm">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-slate-900 dark:text-zinc-50 font-arabic truncate">
                      {profile?.organization?.name_ar || profile?.organization?.name_en || (isRtl ? "منظومة المواقف الذكية" : "Smart Parking")}
                    </h2>
                    <p className="text-micro text-slate-500 dark:text-zinc-400 truncate">
                      {isRtl ? "لوحة التحكم المركزية" : "Central Command"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      triggerHaptic("selection");
                      setIsMobileDrawerOpen(true);
                    }}
                    className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 active:scale-95 transition"
                    aria-label="Open Admin Menu"
                  >
                    <Menu className="h-4 w-4 text-qatar" />
                    <span className="font-arabic">{isRtl ? "القائمة" : "Menu"}</span>
                  </button>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-micro font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isRtl ? "متصل" : "Live"}</span>
                  </span>
                </div>
              </div>

              {/* Mobile section tabs — wrapping keeps every destination visible
                  (a horizontal scroller hid the last one behind the edge). */}
              <nav
                aria-label="Admin Sections Mobile"
                className="flex flex-wrap items-center gap-1.5 pt-1"
              >
                {navItems.map((item) => {
                  const active = isLinkActive(item);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => triggerHaptic("selection")}
                      className={`group relative flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                        active
                          ? "bg-qatar text-white shadow-md shadow-qatar/20 dark:bg-qatar dark:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 transition-transform ${active ? "scale-110" : "text-slate-400 dark:text-zinc-500"}`} />
                      <span className="font-arabic">{isRtl ? item.label : item.labelEn}</span>

                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-micro font-black ${
                            active
                              ? "bg-white text-qatar shadow-sm ring-2 ring-qatar"
                              : "bg-red-600 text-white animate-pulse"
                          }`}
                        >
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Admin Content Container */}
          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MOBILE SLIDE-OVER DRAWER (Off-canvas)                               */}
      {/* Slides from RIGHT in Arabic (RTL) and from LEFT in English (LTR)    */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: isRtl ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`fixed inset-y-0 z-50 flex w-80 max-w-[85vw] flex-col justify-between bg-white p-5 shadow-2xl dark:bg-surface-card lg:hidden overflow-y-auto ${
                isRtl ? "right-0 border-l border-slate-200 dark:border-zinc-800" : "left-0 border-r border-slate-200 dark:border-zinc-800"
              }`}
            >
              <div className="space-y-6">
                {/* Header with Close */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/25">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-slate-900 dark:text-zinc-50 font-arabic truncate">
                        {profile?.organization?.name_ar || profile?.organization?.name_en || (isRtl ? "منظومة المواقف الذكية" : "Smart Parking")}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-caption font-bold text-emerald-600 dark:text-emerald-400">
                          {isRtl ? "متصل مباشر" : "Live Connected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 active:scale-95 transition"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Drawer Nav Items */}
                <nav aria-label="Mobile Drawer Navigation" className="space-y-1">
                  <p className="px-3 pb-2 text-micro font-bold tracking-wider text-slate-500 dark:text-zinc-500 uppercase font-arabic">
                    {isRtl ? "أقسام الإدارة" : "Administration"}
                  </p>
                  {navItems.map((item) => {
                    const active = isLinkActive(item);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          triggerHaptic("selection");
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`group relative flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-bold transition-all active:scale-[0.98] ${
                          active
                            ? "bg-qatar text-white shadow-md shadow-qatar/20 dark:bg-qatar dark:text-white font-black"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-transform ${
                              active
                                ? "scale-110 text-white"
                                : "text-slate-400 group-hover:scale-105 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                            }`}
                          />
                          <span className="font-arabic truncate text-sm">
                            {isRtl ? item.label : item.labelEn}
                          </span>
                        </div>

                        {/* Pending Alerts Live Counter Badge */}
                        {typeof item.badge === "number" && item.badge > 0 && (
                          <span
                            className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-micro font-black ${
                              active
                                ? "bg-white text-qatar shadow-sm ring-2 ring-qatar"
                                : "bg-red-600 text-white animate-pulse"
                            }`}
                          >
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/60">
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 text-caption text-slate-500 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-qatar font-bold">
                      {isRtl ? "توقيت الدوحة:" : "Doha Time:"}
                    </span>
                    <span>
                      <DohaClock isRtl={isRtl} />
                    </span>
                  </div>
                  <p className="mt-1 text-micro text-slate-500 dark:text-zinc-400 truncate">
                    {profile?.organization?.timezone || "Asia/Qatar"} • {isRtl ? "نظام آمن" : "Secure Node"}
                  </p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
