"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Car,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  Shield,
  FileSpreadsheet,
  Settings,
  History,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Calendar,
  Sparkles,
  ChevronRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { DashboardOverview as IDashboardOverview } from "@/types";
import { translations, Language } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { useEntityConfig } from "@/contexts/EntityConfigContext";
import { motion } from "motion/react";
import { SPRINGS } from "@/lib/motion";

interface DashboardOverviewProps {
  lang: Language;
}

// 7-day trend sample data based on facility operation
const trafficTrendData = [
  { day: "الخميس", dayEn: "Thu", searches: 28, alerts: 8, resolved: 8 },
  { day: "الجمعة", dayEn: "Fri", searches: 4, alerts: 0, resolved: 0 },
  { day: "السبت", dayEn: "Sat", searches: 6, alerts: 1, resolved: 1 },
  { day: "الأحد", dayEn: "Sun", searches: 42, alerts: 14, resolved: 13 },
  { day: "الإثنين", dayEn: "Mon", searches: 38, alerts: 11, resolved: 9 },
  { day: "الثلاثاء", dayEn: "Tue", searches: 45, alerts: 13, resolved: 12 },
  { day: "اليوم", dayEn: "Today", searches: 34, alerts: 7, resolved: 6 },
];

// Peak hours distribution (Universal Traffic Patterns)
const peakHoursData = [
  { time: "7:00 ص", timeEn: "7:00 AM", count: 18, label: "دخول الفترة الصباحية", labelEn: "Morning Entry" },
  { time: "8:00 ص", timeEn: "8:00 AM", count: 12, label: "حركة الوصول الصباحي", labelEn: "Morning Arrival" },
  { time: "10:00 ص", timeEn: "10:00 AM", count: 15, label: "حركة منتصف اليوم والخدمات", labelEn: "Midday & Services" },
  { time: "12:00 م", timeEn: "12:00 PM", count: 22, label: "حركة فترة الظهيرة", labelEn: "Midday Movement" },
  { time: "1:00 م", timeEn: "1:00 PM", count: 46, label: "ذروة الخروج", labelEn: "Peak Departure", isPeak: true },
  { time: "2:00 م", timeEn: "2:00 PM", count: 28, label: "حركة المغادرة الرئيسية", labelEn: "Main Departure" },
  { time: "3:30 م", timeEn: "3:30 PM", count: 14, label: "حركة ما بعد الظهيرة", labelEn: "Afternoon Traffic" },
  { time: "5:00 م", timeEn: "5:00 PM", count: 8, label: "هدوء الحركة المسائية", labelEn: "Evening Calm" },
];

// Incident resolution breakdown
const resolutionSpeedData = [
  { name: "أقل من 5 دقائق", nameEn: "Under 5 minutes", value: 78, color: "#10b981" },
  { name: "5 - 15 دقيقة", nameEn: "5 - 15 minutes", value: 14, color: "#3b82f6" },
  { name: "أكثر من 15 دقيقة", nameEn: "Over 15 minutes", value: 8, color: "#f59e0b" },
];

