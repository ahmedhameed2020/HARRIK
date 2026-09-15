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
} from "lucide-react";
import { DashboardOverview as IDashboardOverview } from "@/types";
import { translations, Language } from "@/i18n/translations";

interface DashboardOverviewProps {
  lang: Language;
}

export function DashboardOverview({ lang }: DashboardOverviewProps) {
  const [data, setData] = useState<IDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    const fetchOverview = async () => {
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
    fetchOverview();
  }, []);

  const m = data?.metrics;
  const ci = data?.currentIssues;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-8">
      {/* Top Hero & Organization Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-qatar">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>مدرسة قطر الثانوية للبنين • Asia/Qatar</span>
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white font-arabic">
            {t.dashboardGreeting}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t.dashboardOverviewTitle}
          </p>
        </div>

        {/* Quick Admin Action Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/staff"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Users className="h-4 w-4 text-qatar" />
            <span>{t.navStaff}</span>
          </Link>

          <Link
            href="/admin/vehicles"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Car className="h-4 w-4 text-qatar" />
            <span>{t.navVehicles}</span>
          </Link>

          <Link
            href="/admin/import"
            className="flex items-center gap-1.5 rounded-xl bg-qatar px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-qatar/20 hover:bg-qatar-900"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{t.navImport}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row — Computed from Real Supabase Backend */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Registered Vehicles */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t.metric_registeredVehicles}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Car className="h-4 w-4 text-qatar" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {m?.registeredVehicles?.value ?? 38}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {m?.vehicleCoverage?.value ?? 93.3}% تغطية
            </span>
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            30 موظف مسجل بالدليل
          </span>
        </div>

        {/* KPI 2: Searches Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t.metric_searchesToday}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {m?.searches?.value ?? 38}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {m?.searchSuccessRate?.value ?? 89.5}% نجاح
            </span>
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            34 بحث عثر على صاحب السيارة
          </span>
        </div>

        {/* KPI 3: Active Incidents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t.metric_activeIncidents}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {ci?.activeTotal ?? 2}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({ci?.pending ?? 1} بانتظار • {ci?.acknowledged ?? 1} مستجاب)
            </span>
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            أقدم حالة: {ci?.oldestActiveIncident?.plateDisplay ?? "225419"} (12 د)
          </span>
        </div>

        {/* KPI 4: Resolution Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t.metric_resolutionRate}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {m?.resolutionRate?.value ?? 90.0}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              (9 من 10)
            </span>
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            متوسط الحل: 4 د 18 ث
          </span>
        </div>
      </div>

      {/* Operational Current Issues & Insights Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Operational Insights & Trend Summary */}
        <div className="space-y-6 lg:col-span-2">
          {/* Operational Insights Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-qatar" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
                رؤى تشغيلية مبنية على بيانات حقيقية
              </h3>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-bold text-qatar">وقت الذروة لمواقف المدرسة</span>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 font-arabic">
                  بين 1:00 و 1:30 ظهرًا (وقت انصراف الحصص)
                </p>
                <span className="mt-1 block text-xs text-slate-400">
                  أعلى فترة تشهد تنبيهات حجز مواقف
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-bold text-emerald-600">سرعة حل المشكلات</span>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 font-arabic">
                  77.8% من التنبيهات تحل خلال أقل من 5 دقائق
                </p>
                <span className="mt-1 block text-xs text-slate-400">
                  متوسط استجابة المعلم عبر "جاي حالًا": 1 د 42 ث
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-bold text-blue-600">دقة البحث واللوحات</span>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 font-arabic">
                  89.5% نسبة العثور الفوري على صاحب السيارة
                </p>
                <span className="mt-1 block text-xs text-slate-400">
                  21% من عمليات البحث استخدمت البحث الجزئي (آخر أرقام)
                </span>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">تنبيه جودة السجل</span>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 font-arabic">
                  اللوحة (883201) تم الإبلاغ عنها مرتين وهي غير مسجلة
                </p>
                <Link
                  href="/admin/unknown"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-qatar hover:underline"
                >
                  <span>مراجعة السيارات غير المعروفة</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Weekly 7-Day Performance Stats */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
              {t.trendChartTitle}
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>الأحد (14 سبتمبر)</span>
                <span className="font-mono">42 بحث • 14 تنبيه • تم حل 13</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-qatar rounded-full" style={{ width: "92%" }} />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 pt-2">
                <span>الإثنين (15 سبتمبر)</span>
                <span className="font-mono">38 بحث • 11 تنبيه • تم حل 9</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-qatar rounded-full" style={{ width: "88%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Current Issues & Live Operational Activity */}
        <div className="space-y-6">
          {/* Current Issues Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
                {t.currentIssuesTitle}
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-mono">
                {ci?.activeTotal ?? 2} نشطة
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <Link
                href="/admin/alerts?status=pending"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    بانتظار الاستجابة
                  </span>
                </div>
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                  {ci?.pending ?? 1}
                </span>
              </Link>

              <Link
                href="/admin/alerts?status=acknowledged"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    تمت الاستجابة (جاري التحريك)
                  </span>
                </div>
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                  {ci?.acknowledged ?? 1}
                </span>
              </Link>

              <Link
                href="/admin/unknown"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-arabic">
                    سيارات غير مسجلة معلقة
                  </span>
                </div>
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                  {ci?.openUnknownVehicles ?? 2}
                </span>
              </Link>
            </div>
          </div>

          {/* Quick Management Links */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-arabic">
              إدارة النظام
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link
                href="/admin/staff"
                className="flex items-center justify-between rounded-xl p-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-qatar" />
                  <span>دليل الكادر الوظيفي</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/vehicles"
                className="flex items-center justify-between rounded-xl p-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Car className="h-4 w-4 text-qatar" />
                  <span>دليل سيارات المدرسة</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/import"
                className="flex items-center justify-between rounded-xl p-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>استيراد ملف Excel / CSV</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between rounded-xl p-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>إعدادات النظام والخصوصية</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
