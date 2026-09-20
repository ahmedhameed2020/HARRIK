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
import {
  share,
  type DashboardRange,
  type DashboardSeries,
} from "@/lib/analytics/dashboard-series";
import { translations, Language } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { useEntityConfig } from "@/contexts/EntityConfigContext";
import { useLocale } from "@/contexts/LocaleContext";
import { motion } from "motion/react";
import { SPRINGS } from "@/lib/motion";

interface DashboardOverviewProps {
  lang: Language;
}

/**
 * Chart palette. Recharts requires concrete colour values, so the theme is
 * resolved here instead of relying on CSS variables (which silently came out
 * bright-white on dark cards before).
 */
function chartTheme(theme: "light" | "dark") {
  return theme === "dark"
    ? {
        grid: "#27272a",
        axis: "#a1a1aa",
        cursor: "rgba(255,255,255,0.06)",
        bar: "#e11d48",
        barSoft: "rgba(225,29,72,0.35)",
      }
    : {
        grid: "#e2e8f0",
        axis: "#64748b",
        cursor: "rgba(15,23,42,0.04)",
        bar: "#8a1538",
        barSoft: "rgba(138,21,56,0.35)",
      };
}

/** "4 د 18 ث" / "4m 18s" from a seconds value. */
function formatDuration(seconds: number, lang: Language): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (lang === "ar") return minutes ? `${minutes} د ${rest} ث` : `${rest} ث`;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

/** Empty series placeholder so charts never render undefined data. */
const EMPTY_SERIES: DashboardSeries = {
  range: "week",
  traffic: [],
  peakHours: [],
  resolution: { under5: 0, mid: 0, over15: 0, total: 0, averageSeconds: null },
  sampleSize: 0,
  truncated: false,
  generatedAt: "",
};

