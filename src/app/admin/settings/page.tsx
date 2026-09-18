"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Save,
  Shield,
  MessageSquare,
  Search,
  CheckCircle2,
  RefreshCw,
  School,
  Building,
  Home,
  Landmark,
  HeartPulse,
  ShoppingBag,
  Briefcase,
  Globe,
  Sliders,
  Clock,
  Download,
  AlertTriangle,
  Phone,
  Sparkles,
  Palette,
  Eye,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  ENTITY_PRESETS,
  getEntityPreset,
  EntityType,
  EntityPreset,
} from "@/lib/entity-config";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  School,
  Building,
  Home,
  Landmark,
  HeartPulse,
  ShoppingBag,
  Briefcase,
  Globe,
};

const COLOR_PRESETS = [
  { name: "عنابي قطري (رسمي)", hex: "#8A1538" },
  { name: "أزرق ملكي", hex: "#1e40af" },
  { name: "زمردي هادئ", hex: "#059669" },
  { name: "أسود فحمي فاخر", hex: "#18181b" },
  { name: "ذهبي كهرماني", hex: "#b45309" },
];

export default function SettingsPage() {
  const { refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "profile" | "privacy" | "alerts" | "operations" | "backup"
  >("profile");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    actionLink?: { label: string; href: string };
  } | null>(null);

  // Form states
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [countryCode, setCountryCode] = useState("QA");
  const [timezone, setTimezone] = useState("Asia/Qatar");
  const [defaultLanguage, setDefaultLanguage] = useState<"ar" | "en">("ar");
  const [privacyMode, setPrivacyMode] = useState<"mode_a" | "mode_b" | "mode_c">("mode_a");
  const [partialSearch, setPartialSearch] = useState(true);
  const [minDigits, setMinDigits] = useState(3);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [countryCallingCode, setCountryCallingCode] = useState("+974");

  // Branding JSON
  const [entityType, setEntityType] = useState<EntityType>("other");
  const [venueLabel, setVenueLabel] = useState("المنشأة");
  const [primaryColor, setPrimaryColor] = useState("#8A1538");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [gateSecurityPhone, setGateSecurityPhone] = useState("+974 4400 0000");
  const [operatingStart, setOperatingStart] = useState("07:00");
  const [operatingEnd, setOperatingEnd] = useState("15:00");
  const [operatingPeak, setOperatingPeak] = useState("13:00");

  // Stats
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalVehicles: 0,
    totalDepartments: 0,
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "same-origin",
      });

      if (res.status === 401) {
        setStatusMessage({
          type: "error",
          text: "جلسة التسجيل منتهية أو لم يتم تسجيل الدخول بعد كمدير نظام.",
          actionLink: { label: "تسجيل الدخول كمدير", href: "/login?redirectTo=/admin/settings" },
        });
        return;
      }

      if (!res.ok) {
        throw new Error(`خطأ في الخادم (${res.status})`);
      }

      const data = await res.json();

      if (data.success && data.organization) {
        const org = data.organization;
        const set = data.settings || {};
        const b = set.branding || {};

        setNameAr(org.name_ar || "");
        setNameEn(org.name_en || "");
        setCountryCode(org.country_code || "QA");
        setTimezone(org.timezone || "Asia/Qatar");
        setDefaultLanguage(org.default_language || "ar");

        setPrivacyMode(set.privacy_mode || "mode_a");
        setPartialSearch(set.partial_search_enabled !== false);
        setMinDigits(set.min_partial_digits || 3);
        setWhatsappEnabled(set.whatsapp_enabled !== false);
        setCountryCallingCode(set.country_calling_code || "+974");

        if (b.entity_type) setEntityType(b.entity_type);
        if (b.venue_label) setVenueLabel(b.venue_label);
        if (b.primary_color) setPrimaryColor(b.primary_color);
        if (b.custom_whatsapp_template) setWhatsappTemplate(b.custom_whatsapp_template);
        if (b.gate_security_phone) setGateSecurityPhone(b.gate_security_phone);

        if (b.operating_hours) {
          if (b.operating_hours.start) setOperatingStart(b.operating_hours.start);
          if (b.operating_hours.end) setOperatingEnd(b.operating_hours.end);
          if (b.operating_hours.peak) setOperatingPeak(b.operating_hours.peak);
        }

        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "تعذر استرجاع الإعدادات من الخادم",
        });
      }
    } catch (err: any) {
      console.warn("Failed to fetch settings:", err);
      setStatusMessage({
        type: "error",
        text: "تعذر الاتصال بالخادم حالياً. يرجى التأكد من تشغيل الخادم والاتصال بالشبكة.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSelectPreset = (preset: EntityPreset) => {
    triggerHaptic("selection");
    setEntityType(preset.type);
    setVenueLabel(preset.venueLabelAr);
    if (!whatsappTemplate || whatsappTemplate === ENTITY_PRESETS.find((p) => p.type === entityType)?.defaultWhatsappTemplate) {
      setWhatsappTemplate(preset.defaultWhatsappTemplate);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    triggerHaptic("medium");

    try {
      const payload = {
        name_ar: nameAr,
        name_en: nameEn,
        country_code: countryCode,
        timezone: timezone,
        default_language: defaultLanguage,
        privacy_mode: privacyMode,
        partial_search_enabled: partialSearch,
        min_partial_digits: minDigits,
        whatsapp_enabled: whatsappEnabled,
        country_calling_code: countryCallingCode,
        branding: {
          entity_type: entityType,
          venue_label: venueLabel,
          primary_color: primaryColor,
          custom_whatsapp_template: whatsappTemplate,
          gate_security_phone: gateSecurityPhone,
          operating_hours: {
            start: operatingStart,
            end: operatingEnd,
            peak: operatingPeak,
          },
        },
      };

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        triggerHaptic("error");
        setStatusMessage({
          type: "error",
          text: "انتهت صلاحية جلسة تسجيل الدخول. يرجى إعادة تسجيل الدخول كمدير للنظام لمتابعة الحفظ.",
          actionLink: { label: "تسجيل الدخول كمدير", href: "/login?redirectTo=/admin/settings" },
        });
        return;
      }

      const json = await res.json();

      if (res.ok && json.success) {
        triggerHaptic("success");
        setStatusMessage({
          type: "success",
          text: "تم حفظ إعدادات وهوية المنشأة وتطبيقها فورياً على كامل النظام!",
        });
        await refreshProfile();
      } else {
        triggerHaptic("error");
        setStatusMessage({
          type: "error",
          text: json.error || "فشل حفظ الإعدادات",
        });
      }
    } catch (err: any) {
      triggerHaptic("error");
      const isFetchError = err.name === "TypeError" || err.message?.includes("fetch");
      setStatusMessage({
        type: "error",
        text: isFetchError
          ? "تعذر الاتصال بالخادم لإتمام الحفظ. يرجى التحقق من اتصال الشبكة وإعادة المحاولة."
          : (err.message || "حدث خطأ غير متوقع أثناء الحفظ"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Export full JSON database backup
  const handleExportBackup = () => {
    triggerHaptic("medium");
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      system: "HARRIK V1.0 Smart Parking",
      organization: {
        name_ar: nameAr,
        name_en: nameEn,
        entity_type: entityType,
        country_code: countryCode,
        timezone: timezone,
      },
      stats,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HARRIK_Backup_${nameEn.replace(/\s+/g, "_") || "Org"}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-qatar" />
        <p className="text-sm font-bold text-slate-500 font-arabic">
          جارٍ استرجاع هوية وإعدادات المنشأة...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Identity Lockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-arabic">
                إعدادات وهوية المنشأة (Organization & System Settings)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                تخصيص الكيان (مدرسة، برج، مجمع سكني، هيئة حكومية، مستشفى...)، سياسات الخصوصية، وقواعد المواقف
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-qatar px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-xs font-bold shadow-sm animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.actionLink && (
            <Link
              href={statusMessage.actionLink.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition active:scale-95"
            >
              <span>{statusMessage.actionLink.label}</span>
            </Link>
          )}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto no-scrollbar dark:border-zinc-800">
        {[
          { id: "profile", label: "هوية الكيان والمنشأة", icon: Building2 },
          { id: "privacy", label: "الخصوصية والبحث", icon: Shield },
          { id: "alerts", label: "البلاغات ورسائل واتساب", icon: MessageSquare },
          { id: "operations", label: "ساعات العمل وبوابة الأمن", icon: Clock },
          { id: "backup", label: "النسخ الاحتياطي والحوكمة", icon: Sliders },
        ].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setActiveTab(tab.id as any);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* =================================================================== */}
        {/* TAB 1: VENUE & ENTITY IDENTITY PROFILE */}
        {/* =================================================================== */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Entity Category Selector */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                    نوع وتصنيف المنشأة (Entity Type)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    اختر نوع الكيان لتهيئة مصطلحات النظام وقوالب الرسائل تلقائياً
                  </p>
                </div>
                <span className="rounded-full bg-qatar/10 px-3 py-1 text-xs font-bold text-qatar">
                  مخصص لكافة المنشآت
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ENTITY_PRESETS.map((preset) => {
                  const selected = entityType === preset.type;
                  const Icon = ICON_MAP[preset.iconName] || Globe;

                  return (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all active:scale-95 ${
                        selected
                          ? "border-qatar bg-qatar/5 ring-2 ring-qatar/20 dark:bg-qatar/15"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl mb-2 transition-colors ${
                          selected
                            ? "bg-qatar text-white shadow-md shadow-qatar/30"
                            : "bg-white text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-sm"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-arabic">
                        {preset.labelAr}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 font-sans">
                        {preset.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Smart Setup / Preset Card */}
              {(() => {
                const currentPreset = getEntityPreset(entityType);
                return (
                  <div className="mt-5 rounded-2xl border border-qatar/20 bg-gradient-to-br from-qatar/5 via-slate-50 to-amber-500/5 p-4 sm:p-5 dark:from-qatar/15 dark:via-zinc-900 dark:to-amber-500/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-qatar animate-pulse" />
                          <span className="text-xs font-black text-slate-900 dark:text-white font-arabic">
                            التهيئة الذكية للمنشأة: {currentPreset.labelAr}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300 font-arabic">
                          {currentPreset.presetSummaryAr}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            الأفراد: <strong className="text-slate-900 dark:text-white">{currentPreset.memberLabelAr}</strong>
                          </span>
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            المعرّف: <strong className="text-slate-900 dark:text-white">{currentPreset.identifierLabelAr}</strong>
                          </span>
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            الوحدة: <strong className="text-slate-900 dark:text-white">{currentPreset.unitLabelAr}</strong>
                          </span>
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            الأمن: <strong className="text-slate-900 dark:text-white">{currentPreset.securityLabelAr}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("medium");
                          setVenueLabel(currentPreset.venueLabelAr);
                          setWhatsappTemplate(currentPreset.defaultWhatsappTemplate);
                        }}
                        className="glass-btn-primary shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-md active:scale-95"
                        title="تطبيق التسميات والقالب الافتراضي لهذا النوع"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>تطبيق الإعداد والمسميات المقترحة</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Venue Names & Regional Setup */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] space-y-4">
                  <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                    البيانات الرسمية للمنشأة
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        اسم المنشأة الرسمي بالعربية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        placeholder="مثال: برج الفردان التجاري، مجمع اللؤلؤة، مدرسة قطر..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-arabic"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-sans">
                        اسم المنشأة الرسمي بالإنجليزية (English Name)
                      </label>
                      <input
                        type="text"
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        placeholder="e.g. Al Fardan Commercial Tower, The Pearl Compound..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        المسمى المختصر للمكان في الواجهات والرسائل
                      </label>
                      <input
                        type="text"
                        value={venueLabel}
                        onChange={(e) => setVenueLabel(e.target.value)}
                        placeholder="مثال: البرج، المجمع، المدرسة، الوزارة، المستشفى..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-arabic"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        يظهر في النصوص التلقائية: &quot;في مواقف {venueLabel}&quot;
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        الدولة والرمز الوطني
                      </label>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="QA">دولة قطر 🇶🇦 (+974)</option>
                        <option value="SA">المملكة العربية السعودية 🇸🇦 (+966)</option>
                        <option value="AE">الإمارات العربية المتحدة 🇦🇪 (+971)</option>
                        <option value="KW">دولة الكويت 🇰🇼 (+965)</option>
                        <option value="OM">سلطنة عمان 🇴🇲 (+968)</option>
                        <option value="BH">مملكة البحرين 🇧🇭 (+973)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        المنطقة الزمنية (Timezone)
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="Asia/Qatar">Asia/Qatar (توقيت الدوحة GMT+3)</option>
                        <option value="Asia/Riyadh">Asia/Riyadh (توقيت الرياض GMT+3)</option>
                        <option value="Asia/Dubai">Asia/Dubai (توقيت دبي GMT+4)</option>
                        <option value="Asia/Kuwait">Asia/Kuwait (توقيت الكويت GMT+3)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        اللغة الافتراضية للنظام
                      </label>
                      <select
                        value={defaultLanguage}
                        onChange={(e) => setDefaultLanguage(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="ar">العربية (Arabic - الافتراضية)</option>
                        <option value="en">English (الإنجليزية)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Primary Brand Color Selection */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]">
                  <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic mb-3">
                    اللون الرئيسي لشعار وهوية المنشأة
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => {
                          triggerHaptic("selection");
                          setPrimaryColor(color.hex);
                        }}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition border ${
                          primaryColor === color.hex
                            ? "border-slate-900 bg-slate-100 ring-2 ring-slate-900 dark:border-white dark:bg-zinc-800 dark:ring-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow-xs"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="font-arabic text-slate-800 dark:text-zinc-200">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#0c0c0f]">
                  <div className="flex items-center gap-2 text-xs font-bold text-qatar mb-4">
                    <Eye className="h-4 w-4" />
                    <span>معاينة حية لهوية المنشأة للمستخدمين</span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex items-center gap-3 border-b pb-3 border-slate-200 dark:border-zinc-800">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-xs font-black text-slate-900 dark:text-white font-arabic">
                          {nameAr || "اسم المنشأة"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {nameEn || "Organization Name"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] text-slate-400">عينة رسالة التنبيه الواردة للمالك:</span>
                      <div className="mt-1.5 rounded-xl bg-white p-3 text-xs text-slate-700 shadow-xs border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                        &quot;مرحباً، سيارتك متوقفة أمام سيارتي في مواقف <strong>{venueLabel || "المكان"}</strong>. يرجى التكرم بتحريكها.&quot;
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 border-t pt-3 border-slate-200 dark:border-zinc-800">
                      <span>الرمز الهاتفي:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {countryCallingCode} ({countryCode})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PRIVACY MODES & SEARCH CONFIGURATION */}
        {/* =================================================================== */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-qatar" />
                <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                  مستويات خصوصية بيانات أصحاب السيارات (Privacy Policies)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                حدد مستوى الشفافية والتواصل المناسب لطبيعة منشأتك (الموظفين، السكان، المراجعين)
              </p>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: "mode_a",
                    title: "الوضع (A): الشفافية الكاملة (موصى به للمدارس والمقرات المغلقة)",
                    desc: "إظهار اسم المالك والقسم ورقم الهاتف مع أزرار الاتصال والواتساب السريعة لتيسير الحل المباشر بين الزملاء.",
                  },
                  {
                    id: "mode_b",
                    title: "الوضع (B): حماية الخصوصية (موصى به للأبراج والمجمعات التجارية)",
                    desc: "إظهار الاسم وأزرار الاتصال/الواتساب المشفرة فقط مع إخفاء رقم الهاتف النصي لمنع نسخه أو حفظه.",
                  },
                  {
                    id: "mode_c",
                    title: "الوضع (C): التنبيه الداخلي فقط (للمنشآت العسكرية أو عالية الحساسية)",
                    desc: "إخفاء بيانات المالك وأرقام الهواتف بالكامل، والاعتماد فقط على إرسال تنبيه إلكتروني داخلي يصله على شاشته.",
                  },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-all ${
                      privacyMode === mode.id
                        ? "border-qatar bg-qatar/5 ring-2 ring-qatar/15 dark:bg-qatar/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy_mode"
                      value={mode.id}
                      checked={privacyMode === mode.id}
                      onChange={() => setPrivacyMode(mode.id as any)}
                      className="mt-1 h-4 w-4 accent-qatar"
                    />
                    <div>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-arabic">
                        {mode.title}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-arabic">
                        {mode.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Plate Search Rules */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-qatar" />
                <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                  قواعد وآليات البحث باللوحة (Search Engine Rules)
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-arabic">
                      البحث الجزئي برقم اللوحة (Partial Search)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      السماح بالبحث عبر آخر خانات من اللوحة لتسهيل العثور السريع
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={partialSearch}
                    onChange={(e) => setPartialSearch(e.target.checked)}
                    className="h-5 w-5 rounded accent-qatar"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-arabic">
                      الحد الأدنى للأرقام لبدء البحث التلقائي
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      الافتراضي الموصى به: 3 أرقام لمنع التشابه العالي
                    </p>
                  </div>
                  <select
                    value={minDigits}
                    onChange={(e) => setMinDigits(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold font-mono dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value={2}>2 أرقام</option>
                    <option value={3}>3 أرقام (موصى به)</option>
                    <option value={4}>4 أرقام</option>
                    <option value={5}>5 أرقام</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PARKING ALERTS & WHATSAPP TEMPLATES */}
        {/* =================================================================== */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                  تخصيص رسائل واتساب الرسمية (WhatsApp Integration)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                صياغة النص المعتمد الذي يرسله النظام عند النقر على زر واتساب للتواصل مع صاحب السيارة
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                  نص الرسالة المعتمد (WhatsApp Template)
                </label>
                <textarea
                  rows={4}
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-arabic"
                  placeholder="أدخل نص الرسالة مع إمكانية استخدام المتغيرات..."
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-bold">المتغيرات المتاحة للإدراج:</span>
                  <button
                    type="button"
                    onClick={() => setWhatsappTemplate((prev) => prev + " {plate} ")}
                    className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold hover:bg-slate-200 dark:bg-zinc-800 text-qatar"
                  >
                    {"{plate}"} رقم اللوحة
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappTemplate((prev) => prev + " {venue_name} ")}
                    className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold hover:bg-slate-200 dark:bg-zinc-800 text-blue-600"
                  >
                    {"{venue_name}"} اسم المنشأة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: OPERATIONS & GATE SECURITY */}
        {/* =================================================================== */}
        {activeTab === "operations" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-qatar" />
                <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                  ساعات العمل وأوقات الذروة لمواقف المنشأة
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                تساعد هذه المواعيد في ضبط تحليلات الذروة ورسوم Recharts البيانية
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                    بداية الدوام / فتح البوابات
                  </label>
                  <input
                    type="time"
                    value={operatingStart}
                    onChange={(e) => setOperatingStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                    ساعة الذروة المتوقعة
                  </label>
                  <input
                    type="time"
                    value={operatingPeak}
                    onChange={(e) => setOperatingPeak(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                    نهاية الدوام / إغلاق البوابات
                  </label>
                  <input
                    type="time"
                    value={operatingEnd}
                    onChange={(e) => setOperatingEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                  هاتف مكتب أمن المواقف / الاستقبال السريع (Gate Security Phone)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={gateSecurityPhone}
                    onChange={(e) => setGateSecurityPhone(e.target.value)}
                    placeholder="+974 4400 0000"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يظهر في أسفل بطاقات السيارات كجهة طوارئ بديلة في حال عدم استجابة المالك
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: BACKUP & DATA GOVERNANCE */}
        {/* =================================================================== */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-950 dark:text-white font-arabic">
                    إحصائيات وسلامة بيانات المنشأة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    نظرة شاملة على السجلات النشطة في قاعدة بيانات Supabase
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تصدير نسخة احتياطية (JSON)</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {stats.totalStaff}
                  </span>
                  <span className="block text-xs text-slate-500 font-arabic mt-1">
                    موظف / مستخدم مسجل
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 text-center">
                  <span className="text-2xl font-black text-qatar font-mono">
                    {stats.totalVehicles}
                  </span>
                  <span className="block text-xs text-slate-500 font-arabic mt-1">
                    مركبة مسجلة بالدليل
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 text-center">
                  <span className="text-2xl font-black text-blue-600 font-mono">
                    {stats.totalDepartments}
                  </span>
                  <span className="block text-xs text-slate-500 font-arabic mt-1">
                    أقسام / إدارات معتمدة
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Bar at Bottom */}
        <div className="sticky bottom-6 z-30 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-arabic">
              التغييرات تُحفظ في قاعدة بيانات Supabase وتُسجل في سجل التدقيق الأمني
            </span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-qatar px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-qatar/25 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
