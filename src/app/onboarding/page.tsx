"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Palette,
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Rocket,
  Upload,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";

interface OnboardingData {
  organization: {
    id: string;
    name_ar: string;
    name_en: string;
    entity_type: string;
    status: string;
    onboarding_status: string;
  };
  settings: {
    privacy_mode: "mode_a" | "mode_b" | "mode_c";
    branding: {
      venue_label?: string;
      gate_security_phone?: string;
      primary_color?: string;
      custom_whatsapp_template?: string;
    };
  };
  stats: { departments: number; members: number; vehicles: number };
}

export default function OnboardingSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const { lang, dir } = useLocale();
  const t = translations[lang];

  const [data, setData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [venueLabel, setVenueLabel] = useState("");
  const [gatePhone, setGatePhone] = useState("");
  const [privacyMode, setPrivacyMode] = useState<"mode_a" | "mode_b" | "mode_c">("mode_a");
  const [primaryColor, setPrimaryColor] = useState("#8A1538");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setVenueLabel(json.settings?.branding?.venue_label || json.organization?.name_ar || "");
        setGatePhone(json.settings?.branding?.gate_security_phone || "+974 4400 0000");
        setPrivacyMode(json.settings?.privacy_mode || "mode_a");
        setPrimaryColor(json.settings?.branding?.primary_color || "#8A1538");
        setWhatsappTemplate(json.settings?.branding?.custom_whatsapp_template || "");
      } else {
        setMessage({ type: "error", text: json.error || t.onbLoadError });
      }
    } catch {
      setMessage({ type: "error", text: t.scanConnError });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          venue_label: venueLabel,
          gate_security_phone: gatePhone,
          privacy_mode: privacyMode,
          branding: { primary_color: primaryColor },
          custom_whatsapp_template: whatsappTemplate,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        setMessage({ type: "success", text: t.onbSaved });
        load();
      } else {
        triggerHaptic("error");
        setMessage({ type: "error", text: json.error || t.onbLoadError });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const complete = async () => {
    setIsCompleting(true);
    setMessage(null);
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerHaptic("success");
        setMessage({ type: "success", text: json.message || t.onbActivate });
        await supabase.auth.refreshSession();
        setTimeout(() => {
          router.push("/admin");
          router.refresh();
        }, 1200);
      } else {
        triggerHaptic("error");
        setMessage({ type: "error", text: json.error || t.onbLoadError });
      }
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-qatar" />
      </div>
    );
  }

  const settingsDone = data?.organization.onboarding_status !== "admin_assigned";
  const hasTeam = (data?.stats.members ?? 0) > 1 || (data?.stats.vehicles ?? 0) > 0;

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-qatar text-white shadow-md shadow-qatar/25">
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-arabic">{t.onbTitle}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data?.organization.name_ar} — {t.onbSubtitleSuffix}
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Step 1 */}
        <StepCard
          icon={<Building2 className="h-5 w-5" />}
          title={t.onbStep1}
          done
          subtitle={data?.organization.name_ar}
        />

        {/* Step 2 */}
        <StepCard icon={<Palette className="h-5 w-5" />} title={t.onbStep2} done={settingsDone} subtitle={t.onbStep2Sub}>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t.onbVenueLabel}</label>
              <input value={venueLabel} onChange={(e) => setVenueLabel(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t.onbGatePhone}</label>
              <input value={gatePhone} onChange={(e) => setGatePhone(e.target.value)} className={inputClass} dir="ltr" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t.onbWhatsappTemplate}</label>
              <textarea
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                rows={3}
                placeholder={t.onbTemplatePlaceholder}
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-[10px] text-slate-400">{t.onbTemplateVars}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t.onbPrivacy}</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { id: "mode_a", label: t.onbModeOpen },
                  { id: "mode_b", label: t.onbModeMedium },
                  { id: "mode_c", label: t.onbModeRestricted },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrivacyMode(m.id as any)}
                    className={`rounded-2xl border px-4 py-2.5 text-xs font-bold transition ${
                      privacyMode === m.id
                        ? "border-qatar bg-qatar text-white"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveSettings}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-qatar px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition hover:bg-qatar-800 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{t.onbSave}</span>
              </button>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700" />
                <span className="text-[10px] font-bold text-slate-500">{t.onbPrimaryColor}</span>
              </div>
            </div>
          </div>
        </StepCard>

        {/* Step 3 */}
        <StepCard
          icon={<Users className="h-5 w-5" />}
          title={t.onbStep3}
          done={hasTeam}
          subtitle={`${t.onbMembers}: ${data?.stats.members ?? 0} • ${t.onbVehicles}: ${data?.stats.vehicles ?? 0}`}
        >
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/admin/import" className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Upload className="h-3.5 w-3.5 text-qatar" />
              <span>{t.onbImport}</span>
            </Link>
            <Link href="/admin/staff" className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Users className="h-3.5 w-3.5 text-qatar" />
              <span>{t.onbAddStaff}</span>
            </Link>
          </div>
        </StepCard>

        {/* Step 4 */}
        <div className="mt-4 rounded-3xl border border-qatar/30 bg-qatar/5 p-6 dark:bg-qatar/10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qatar text-white">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white font-arabic">{t.onbStep4}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.onbStep4Sub}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={complete}
              disabled={isCompleting}
              className="inline-flex items-center gap-2 rounded-2xl bg-qatar px-6 py-3 text-sm font-bold text-white shadow-lg shadow-qatar/25 transition hover:bg-qatar-800 disabled:opacity-50"
            >
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{isCompleting ? t.onbActivating : t.onbActivate}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400">
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            <span>{t.onbSkip}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white";

function StepCard({
  icon,
  title,
  subtitle,
  done,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0c0c0f]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
          {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white font-arabic">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