/** Neutral placeholder shown inside a chart card when there is nothing to plot. */
function ChartEmptyState({
  loading,
  label,
  hint,
}: {
  loading: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-zinc-900 dark:text-zinc-500">
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin text-qatar" />
        ) : (
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
        )}
      </div>
      <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
        {loading ? "" : label}
      </p>
      {!loading && (
        <p className="max-w-xs text-[11px] text-slate-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

export function DashboardOverview({ lang }: DashboardOverviewProps) {
  const { config } = useEntityConfig();
  const { theme } = useLocale();
  const c = chartTheme(theme);
  const [data, setData] = useState<IDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<DashboardRange>("week");
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[lang];
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const series = data?.series ?? EMPTY_SERIES;
  const traffic = series.traffic;
  const peakHours = series.peakHours;
  const resolution = series.resolution;

  const resolutionSpeedData = [
    { name: "أقل من 5 دقائق", nameEn: "Under 5 minutes", value: share(resolution.under5, resolution.total), color: "#10b981" },
    { name: "5 - 15 دقيقة", nameEn: "5 - 15 minutes", value: share(resolution.mid, resolution.total), color: "#3b82f6" },
    { name: "أكثر من 15 دقيقة", nameEn: "Over 15 minutes", value: share(resolution.over15, resolution.total), color: "#f59e0b" },
  ];
  const hasResolution = resolution.total > 0;
  const hasTraffic = traffic.some((p) => p.searches + p.alerts > 0);
  const peakHour = peakHours.reduce(
    (best, p) => (p.count > (best?.count ?? -1) ? p : best),
    peakHours[0]
  );
  const hasPeak = peakHours.some((p) => p.count > 0);

  /** Labels that follow the selected window instead of always saying "today". */
  const rangeWord = L(
    timeRange === "today" ? "اليوم" : timeRange === "week" ? "آخر 7 أيام" : "آخر 30 يومًا",
    timeRange === "today" ? "today" : timeRange === "week" ? "last 7 days" : "last 30 days"
  );

  /** Renders a metric, showing an em dash while it is loading or unavailable. */
  const metric = (value: number | null | undefined, suffix = "") => {
    if (value === null || value === undefined) return isLoading ? "…" : "—";
    return `${value}${suffix}`;
  };

  const fetchOverview = async (range: DashboardRange = timeRange) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(timeRange);
    // `timeRange` is the only input; `fetchOverview` is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

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
          className="group relative overflow-hidden rounded-[20px] border border-amber-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-amber-900/40 dark:bg-surface-card"
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
              {metric(ci?.activeTotal)}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {metric(ci?.pending)} {L("بانتظار", "pending")}
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
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-surface-card"
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
              {metric(m?.registeredVehicles?.value)}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{metric(m?.vehicleCoverage?.value, "%")} {L("تغطية", "coverage")}</span>
            </span>
          </div>
          {/* Mini Sparkline Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mb-1">
              <span>{lang === "ar" ? `نسبة تسجيل ${config.memberLabel}` : `${config.memberLabelEn} Registration`}</span>
              <span>
                {metric(m?.registeredStaff?.value)}{" "}
                {lang === "ar" ? `${config.memberSingle} مسجل` : `Registered ${config.memberSingleEn}`}
              </span>
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
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-surface-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              {timeRange === "today"
                ? t.metric_searchesToday
                : `${L("عمليات البحث", "Searches")} · ${rangeWord}`}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Search className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white font-mono">
              {metric(m?.searches?.value)}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{metric(m?.searchSuccessRate?.value, "%")} {L("نجاح", "success")}</span>
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
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-surface-card"
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
              {metric(m?.resolutionRate?.value, "%")}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {m?.resolvedAlerts?.value != null && m?.alertsCreated?.value
                ? L(
                    `(${m.resolvedAlerts.value} من ${m.alertsCreated.value})`,
                    `(${m.resolvedAlerts.value} of ${m.alertsCreated.value})`
                  )
                : ""}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>{L("متوسط زمن الحل الميداني:", "Average field resolution time:")}</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {m?.averageResolutionTime?.value != null
                ? formatDuration(m.averageResolutionTime.value, lang)
                : metric(null)}
            </span>
          </div>
        </motion.div>
      </div>


      {/* Visual Analytics Grid: 2 Charts Side-by-Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: 7-Day Traffic & Alerts Area Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white font-arabic flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-qatar" />
                <span>
                  {timeRange === "today"
                    ? L("حركة البحث والتنبيهات اليومية", "Today's search & alert traffic")
                    : timeRange === "week"
                    ? L("حركة البحث وبلاغات المواقف الأسبوعية", "Weekly search & parking alert traffic")
                    : L("حركة البحث وبلاغات المواقف الشهرية", "Monthly search & parking alert traffic")}
                </span>
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
          <div className="relative h-72 w-full" aria-hidden="true">
            {isMounted && hasTraffic && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={traffic}
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} opacity={0.6} />
                  <XAxis
                    dataKey={lang === "ar" ? "labelAr" : "labelEn"}
                    tick={{ fontSize: 12, fill: c.axis }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={12}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: c.axis }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: c.axis, strokeOpacity: 0.2 }} />
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
            {isMounted && !hasTraffic && (
              <ChartEmptyState
                loading={isLoading}
                label={L("لا توجد حركة مسجّلة في هذه الفترة", "No recorded traffic in this period")}
                hint={L("ستظهر البيانات هنا بمجرد تسجيل أول عملية بحث أو تنبيه.", "Data appears as soon as the first search or alert is logged.")}
              />
            )}
          </div>
          {series.truncated && (
            <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              {L("الرسم مبني على أحدث 20,000 سجل في الفترة.", "Chart is based on the latest 20,000 records in the range.")}
            </p>
          )}
        </div>

        {/* Chart 2: Resolution Speed Breakdown (Donut Chart) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface-card flex flex-col justify-between">
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
            {isMounted && hasResolution && (
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
            {isMounted && !hasResolution && (
              <ChartEmptyState
                loading={isLoading}
                label={L("لا توجد بلاغات مُغلقة بعد", "No closed incidents yet")}
                hint={L(
                  "يظهر التوزيع بعد إغلاق أول بلاغ مواقف.",
                  "The distribution appears once the first parking incident is resolved."
                )}
              />
            )}
            {isMounted && hasResolution && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {resolutionSpeedData[0].value}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 font-arabic">
                  {L("< 5 دقائق", "< 5 min")}
                </span>
              </div>
            )}
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
                  {hasResolution ? `${item.value}%` : "—"}
                </span>
              </div>
            ))}
            <p className="pt-1 text-[10px] text-slate-500 dark:text-zinc-400">
              {hasResolution
                ? L(
                    `متوسط زمن الحل: ${formatDuration(resolution.averageSeconds ?? 0, lang)}`,
                    `Average resolution: ${formatDuration(resolution.averageSeconds ?? 0, lang)}`
                  )
                : L("لم تُسجَّل أوقات حل بعد", "No resolution times recorded yet")}
            </p>
          </div>
        </div>
      </div>

      {/* Peak Hours & Live Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Peak Hours Bar Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface-card">
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
            {hasPeak && (
              <span className="inline-flex items-center gap-1 rounded-full bg-qatar/10 px-2.5 py-1 text-xs font-bold text-qatar">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {L("الذروة: ", "Peak: ")}
                  {lang === "ar" ? peakHour?.labelAr : peakHour?.labelEn}
                </span>
              </span>
            )}
          </div>

          {/* Decorative: peak times are labelled in text beneath the chart. */}
          <div className="relative h-64 w-full" aria-hidden="true">
            {isMounted && hasPeak && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={peakHours}
                  accessibilityLayer={false}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} opacity={0.6} />
                  <XAxis
                    dataKey={lang === "ar" ? "labelAr" : "labelEn"}
                    tick={{ fontSize: 11, fill: c.axis }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                    minTickGap={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: c.axis }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: c.cursor }}
                    formatter={(value: any) => [
                      lang === "ar" ? `${value} حركة` : `${value} movements`,
                      L("إجمالي النشاط", "Total activity"),
                    ]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {peakHours.map((entry) => (
                      <Cell
                        key={`bar-${entry.hour}`}
                        fill={entry.hour === peakHour?.hour ? c.bar : c.barSoft}
                        className="transition-all hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {isMounted && !hasPeak && (
              <ChartEmptyState
                loading={isLoading}
                label={L("لا يوجد نشاط مسجّل في هذه الفترة", "No recorded activity in this period")}
                hint={L(
                  "يُبنى التوزيع من عمليات البحث والتنبيهات الفعلية.",
                  "Built from actual searches and alerts."
                )}
              />
            )}
          </div>
        </div>

        {/* Operational Shortcuts & Highlights */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface-card flex flex-col justify-between">
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
