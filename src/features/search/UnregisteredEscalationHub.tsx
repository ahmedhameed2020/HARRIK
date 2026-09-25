"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  ShieldAlert,
  Megaphone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Language } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";

interface EscalationDetails {
  venueLabel?: string;
  venueNameAr?: string;
  gateSecurityPhone?: string;
}

interface UnregisteredEscalationHubProps {
  plateQuery: string;
  lang: Language;
  escalation?: EscalationDetails;
  onOpenReportDialog: () => void;
  onTryAgain: () => void;
}

export function UnregisteredEscalationHub({
  plateQuery,
  lang,
  escalation,
  onOpenReportDialog,
  onTryAgain,
}: UnregisteredEscalationHubProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedPlate, setCopiedPlate] = useState(false);
  const [showMetrashSteps, setShowMetrashSteps] = useState(false);

  const isAr = lang === "ar";
  const venueLabel = escalation?.venueLabel || (isAr ? "المنشأة" : "the facility");
  const gatePhone = escalation?.gateSecurityPhone || "+974 4400 0000";
  const cleanPhone = gatePhone.replace(/[\s-]/g, "");

  const handleCopyPhone = () => {
    triggerHaptic("selection");
    navigator.clipboard.writeText(cleanPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyPlate = () => {
    triggerHaptic("selection");
    navigator.clipboard.writeText(plateQuery);
    setCopiedPlate(true);
    setTimeout(() => setCopiedPlate(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. Header Card: Unregistered Status & Plate Display */}
      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 via-white to-white p-6 shadow-lg shadow-amber-500/5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-[#0f0f13] dark:to-[#0f0f13]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-3.5 text-center sm:text-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2.5 py-0.5 text-caption font-extrabold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 mb-1">
                <span>{isAr ? "مركبة غير مسجلة بالكيان" : "Unregistered Vehicle"}</span>
              </div>
              <h3 className="heading-section font-arabic">
                {isAr
                  ? `السيارة غير موجودة في سجلات ${venueLabel}`
                  : `Vehicle not registered in ${venueLabel} database`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? "قد تكون السيارة لزائر خارجي أو سيارة توصيل أو غير مقيدة في النظام."
                  : "This could be an external visitor, delivery, or unlisted vehicle."}
              </p>
            </div>
          </div>

          {/* Qatar Plate Badge */}
          <div className="flex flex-col items-center shrink-0">
            <div className="inline-flex items-stretch overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-sm dark:border-zinc-300">
              <div className="flex flex-col items-center justify-center bg-qatar px-2.5 py-1 text-micro font-black text-white">
                <span>قطر</span>
                <span className="text-[8px] tracking-wider opacity-90">QATAR</span>
              </div>
              <div className="flex items-center px-3.5 py-1 font-mono text-lg font-black tracking-widest text-slate-900">
                {plateQuery}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyPlate}
              className="mt-1.5 inline-flex items-center gap-1 text-caption font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {copiedPlate ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600">{isAr ? "تم النسخ" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{isAr ? "نسخ رقم اللوحة" : "Copy plate"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Options Prompt */}
        <div className="pt-4 text-xs font-bold text-slate-600 dark:text-slate-300">
          {isAr
            ? "إذا كانت هذه السيارة تغلق عليك المسار، يرجى اتباع قنوات التواصل المعتمدة أدناه:"
            : "If this vehicle is blocking your way, please use the approved escalation channels below:"}
        </div>
      </div>

      {/* 2. Grid of Escalation Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* ACTION CARD 1: Direct On-Site Gate Security Call */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-sm transition hover:shadow-md dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-[#0c0c0f] dark:to-[#0c0c0f]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <span className="text-micro font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {isAr ? "الإجراء الأسرع ميدانياً" : "Fastest On-Site Action"}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic">
                  {isAr ? `اتصال بأمن ${venueLabel}` : `Call ${venueLabel} Security`}
                </h4>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {isAr
              ? "للمعاينة الميدانية الفورية من حارس البوابة، والنداء الداخلي، أو فحص كاميرات الدخول وسجل الزوار."
              : "For immediate on-site inspection by gate security, public address call, or CCTV entry review."}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2">
            <a
              href={`tel:${cleanPhone}`}
              onClick={() => triggerHaptic("medium")}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition active:scale-95 hover:bg-emerald-700"
            >
              <PhoneCall className="h-4 w-4" />
              <span>{isAr ? "اتصال هاتفي مباشر" : "Direct Call"}</span>
              <span className="font-mono text-xs opacity-90" dir="ltr">
                {gatePhone}
              </span>
            </a>

            <button
              type="button"
              onClick={handleCopyPhone}
              title={isAr ? "نسخ رقم الهاتف" : "Copy phone"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {copiedPhone ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* ACTION CARD 2: Dispatch Unknown Vehicle Report to /admin/unknown */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50/50 via-white to-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:from-zinc-900/30 dark:via-[#0c0c0f] dark:to-[#0c0c0f]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/20">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-micro font-black uppercase tracking-wider text-qatar dark:text-qatar-300">
                  {isAr ? "تسجيل بلاغ رسمي" : "Official Dispatch Log"}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic">
                  {isAr ? "إشعار غرفة المراقبة والأمن" : "Dispatch Security Room"}
                </h4>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {isAr
              ? "تسجيل بلاغ رسمي بمواصفات السيارة وموقعها ليصل فورياً إلى شاشات أمن المنشأة للتعامل معها."
              : "Logs vehicle specs and location instantly into the security operations console for follow-up."}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                onOpenReportDialog();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-slate-900/10 transition active:scale-95 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <Megaphone className="h-4 w-4" />
              <span>{isAr ? "تسجيل بلاغ سيارة غير معروفة" : "Report Unknown Vehicle"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Official State of Qatar Metrash2 Service Card */}
      <div className="overflow-hidden rounded-3xl border border-qatar/25 bg-gradient-to-b from-qatar/5 via-white to-white p-5 shadow-sm dark:border-qatar/40 dark:from-qatar/10 dark:via-[#0c0c0f] dark:to-[#0c0c0f]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/25">
              <span className="font-black text-xs">🇶🇦 MOI</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-qatar/10 px-2 py-0.5 text-micro font-black text-qatar dark:bg-qatar/30 dark:text-qatar-300">
                  {isAr ? "الإدارة العامة للمرور — دولة قطر" : "Qatar Traffic Directorate"}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic mt-0.5">
                {isAr ? "تنبيه السائق رسمياً عبر «مطراش 2»" : "Notify Driver Officially via Metrash2"}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setShowMetrashSteps(!showMetrashSteps);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <span>{showMetrashSteps ? (isAr ? "إخفاء الخطوات" : "Hide steps") : (isAr ? "كيفية التنبيه بمطراش" : "How to notify")}</span>
            {showMetrashSteps ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isAr
            ? "إذا كانت السيارة لزائر خارجي لا ينتمي للمنشأة، توفر وزارة الداخلية عبر تطبيق مطراش 2 خدمة رسمية لإرسال رسالة نصية SMS فورية لمالك السيارة المسجل بالمرور لتحريكها."
            : "If the vehicle belongs to an external visitor, the Ministry of Interior provides an official SMS alert service via Metrash2 to notify the driver."}
        </p>

        {/* Step-by-Step Accordion Guide */}
        {showMetrashSteps && (
          <div className="mt-4 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-inner dark:bg-zinc-900/60 dark:border-zinc-800 animate-in fade-in duration-200">
            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-qatar" />
              <span>{isAr ? "خطوات تنبيه مالك السيارة في مطراش 2:" : "Steps to notify driver in Metrash2:"}</span>
            </h5>
            <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-qatar/10 text-qatar font-bold text-micro">
                  1
                </span>
                <span>{isAr ? "افتح تطبيق «مطراش 2» على هاتفك وسجل الدخول." : "Open the Metrash2 app on your phone and log in."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-qatar/10 text-qatar font-bold text-micro">
                  2
                </span>
                <span>{isAr ? "اختر «خدمات المرور» (Traffic Services)." : "Select 'Traffic Services'."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-qatar/10 text-qatar font-bold text-micro">
                  3
                </span>
                <span>{isAr ? "اختر خدمة «المركبات الحاجزة للمواقف»." : "Choose 'Blocking Vehicles' service."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-qatar/10 text-qatar font-bold text-micro">
                  4
                </span>
                <span>
                  {isAr
                    ? `أدخل رقم اللوحة (${plateQuery}) وسيقوم المرور بإرسال رسالة رسمية لمالك السيارة فورياً.`
                    : `Enter plate number (${plateQuery}) and Traffic Police will dispatch an official SMS immediately.`}
                </span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* 4. Bottom Utilities: Try Another Search & Traffic Hotline */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onTryAgain();
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{isAr ? "البحث عن رقم لوحة آخر" : "Search another plate number"}</span>
        </button>

        <div className="flex items-center gap-2 text-caption font-bold text-slate-500 dark:text-zinc-400">
          <AlertOctagon className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span>
            {isAr
              ? "طوارئ المرور العامة (حالات الإغلاق الكامل): 999"
              : "General Traffic Emergency (Full Blockage): 999"}
          </span>
        </div>
      </div>
    </div>
  );
}