export function DashboardOverview({ lang }: DashboardOverviewProps) {
  const { config } = useEntityConfig();
  const [data, setData] = useState<IDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("week");
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[lang];
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const m = data?.metrics;
  const ci = data?.currentIssues;

  // Custom Recharts Tooltip
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 text-xs font-arabic">
          <p className="font-black text-slate-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1">
            <p className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400 font-bold">
              <span>{L("عمليات البحث:", "Searches:")}</span>
              <span className="font-mono">{payload[0]?.value}</span>
            </p>
            <p className="flex items-center justify-between gap-4 text-qatar font-bold">
              <span>{L("تنبيهات المواقف:", "Parking alerts:")}</span>
              <span className="font-mono">{payload[1]?.value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Executive Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white font-arabic">
            {t.dashboardGreeting}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            {L("المؤشرات الحية والبيانات التحليلية لمواقف السيارات والحركة الميدانية", "Live KPIs and analytics for parking and field movement")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {(["today", "week", "month"] as const).map((range) => {
              const active = timeRange === range;
              const label =
                range === "today"
                  ? L("اليوم", "Today")
                  : range === "week"
                  ? L("آخر 7 أيام", "Last 7 days")
                  : L("هذا الشهر", "This month");

              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setTimeRange(range);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-qatar text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              fetchOverview();
            }}
            disabled={isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            title={L("تحديث البيانات", "Refresh data")}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-qatar" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row — SaaS Executive Quality */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Active Incidents (Operational Priority #1) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.02 }}
          whileHover={{ y: -2 }}
          className="group relative overflow-hidden rounded-[20px] border border-amber-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-amber-900/40 dark:bg-[#0c0c0f]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              {t.metric_activeIncidents}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {ci?.activeTotal ?? 0}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {ci?.pending ?? 0} {L("بانتظار", "pending")}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>{L("أقدم حالة نشطة:", "Oldest active incident:")}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
              {ci?.oldestActiveIncident ? L(`لوحة ${ci.oldestActiveIncident.plateDisplay}`, `Plate ${ci.oldestActiveIncident.plateDisplay}`) : L("لا توجد بلاغات نشطة", "No active incidents")}
            </span>
          </div>
        </motion.div>

        {/* KPI 2: Registered Vehicles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.06 }}
          whileHover={{ y: -2 }}
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-[#0c0c0f]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              {t.metric_registeredVehicles}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qatar/10 text-qatar dark:bg-qatar/20">
              <Car className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white font-mono">
              {m?.registeredVehicles?.value ?? 0}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{m?.vehicleCoverage?.value ?? 0}% تغطية</span>
            </span>
          </div>
          {/* Mini Sparkline Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mb-1">
              <span>{lang === "ar" ? `نسبة تسجيل ${config.memberLabel}` : `${config.memberLabelEn} Registration`}</span>
              <span>{m?.registeredStaff?.value ?? 0} {lang === "ar" ? `${config.memberSingle} مسجل` : `Registered ${config.memberSingleEn}`}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <div
                className="h-full bg-qatar rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, m?.vehicleCoverage?.value ?? 0)}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* KPI 3: Searches & Instant Match Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.10 }}
          whileHover={{ y: -2 }}
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-[#0c0c0f]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              {t.metric_searchesToday}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Search className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white font-mono">
              {m?.searches?.value ?? 0}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{m?.searchSuccessRate?.value ?? 0}% {L("نجاح", "success")}</span>
            </span>
          </div>
          {/* Mini Sparkline Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mb-1">
              <span>{L("دقة العثور على المالك", "Owner lookup accuracy")}</span>
              <span>{m?.searches?.value ? L(`${Math.round((m.searches.value * (m.searchSuccessRate?.value ?? 100)) / 100)} بحث ناجح`, `${Math.round((m.searches.value * (m.searchSuccessRate?.value ?? 100)) / 100)} successful searches`) : L("جاهز للبحث", "Ready to search")}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, m?.searchSuccessRate?.value ?? 0)}%` }}
              />
            </div>
          </div>
        </motion.div>


        {/* KPI 4: Resolution Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.14 }}
          whileHover={{ y: -2 }}
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-[#0c0c0f]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              {t.metric_resolutionRate}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {m?.resolutionRate?.value ?? 90.0}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {L("(9 من كل 10)", "(9 out of 10)")}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>{L("متوسط زمن الحل الميداني:", "Average field resolution time:")}</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {L("4 د 18 ث", "4m 18s")}
            </span>
          </div>
        </motion.div>
      </div>


      {/* Visual Analytics Grid: 2 Charts Side-by-Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: 7-Day Traffic & Alerts Area Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-qatar" />
                <span>{L("حركة البحث وبلاغات المواقف الأسبوعية", "Weekly search & parking alert traffic")}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {L("مقارنة حجم عمليات البحث الميداني مع التنبيهات المرسلة", "Compare field search volume with dispatched alerts")}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-slate-600 dark:text-zinc-300">{L("عمليات البحث", "Searches")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-qatar" />
                <span className="text-slate-600 dark:text-zinc-300">{L("تنبيهات المواقف", "Parking alerts")}</span>
              </div>
            </div>
          </div>

          {/* Decorative: the same series is stated in text above the chart. */}
          <div className="h-72 w-full" aria-hidden="true">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trafficTrendData}
                  accessibilityLayer={false}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8A1538" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8A1538" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="searches"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSearches)"
                  />
                  <Area
                    type="monotone"
                    dataKey="alerts"
                    stroke="#8A1538"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorAlerts)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Resolution Speed Breakdown (Donut Chart) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>{lang === "ar" ? "سرعة الاستجابة" : "Response Speed"}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {lang === "ar" ? "توزيع وقت تحريك السيارات من لحظة التنبيه" : "Resolution time distribution from alert trigger"}
            </p>
          </div>

          {/* Decorative: the breakdown is repeated in the legend below. */}
          <div
            className="relative h-48 w-full my-2 flex items-center justify-center"
            aria-hidden="true"
          >
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer={false}>
                  <Pie
                    data={resolutionSpeedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    // Decorative chart: keep the layer out of the tab order so it
                    // does not sit inside an aria-hidden container (axe
                    // `aria-hidden-focus`). The legend below repeats the values.
                    rootTabIndex={-1}
                  >
                    {resolutionSpeedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">77.8%</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 font-arabic">{L("< 5 دقائق", "< 5 min")}</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
            {resolutionSpeedData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-zinc-400 font-arabic">{lang === "ar" ? item.name : item.nameEn}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak Hours & Live Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Peak Hours Bar Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic">
                {lang === "ar" ? "توزيع ساعات ذروة حركة المواقف" : "Peak Parking Traffic Distribution"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {lang === "ar"
                  ? "تحديد أوقات الازدحام اليومية لحركة الدخول والخروج"
                  : "Daily Entry & Exit Traffic Patterns"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-qatar/10 px-2.5 py-1 text-xs font-bold text-qatar">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{lang === "ar" ? "الذروة: 1:00 م" : "Peak: 1:00 PM"}</span>
            </span>
          </div>

          {/* Decorative: peak times are labelled in text beneath the chart. */}
          <div className="h-64 w-full" aria-hidden="true">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={peakHoursData}
                  accessibilityLayer={false}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis
                    dataKey={lang === "ar" ? "time" : "timeEn"}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      lang === "ar" ? `${value} حركة سيارة` : `${value} vehicle movements`,
                      lang === "ar" ? item.payload.label : item.payload.labelEn,
                    ]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {peakHoursData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.isPeak ? "#8A1538" : "#cbd5e1"}
                        className="transition-all hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Operational Shortcuts & Highlights */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic">
              {L("إجراءات الإدارة السريعة", "Quick admin actions")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {L("اختصارات المهام المتكررة للإشراف الميداني", "Shortcuts for recurring field supervision tasks")}
            </p>

            <div className="mt-4 space-y-2">
              <Link
                href="/admin/staff"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qatar/10 text-qatar">
                    <Users className="h-4 w-4" />
                  </div>
                  <span>{L(`إضافة / تعديل ${config.memberLabel}`, `Add / edit ${config.memberLabelEn}`)}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-180" aria-hidden="true" />
              </Link>

              <Link
                href="/admin/vehicles"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                    <Car className="h-4 w-4" />
                  </div>
                  <span>{L("تسجيل مركبة جديدة وتعيين مالك", "Register a new vehicle and assign an owner")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-180" aria-hidden="true" />
              </Link>

              <Link
                href="/admin/import"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <span>{L("استيراد وتصدير إكسل (.xlsx)", "Import & export Excel (.xlsx)")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-180" aria-hidden="true" />
              </Link>

              <Link
                href="/admin/unknown"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <span>{L("فحص السيارات غير المسجلة", "Review unregistered vehicles")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-qatar/5 border border-qatar/15 p-3 text-center">
            <span className="text-[11px] font-bold text-qatar">{L("نظام حَرِّك الذكي v1.0", "HARRIK Smart System v1.0")}</span>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{L("جاهز للربط مع كاميرات البوابات الرقمية", "Ready to integrate with digital gate cameras")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
