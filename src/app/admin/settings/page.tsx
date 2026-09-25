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
  Network,
  Download,
  AlertTriangle,
  Phone,
  Sparkles,
  Palette,
  Eye,
  Plus,
  Trash2,
  Check,
  Loader2,
  Bell,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { DepartmentKind } from "@/types";
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
  { name: "عنابي قطري (رسمي)", nameEn: "Qatar Maroon (official)", hex: "#8A1538" },
  { name: "أزرق ملكي", nameEn: "Royal blue", hex: "#1e40af" },
  { name: "زمردي هادئ", nameEn: "Calm emerald", hex: "#059669" },
  { name: "أسود فحمي فاخر", nameEn: "Premium charcoal", hex: "#18181b" },
  { name: "ذهبي كهرماني", nameEn: "Amber gold", hex: "#b45309" },
];

export default function SettingsPage() {
  const { refreshProfile } = useAuth();
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const isEn = lang === "en";

  const [activeTab, setActiveTab] = useState<
    "profile" | "privacy" | "alerts" | "operations" | "departments" | "backup"
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

  // ---------------------- Alert types manager (§6) ----------------------
  interface AlertTypeRow {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    icon?: string | null;
    sort_order?: number;
    is_active: boolean;
  }
  const [alertTypes, setAlertTypes] = useState<AlertTypeRow[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [typeBusyId, setTypeBusyId] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [typeDrafts, setTypeDrafts] = useState<Record<string, { name_ar: string; name_en: string }>>({});
  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTypeAr, setNewTypeAr] = useState("");
  const [newTypeEn, setNewTypeEn] = useState("");
  const [isAddingType, setIsAddingType] = useState(false);

  // ---------------------- Departments manager (migration 09) ----------------------
  interface DepartmentRow {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    kind: DepartmentKind;
    is_active: boolean;
    staffCount?: number;
  }
  const [departmentRows, setDepartmentRows] = useState<DepartmentRow[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentBusyId, setDepartmentBusyId] = useState<string | null>(null);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setIsLoadingDepartments(true);
    setDepartmentError(null);
    try {
      const res = await fetch("/api/admin/departments", { credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setDepartmentRows(
        (json.departments ?? []).map((d: any) => ({
          id: d.id,
          code: d.code,
          name_ar: d.name_ar,
          name_en: d.name_en,
          kind: (d.kind ?? "academic") as DepartmentKind,
          is_active: Boolean(d.is_active),
          staffCount: d.staffCount ?? 0,
        }))
      );
    } catch (err: any) {
      setDepartmentError(err?.message || "failed");
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const updateDepartmentKind = async (id: string, kind: DepartmentKind) => {
    setDepartmentBusyId(id);
    setDepartmentError(null);
    const previous = departmentRows;
    // Optimistic: the select should not lag behind the tap.
    setDepartmentRows((rows) => rows.map((r) => (r.id === id ? { ...r, kind } : r)));
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, kind }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || `HTTP ${res.status}`);
      triggerHaptic("success");
    } catch (err: any) {
      setDepartmentRows(previous);
      setDepartmentError(err?.message || "failed");
      triggerHaptic("error");
    } finally {
      setDepartmentBusyId(null);
    }
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "same-origin",
      });

      if (res.status === 401) {
        setStatusMessage({
          type: "error",
          text: L("جلسة التسجيل منتهية أو لم يتم تسجيل الدخول بعد كمدير نظام.", "Your session has expired or you are not signed in as an admin."),
          actionLink: { label: L("تسجيل الدخول كمدير", "Sign in as admin"), href: "/login?redirectTo=/admin/settings" },
        });
        return;
      }

      if (!res.ok) {
        throw new Error(L(`خطأ في الخادم (${res.status})`, `Server error (${res.status})`));
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
          text: data.error || L("تعذر استرجاع الإعدادات من الخادم", "Could not retrieve settings from the server"),
        });
      }
    } catch (err: any) {
      console.warn("Failed to fetch settings:", err);
      setStatusMessage({
        type: "error",
        text: L("تعذر الاتصال بالخادم حالياً. يرجى التأكد من تشغيل الخادم والاتصال بالشبكة.", "Could not reach the server. Please make sure the server is running and you are online."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Intentionally runs once on mount: this is the initial load. `fetchSettings`
  // reads `lang` (through L) for error copy, but re-fetching — and thereby
  // clobbering unsaved edits — when the operator switches language would be a
  // regression, not a fix.
  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          text: L("انتهت صلاحية جلسة تسجيل الدخول. يرجى إعادة تسجيل الدخول كمدير للنظام لمتابعة الحفظ.", "Your session has expired. Please sign in again as admin to continue saving."),
          actionLink: { label: L("تسجيل الدخول كمدير", "Sign in as admin"), href: "/login?redirectTo=/admin/settings" },
        });
        return;
      }

      const json = await res.json();

      if (res.ok && json.success) {
        triggerHaptic("success");
        setStatusMessage({
          type: "success",
          text: L("تم حفظ إعدادات وهوية المنشأة وتطبيقها فورياً على كامل النظام!", "Organization settings and branding were saved and applied immediately!"),
        });
        await refreshProfile();
      } else {
        triggerHaptic("error");
        setStatusMessage({
          type: "error",
          text: json.error || L("فشل حفظ الإعدادات", "Failed to save settings"),
        });
      }
    } catch (err: any) {
      triggerHaptic("error");
      const isFetchError = err.name === "TypeError" || err.message?.includes("fetch");
      setStatusMessage({
        type: "error",
        text: isFetchError
          ? L("تعذر الاتصال بالخادم لإتمام الحفظ. يرجى التحقق من اتصال الشبكة وإعادة المحاولة.", "Could not reach the server to save. Please check your connection and try again.")
          : (err.message || L("حدث خطأ غير متوقع أثناء الحفظ", "An unexpected error occurred while saving")),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------- Alert types manager (§6) ----------------------
  const fetchAlertTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const res = await fetch("/api/admin/alert-types");
      const json = await res.json();
      if (json.success && Array.isArray(json.alertTypes)) {
        setAlertTypes(json.alertTypes);
        const drafts: Record<string, { name_ar: string; name_en: string }> = {};
        for (const t of json.alertTypes) {
          drafts[t.id] = { name_ar: t.name_ar || "", name_en: t.name_en || "" };
        }
        setTypeDrafts(drafts);
      }
    } catch {
      // silent — the tab still renders the rest of the settings
    } finally {
      setIsLoadingTypes(false);
    }
  };

  useEffect(() => {
    fetchAlertTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the department grouping lazily, the first time its tab is opened.
  useEffect(() => {
    if (activeTab === "departments" && departmentRows.length === 0 && !departmentError) {
      fetchDepartments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleAddAlertType = async () => {
    setTypeError(null);
    if (!newTypeCode.trim() || (!newTypeAr.trim() && !newTypeEn.trim())) {
      setTypeError(L("يرجى إدخال الرمز والاسم على الأقل", "Please provide a code and at least one name"));
      return;
    }
    setIsAddingType(true);
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/admin/alert-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newTypeCode,
          name_ar: newTypeAr,
          name_en: newTypeEn,
          sort_order: (alertTypes.at(-1)?.sort_order ?? 0) + 1,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        setNewTypeCode("");
        setNewTypeAr("");
        setNewTypeEn("");
        await fetchAlertTypes();
      } else {
        triggerHaptic("error");
        setTypeError(json.error || L("تعذّر إضافة النوع", "Could not add the type"));
      }
    } catch {
      setTypeError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setIsAddingType(false);
    }
  };

  const handleSaveAlertType = async (id: string) => {
    const draft = typeDrafts[id];
    if (!draft) return;
    setTypeBusyId(id);
    setTypeError(null);
    triggerHaptic("light");
    try {
      const res = await fetch("/api/admin/alert-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name_ar: draft.name_ar, name_en: draft.name_en }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        await fetchAlertTypes();
      } else {
        triggerHaptic("error");
        setTypeError(json.error || L("تعذّر حفظ التعديلات", "Could not save changes"));
      }
    } catch {
      setTypeError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setTypeBusyId(null);
    }
  };

  const handleToggleAlertType = async (row: AlertTypeRow) => {
    setTypeBusyId(row.id);
    setTypeError(null);
    triggerHaptic("selection");
    try {
      const res = await fetch("/api/admin/alert-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAlertTypes((prev) =>
          prev.map((t) => (t.id === row.id ? { ...t, is_active: !t.is_active } : t))
        );
      } else {
        setTypeError(json.error || L("تعذّر تحديث الحالة", "Could not update the status"));
      }
    } catch {
      setTypeError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setTypeBusyId(null);
    }
  };

  const handleDeleteAlertType = async (id: string) => {
    if (
      !confirm(
        L(
          "سيتم حذف نوع التنبيه نهائياً. هل أنت متأكد؟",
          "This alert type will be permanently deleted. Continue?"
        )
      )
    )
      return;

    setTypeBusyId(id);
    setTypeError(null);
    triggerHaptic("warning");
    try {
      const res = await fetch(`/api/admin/alert-types?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        setAlertTypes((prev) => prev.filter((t) => t.id !== id));
      } else {
        triggerHaptic("error");
        setTypeError(json.error || L("تعذّر حذف النوع", "Could not delete the type"));
      }
    } catch {
      setTypeError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setTypeBusyId(null);
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
          {L("جارٍ استرجاع هوية وإعدادات المنشأة...", "Loading organization identity and settings...")}
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
                {L("إعدادات وهوية المنشأة (Organization & System Settings)", "Organization & System Settings")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                {L("تخصيص الكيان (مدرسة، برج، مجمع سكني، هيئة حكومية، مستشفى...)، سياسات الخصوصية، وقواعد المواقف", "Configure the entity (school, tower, residential compound, government, hospital...), privacy policies and parking rules")}
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
            <span>{isSaving ? L("جارٍ الحفظ...", "Saving...") : L("حفظ التغييرات", "Save changes")}</span>
          </button>
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
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
          { id: "profile", label: L("هوية الكيان والمنشأة", "Entity & organization"), icon: Building2 },
          { id: "privacy", label: L("الخصوصية والبحث", "Privacy & search"), icon: Shield },
          { id: "alerts", label: L("البلاغات ورسائل واتساب", "Alerts & WhatsApp"), icon: MessageSquare },
          { id: "operations", label: L("ساعات العمل وبوابة الأمن", "Operating hours & gate"), icon: Clock },
          { id: "departments", label: L("الأقسام والتصنيف", "Departments & grouping"), icon: Network },
          { id: "backup", label: L("النسخ الاحتياطي والحوكمة", "Backup & governance"), icon: Sliders },
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
              className={`flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-control px-4 text-caption font-bold transition-all ${
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
            <div className="surface-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="heading-card font-arabic">
                    {L("نوع وتصنيف المنشأة (Entity Type)", "Entity type & classification")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {L("اختر نوع الكيان لتهيئة مصطلحات النظام وقوالب الرسائل تلقائياً", "Choose the entity type to auto-configure system terminology and message templates")}
                  </p>
                </div>
                <span className="rounded-full bg-qatar/10 px-3 py-1 text-xs font-bold text-qatar">
                  {L("مخصص لكافة المنشآت", "Available for all facility types")}
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
                      <span className="text-micro text-slate-500 mt-0.5 font-sans">
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
                            {L("التهيئة الذكية للمنشأة:", "Smart configuration:")} {isEn ? currentPreset.labelEn : currentPreset.labelAr}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300 font-arabic">
                          {currentPreset.presetSummaryAr}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-caption text-slate-600 dark:text-zinc-400">
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            {L("الأفراد:", "Members:")} <strong className="text-slate-900 dark:text-white">{isEn ? currentPreset.memberLabelEn : currentPreset.memberLabelAr}</strong>
                          </span>
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            {L("المعرّف:", "Identifier:")} <strong className="text-slate-900 dark:text-white">{isEn ? currentPreset.identifierLabelEn : currentPreset.identifierLabelAr}</strong>
                          </span>
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            {L("الوحدة:", "Unit:")} <strong className="text-slate-900 dark:text-white">{isEn ? currentPreset.unitLabelEn : currentPreset.unitLabelAr}</strong>
                          </span>
                          <span className="rounded-lg bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 border border-slate-200 dark:border-zinc-700 shadow-xs">
                            {L("الأمن:", "Security:")} <strong className="text-slate-900 dark:text-white">{isEn ? currentPreset.securityLabelEn : currentPreset.securityLabelAr}</strong>
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
                        title={L("تطبيق التسميات والقالب الافتراضي لهذا النوع", "Apply labels and the default template for this type")}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{L("تطبيق الإعداد والمسميات المقترحة", "Apply suggested configuration & labels")}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Venue Names & Regional Setup */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="surface-card p-6 space-y-4">
                  <h3 className="heading-card font-arabic">
                    {L("البيانات الرسمية للمنشأة", "Official organization details")}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        {L("اسم المنشأة الرسمي بالعربية", "Official organization name (Arabic)")} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        placeholder={L("مثال: برج الفردان التجاري، مجمع اللؤلؤة، مدرسة قطر...", "e.g. Al Fardan Tower, The Pearl Compound, Qatar School...")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-arabic"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-sans">
                        {L("اسم المنشأة الرسمي بالإنجليزية (English Name)", "Official organization name (English)")}
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
                        {L("المسمى المختصر للمكان في الواجهات والرسائل", "Short venue label used in UI and messages")}
                      </label>
                      <input
                        type="text"
                        value={venueLabel}
                        onChange={(e) => setVenueLabel(e.target.value)}
                        placeholder={L("مثال: البرج، المجمع، المدرسة، الوزارة، المستشفى...", "e.g. Tower, Compound, School, Ministry, Hospital...")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-arabic"
                      />
                      <span className="text-micro text-slate-500 mt-1 block">
                        {L("يظهر في النصوص التلقائية:", "Appears in automatic texts:")} {isEn ? `"in ${venueLabel} parking"` : `"في مواقف ${venueLabel}"`}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        {L("الدولة والرمز الوطني", "Country & calling code")}
                      </label>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="QA">{L("دولة قطر 🇶🇦 (+974)", "Qatar 🇶🇦 (+974)")}</option>
                        <option value="SA">{L("المملكة العربية السعودية 🇸🇦 (+966)", "Saudi Arabia 🇸🇦 (+966)")}</option>
                        <option value="AE">{L("الإمارات العربية المتحدة 🇦🇪 (+971)", "United Arab Emirates 🇦🇪 (+971)")}</option>
                        <option value="KW">{L("دولة الكويت 🇰🇼 (+965)", "Kuwait 🇰🇼 (+965)")}</option>
                        <option value="OM">{L("سلطنة عمان 🇴🇲 (+968)", "Oman 🇴🇲 (+968)")}</option>
                        <option value="BH">{L("مملكة البحرين 🇧🇭 (+973)", "Bahrain 🇧🇭 (+973)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        {L("المنطقة الزمنية (Timezone)", "Timezone")}
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="Asia/Qatar">Asia/Qatar {L("(توقيت الدوحة GMT+3)", "(Doha time GMT+3)")}</option>
                        <option value="Asia/Riyadh">Asia/Riyadh {L("(توقيت الرياض GMT+3)", "(Riyadh time GMT+3)")}</option>
                        <option value="Asia/Dubai">Asia/Dubai {L("(توقيت دبي GMT+4)", "(Dubai time GMT+4)")}</option>
                        <option value="Asia/Kuwait">Asia/Kuwait {L("(توقيت الكويت GMT+3)", "(Kuwait time GMT+3)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                        {L("اللغة الافتراضية للنظام", "Default system language")}
                      </label>
                      <select
                        value={defaultLanguage}
                        onChange={(e) => setDefaultLanguage(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="ar">{L("العربية (Arabic - الافتراضية)", "Arabic (default)")}</option>
                        <option value="en">{L("English (الإنجليزية)", "English")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Primary Brand Color Selection */}
                <div className="surface-card p-6">
                  <h3 className="heading-card font-arabic mb-3">
                    {L("اللون الرئيسي لشعار وهوية المنشأة", "Primary brand color")}
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
                        className={`flex min-h-[44px] items-center gap-2 rounded-control border px-3.5 text-caption font-bold transition ${
                          primaryColor === color.hex
                            ? "border-slate-900 bg-slate-100 ring-2 ring-slate-900 dark:border-white dark:bg-zinc-800 dark:ring-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow-xs"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="font-arabic text-slate-800 dark:text-zinc-200">{isEn ? color.nameEn : color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-surface-card">
                  <div className="flex items-center gap-2 text-xs font-bold text-qatar mb-4">
                    <Eye className="h-4 w-4" />
                    <span>{L("معاينة حية لهوية المنشأة للمستخدمين", "Live preview of the organization branding")}</span>
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
                          {nameAr || L("اسم المنشأة", "Organization name")}
                        </span>
                        <span className="text-micro text-slate-500 font-sans">
                          {nameEn || "Organization Name"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-micro text-slate-500">{L("عينة رسالة التنبيه الواردة للمالك:", "Sample alert message received by the owner:")}</span>
                      <div className="mt-1.5 rounded-xl bg-white p-3 text-xs text-slate-700 shadow-xs border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                        {L("مرحباً، سيارتك متوقفة أمام سيارتي في مواقف", "Hello, your vehicle is parked in front of mine in")} <strong>{venueLabel || L("المكان", "the venue")}</strong>{L(". يرجى التكرم بتحريكها.", " parking. Please kindly move it.")}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-caption text-slate-500 border-t pt-3 border-slate-200 dark:border-zinc-800">
                      <span>{L("الرمز الهاتفي:", "Calling code:")}</span>
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
            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-qatar" />
                <h3 className="heading-card font-arabic">
                  {L("مستويات خصوصية بيانات أصحاب السيارات (Privacy Policies)", "Vehicle owner data privacy levels")}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {L("حدد مستوى الشفافية والتواصل المناسب لطبيعة منشأتك (الموظفين، السكان، المراجعين)", "Select the transparency and contact level that fits your facility (staff, residents, visitors)")}
              </p>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: "mode_a",
                    title: L("الوضع (A): الشفافية الكاملة (موصى به للمدارس والمقرات المغلقة)", "Mode (A): Full transparency (recommended for schools and closed premises)"),
                    desc: L("إظهار اسم المالك والقسم ورقم الهاتف مع أزرار الاتصال والواتساب السريعة لتيسير الحل المباشر بين الزملاء.", "Show owner name, department and phone with quick call and WhatsApp buttons for direct resolution between colleagues."),
                  },
                  {
                    id: "mode_b",
                    title: L("الوضع (B): حماية الخصوصية (موصى به للأبراج والمجمعات التجارية)", "Mode (B): Privacy protection (recommended for towers and commercial complexes)"),
                    desc: L("إظهار الاسم وأزرار الاتصال/الواتساب المشفرة فقط مع إخفاء رقم الهاتف النصي لمنع نسخه أو حفظه.", "Show the name and secure call/WhatsApp buttons only, hiding the plain phone number to prevent copying or saving."),
                  },
                  {
                    id: "mode_c",
                    title: L("الوضع (C): التنبيه الداخلي فقط (للمنشآت العسكرية أو عالية الحساسية)", "Mode (C): In-app alert only (for military or highly sensitive facilities)"),
                    desc: L("إخفاء بيانات المالك وأرقام الهواتف بالكامل، والاعتماد فقط على إرسال تنبيه إلكتروني داخلي يصله على شاشته.", "Hide owner details and phone numbers entirely, relying only on an internal electronic alert delivered to their screen."),
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
            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-qatar" />
                <h3 className="heading-card font-arabic">
                  {L("قواعد وآليات البحث باللوحة (Search Engine Rules)", "Plate search engine rules")}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-arabic">
                      {L("البحث الجزئي برقم اللوحة (Partial Search)", "Partial plate search")}
                    </span>
                    <p className="text-caption text-slate-500 dark:text-zinc-400 mt-0.5">
                      {L("السماح بالبحث عبر آخر خانات من اللوحة لتسهيل العثور السريع", "Allow searching by the plate's trailing digits for faster lookup")}
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
                      {L("الحد الأدنى للأرقام لبدء البحث التلقائي", "Minimum digits to start automatic search")}
                    </span>
                    <p className="text-caption text-slate-500 dark:text-zinc-400 mt-0.5">
                      {L("الافتراضي الموصى به: 3 أرقام لمنع التشابه العالي", "Recommended default: 3 digits to avoid excessive matches")}
                    </p>
                  </div>
                  <select
                    value={minDigits}
                    onChange={(e) => setMinDigits(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold font-mono dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value={2}>{L("2 أرقام", "2 digits")}</option>
                    <option value={3}>{L("3 أرقام (موصى به)", "3 digits (recommended)")}</option>
                    <option value={4}>{L("4 أرقام", "4 digits")}</option>
                    <option value={5}>{L("5 أرقام", "5 digits")}</option>
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
            {/* Alert types manager (§6) */}
            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-qatar" />
                  <h3 className="heading-card font-arabic">
                    {L("أنواع تنبيهات المواقف", "Parking alert types")}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-micro font-black text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {alertTypes.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchAlertTypes}
                  disabled={isLoadingTypes}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-caption font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTypes ? "animate-spin text-qatar" : ""}`} />
                  <span>{L("تحديث", "Refresh")}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {L(
                  "الأنواع المفعّلة تظهر للكادر عند إرسال تنبيه موقف. يمكنك إضافة أنواع خاصة بمنشأتك أو تعطيل غير المستخدم.",
                  "Active types appear to staff when sending a parking alert. Add facility-specific types or disable unused ones."
                )}
              </p>

              {typeError && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{typeError}</span>
                </div>
              )}

              {isLoadingTypes && alertTypes.length === 0 ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-qatar" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alertTypes.map((row) => (
                    <div
                      key={row.id}
                      className={`rounded-2xl border p-3 transition ${
                        row.is_active
                          ? "border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
                          : "border-slate-200 bg-slate-50 opacity-75 dark:border-zinc-800 dark:bg-zinc-900/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-qatar/10 px-2 py-1 font-mono text-micro font-black text-qatar">
                          {row.code}
                        </span>

                        <input
                          type="text"
                          value={typeDrafts[row.id]?.name_ar ?? row.name_ar}
                          onChange={(e) =>
                            setTypeDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                name_ar: e.target.value,
                                name_en: prev[row.id]?.name_en ?? row.name_en,
                              },
                            }))
                          }
                          placeholder={L("الاسم بالعربية", "Name (Arabic)")}
                          className="min-w-[150px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={typeDrafts[row.id]?.name_en ?? row.name_en}
                          onChange={(e) =>
                            setTypeDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                name_ar: prev[row.id]?.name_ar ?? row.name_ar,
                                name_en: e.target.value,
                              },
                            }))
                          }
                          placeholder="Name (English)"
                          dir="ltr"
                          className="min-w-[150px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveAlertType(row.id)}
                          disabled={typeBusyId === row.id}
                          title={L("حفظ", "Save")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-qatar text-white shadow-sm transition hover:bg-qatar-800 disabled:opacity-50"
                        >
                          {typeBusyId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleAlertType(row)}
                          disabled={typeBusyId === row.id}
                          className={`rounded-xl border px-3 py-2 text-caption font-bold transition disabled:opacity-50 ${
                            row.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-slate-200 bg-slate-100 text-slate-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {row.is_active ? L("مفعّل", "Active") : L("معطّل", "Disabled")}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAlertType(row.id)}
                          disabled={typeBusyId === row.id}
                          title={L("حذف", "Delete")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {alertTypes.length === 0 && !isLoadingTypes && (
                    <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                      {L(
                        "لا توجد أنواع مخصّصة — سيستخدم النظام الأنواع الخمسة الافتراضية.",
                        "No custom types yet — the system falls back to the five defaults."
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Add new type */}
              <div className="rounded-2xl border border-dashed border-slate-300 p-3 dark:border-zinc-700">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newTypeCode}
                    onChange={(e) => setNewTypeCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    dir="ltr"
                    className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newTypeAr}
                    onChange={(e) => setNewTypeAr(e.target.value)}
                    placeholder={L("الاسم بالعربية", "Name (Arabic)")}
                    className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newTypeEn}
                    onChange={(e) => setNewTypeEn(e.target.value)}
                    placeholder="Name (English)"
                    dir="ltr"
                    className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAlertType}
                    disabled={isAddingType}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-qatar px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-qatar-800 disabled:opacity-50"
                  >
                    {isAddingType ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>{L("إضافة نوع", "Add type")}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <h3 className="heading-card font-arabic">
                  {L("تخصيص رسائل واتساب الرسمية (WhatsApp Integration)", "Official WhatsApp messages")}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {L("صياغة النص المعتمد الذي يرسله النظام عند النقر على زر واتساب للتواصل مع صاحب السيارة", "Compose the approved text the system sends when the WhatsApp button is tapped")}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                  {L("نص الرسالة المعتمد (WhatsApp Template)", "Approved message text (WhatsApp Template)")}
                </label>
                <textarea
                  rows={4}
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-900 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-arabic"
                  placeholder={L("أدخل نص الرسالة مع إمكانية استخدام المتغيرات...", "Enter the message text with optional variables...")}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-slate-500">
                  <span className="font-bold">{L("المتغيرات المتاحة للإدراج:", "Available variables:")}</span>
                  <button
                    type="button"
                    onClick={() => setWhatsappTemplate((prev) => prev + " {plate} ")}
                    className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold hover:bg-slate-200 dark:bg-zinc-800 text-qatar"
                  >
                    {"{plate}"} {L("رقم اللوحة", "plate number")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappTemplate((prev) => prev + " {venue_name} ")}
                    className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold hover:bg-slate-200 dark:bg-zinc-800 text-blue-600"
                  >
                    {"{venue_name}"} {L("اسم المنشأة", "venue name")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: OPERATIONS & GATE SECURITY */}
        {/* =================================================================== */}
        {activeTab === "departments" && (
          <div className="space-y-6">
            <div className="surface-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-qatar" aria-hidden="true" />
                  <h3 className="heading-card font-arabic">
                    {L("تصنيف الأقسام", "Department grouping")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    fetchDepartments();
                  }}
                  disabled={isLoadingDepartments}
                  className="btn btn-secondary"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDepartments ? "animate-spin" : ""}`} aria-hidden="true" />
                  {L("تحديث", "Refresh")}
                </button>
              </div>
              <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">
                {L(
                  "التصنيف يُجمّع الأقسام في صفحة «تصفّح حسب القسم» على الشاشة الرئيسية: الأكاديمية أولًا ثم الإدارية ثم الخدمات المساندة.",
                  "The grouping decides how units are ordered on the home screen's browse-by-department strip: academic first, then administrative, then support."
                )}
              </p>

              {departmentError && (
                <p className="mt-3 rounded-control border border-red-200 bg-red-50 p-3 text-caption font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {L("تعذّر تحديث التصنيف", "Could not update the grouping")}: {departmentError}
                </p>
              )}

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingDepartments && departmentRows.length === 0 && (
                  <div className="space-y-3 py-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
                        <div className="ms-auto h-11 w-40 animate-pulse rounded-control bg-slate-200/70 dark:bg-slate-800/70" />
                      </div>
                    ))}
                  </div>
                )}

                {!isLoadingDepartments && departmentRows.length === 0 && !departmentError && (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                      <Network className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-body font-bold text-slate-800 dark:text-slate-200">
                      {L("لا توجد أقسام بعد", "No departments yet")}
                    </p>
                    <p className="mt-1 max-w-sm text-caption text-slate-500 dark:text-slate-400">
                      {L(
                        "أضف الأقسام من دليل الأفراد ثم صنّفها هنا.",
                        "Add units from the directory, then group them here."
                      )}
                    </p>
                  </div>
                )}

                {departmentRows.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-bold text-slate-800 dark:text-slate-100 font-arabic">
                        {lang === "ar" ? row.name_ar : row.name_en}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-micro text-slate-500 dark:text-slate-400">
                        <span className="rounded-pill bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {row.code}
                        </span>
                        <span>
                          {row.staffCount ?? 0} {L("فرد", "people")}
                        </span>
                        {!row.is_active && (
                          <span className="rounded-pill bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            {L("غير نشط", "Inactive")}
                          </span>
                        )}
                      </p>
                    </div>

                    <label className="sr-only" htmlFor={`kind-${row.id}`}>
                      {L("تصنيف القسم", "Department grouping")}
                    </label>
                    <select
                      id={`kind-${row.id}`}
                      value={row.kind}
                      disabled={departmentBusyId === row.id}
                      onChange={(e) => updateDepartmentKind(row.id, e.target.value as DepartmentKind)}
                      className="field h-11 w-full max-w-[190px] py-0 text-caption font-bold disabled:opacity-60"
                    >
                      <option value="academic">{L("أكاديمي", "Academic")}</option>
                      <option value="administrative">{L("إداري", "Administrative")}</option>
                      <option value="support">{L("خدمات مساندة", "Support")}</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="space-y-6">
            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-qatar" />
                <h3 className="heading-card font-arabic">
                  {L("ساعات العمل وأوقات الذروة لمواقف المنشأة", "Operating hours & peak times")}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {L("تساعد هذه المواعيد في ضبط تحليلات الذروة ورسوم Recharts البيانية", "These times help tune peak analytics and Recharts visualisations")}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-arabic">
                    {L("بداية الدوام / فتح البوابات", "Shift start / gates open")}
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
                    {L("ساعة الذروة المتوقعة", "Expected peak hour")}
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
                    {L("نهاية الدوام / إغلاق البوابات", "Shift end / gates close")}
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
                  {L("هاتف مكتب أمن المواقف / الاستقبال السريع (Gate Security Phone)", "Gate security / rapid reception phone")}
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
                <span className="text-micro text-slate-500 mt-1 block">
                  {L("يظهر في أسفل بطاقات السيارات كجهة طوارئ بديلة في حال عدم استجابة المالك", "Shown at the bottom of vehicle cards as a fallback contact when the owner does not respond")}
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
            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="heading-card font-arabic">
                    {L("إحصائيات وسلامة بيانات المنشأة", "Organization data statistics & health")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {L("نظرة شاملة على السجلات النشطة في قاعدة بيانات Supabase", "An overview of active records in the Supabase database")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{L("تصدير نسخة احتياطية (JSON)", "Export backup (JSON)")}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {stats.totalStaff}
                  </span>
                  <span className="block text-xs text-slate-500 font-arabic mt-1">
                    {L("موظف / مستخدم مسجل", "Registered staff / users")}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 text-center">
                  <span className="text-2xl font-black text-qatar font-mono">
                    {stats.totalVehicles}
                  </span>
                  <span className="block text-xs text-slate-500 font-arabic mt-1">
                    {L("مركبة مسجلة بالدليل", "Vehicles in the directory")}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 text-center">
                  <span className="text-2xl font-black text-blue-600 font-mono">
                    {stats.totalDepartments}
                  </span>
                  <span className="block text-xs text-slate-500 font-arabic mt-1">
                    {L("أقسام / إدارات معتمدة", "Approved units / departments")}
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
              {L("التغييرات تُحفظ في قاعدة بيانات Supabase وتُسجل في سجل التدقيق الأمني", "Changes are saved to the Supabase database and recorded in the security audit log")}
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
            <span>{isSaving ? L("جارٍ الحفظ...", "Saving...") : L("حفظ الإعدادات", "Save settings")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
