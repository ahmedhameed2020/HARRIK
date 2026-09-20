"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  ShieldAlert,
  ArrowRight,
  Building2,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";
import { TurnstileWidget, isTurnstileEnabled } from "@/components/ui/TurnstileWidget";

interface MinimalVehicleContext {
  make: string;
  model: string;
  color: string;
  venueName?: string;
  permitKind?: string;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useLocale();
  const t = translations[lang];
  const token = searchParams.get("token")?.trim() || "";
  const legacyPlate = searchParams.get("plate")?.trim() || "";

  const [vehicle, setVehicle] = useState<MinimalVehicleContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAlertSent, setIsAlertSent] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("BLOCKING");
  const [isSending, setIsSending] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    // 1. If high-entropy permit token is provided (Recommended standard)
    if (token) {
      const verifyToken = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const res = await fetch(`/api/scan/verify?token=${encodeURIComponent(token)}`);
          const data = await res.json();

          if (res.ok && data.success && data.vehicle) {
            setVehicle(data.vehicle);
          } else {
            setErrorMessage(data.error || t.scanInvalidTitle);
          }
        } catch {
          setErrorMessage(t.scanGenericError);
        } finally {
          setIsLoading(false);
        }
      };

      verifyToken();
      return;
    }

    // 2. Legacy plate URL: Block anonymous directory exposure
    if (legacyPlate) {
      setIsLoading(false);
      setErrorMessage(
        lang === "ar"
          ? "لحماية خصوصية الكادر، لا يمكن الاستعلام المباشر عبر رقم اللوحة دون تصريح QR مشفر أو تسجيل دخول"
          : "To protect staff privacy, direct lookup by plate number requires an encrypted QR permit or sign-in"
      );
      return;
    }

    // 3. No token or plate
    router.replace("/");
  }, [token, legacyPlate, router, lang, t.scanInvalidTitle, t.scanGenericError]);

  const handleSendQuickAlert = async () => {
    if (!token) return;
    setIsSending(true);
    setRateLimitWarning(null);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/scan/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permitToken: token,
          alertType: selectedReason,
          turnstileToken,
          message:
            selectedReason === "BLOCKING"
              ? lang === "ar"
                ? "سيارتك حاجزة سيارتي يرجى التكرم بتحريكها"
                : "Your vehicle is blocking mine, please move it"
              : undefined,
        }),
      });

      const json = await res.json();

      if (res.status === 429) {
        setRateLimitWarning(json.error || t.scanConnError);
        triggerHaptic("error");
        return;
      }

      if (res.ok && json.success) {
        setIsAlertSent(true);
        triggerHaptic("success");
      } else {
        setRateLimitWarning(json.error || t.scanConnError);
        triggerHaptic("error");
      }
    } catch {
      setRateLimitWarning(t.scanConnError);
      triggerHaptic("error");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-qatar border-t-transparent mb-4" />
        <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">{t.scanVerifying}</p>
      </div>
    );
  }

  // Error / Invalid Token / Expired Pass State
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-md p-6 space-y-6 text-center animate-in fade-in duration-300">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
          <ShieldAlert className="h-12 w-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-black text-red-900 dark:text-red-200 font-arabic">
            {t.scanInvalidTitle}
          </h2>
          <p className="text-xs text-red-700 dark:text-red-300 mt-2 leading-relaxed">{errorMessage}</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-qatar py-3 text-sm font-bold text-white shadow-md transition hover:bg-qatar-800"
          >
            <span>{t.scanLoginCta}</span>
          </Link>
          <Link
            href="/"
            className="block text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400"
          >
            {t.scanBackHome}
          </Link>
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  const reasons = [
    { id: "BLOCKING", label: t.scanReasonBlocking },
    { id: "LIGHTS_ON", label: t.scanReasonLights },
    { id: "WINDOW_OPEN", label: t.scanReasonWindow },
    { id: "CONTACT_ME", label: t.scanReasonContact },
  ];

  return (
    <div className="mx-auto max-w-md p-4 space-y-5 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 mb-2">
          <Shield className="h-3.5 w-3.5" />
          <span>{t.scanPermitBadge}</span>
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white font-arabic">
          {t.scanTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.scanSubtitle}</p>
      </div>

      {/* Minimal Zero-PII Vehicle Context Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-[#0c0c0f]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-qatar/10 text-qatar dark:bg-qatar/20">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {vehicle.make} {vehicle.model}
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400">
                {t.scanVehicleColor}:{" "}
                <span className="font-bold text-slate-700 dark:text-zinc-300">{vehicle.color}</span>
              </div>
            </div>
          </div>

          {vehicle.venueName && (
            <div className="text-end">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Building2 className="h-3 w-3" />
                <span>{t.scanVenueLabel}:</span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-arabic">
                {vehicle.venueName}
              </span>
            </div>
          )}
        </div>

        {/* Reason Selector */}
        <div className="pt-4">
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
            {t.scanReasonLabel}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {reasons.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setSelectedReason(r.id);
                }}
                className={`rounded-2xl p-2.5 text-xs font-bold transition text-center ${
                  selectedReason === r.id
                    ? "bg-qatar text-white shadow-md shadow-qatar/20"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-zinc-800/80 dark:text-zinc-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Limit Warning */}
      {rateLimitWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-center text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 animate-in fade-in">
          <AlertTriangle className="h-4 w-4 inline-block me-1 text-amber-600 mb-0.5" />
          <span>{rateLimitWarning}</span>
        </div>
      )}

      {/* Action Buttons */}
      {isAlertSent ? (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-6 text-center animate-in zoom-in-95 duration-200 dark:bg-emerald-950/40 dark:border-emerald-900">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
          <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-200 font-arabic">
            {t.scanSentTitle}
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">{t.scanSentBody}</p>

          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
          >
            <span>{t.errHome}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          <TurnstileWidget onVerify={setTurnstileToken} className="flex justify-center" />
          <button
            type="button"
            onClick={handleSendQuickAlert}
            disabled={isSending || (isTurnstileEnabled() && !turnstileToken)}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-qatar py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-qatar/25 transition active:scale-[0.98] hover:bg-qatar-800 disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            <span>{isSending ? t.scanSending : t.scanSendBtn}</span>
          </button>
        </div>
      )}

      {/* Micro back link */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {t.scanGoHome}
        </Link>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-qatar border-t-transparent" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
