"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Car,
  Building2,
  Palette,
  ShieldCheck,
  UserCog,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";
import { TurnstileWidget, isTurnstileEnabled } from "@/components/ui/TurnstileWidget";

type EntityType =
  | "educational"
  | "commercial_tower"
  | "residential_complex"
  | "corporate"
  | "government"
  | "healthcare"
  | "mall"
  | "other";

export default function RegisterPage() {
  const { lang, dir } = useLocale();
  const t = translations[lang];

  const ENTITY_OPTIONS: Array<{ value: EntityType; label: string }> = [
    { value: "educational", label: t.entityEducational },
    { value: "commercial_tower", label: t.entityCommercialTower },
    { value: "residential_complex", label: t.entityResidential },
    { value: "corporate", label: t.entityCorporate },
    { value: "government", label: t.entityGovernment },
    { value: "healthcare", label: t.entityHealthcare },
    { value: "mall", label: t.entityMall },
    { value: "other", label: t.entityOther },
  ];

  const STEPS = [
    { id: 1, title: t.regStep1, icon: Building2 },
    { id: 2, title: t.regStep2, icon: Palette },
    { id: 3, title: t.regStep3, icon: UserCog },
    { id: 4, title: t.regStep4, icon: ShieldCheck },
  ];

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Step 1
  const [orgNameAr, setOrgNameAr] = useState("");
  const [orgNameEn, setOrgNameEn] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("educational");
  const [venueLabel, setVenueLabel] = useState("");

  // Step 2
  const [primaryColor, setPrimaryColor] = useState("#8A1538");
  const [privacyMode, setPrivacyMode] = useState<"mode_a" | "mode_b" | "mode_c">("mode_a");
  const [gateSecurityPhone, setGateSecurityPhone] = useState("+974 4400 0000");

  // Step 3
  const [adminNameAr, setAdminNameAr] = useState("");
  const [adminNameEn, setAdminNameEn] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const canProceed = () => {
    if (step === 1) return orgNameAr.trim().length >= 2;
    if (step === 2) return true;
    if (step === 3) {
      return (
        adminNameAr.trim().length >= 2 &&
        email.includes("@") &&
        mobile.replace(/\D/g, "").length >= 8 &&
        password.length >= 8 &&
        password === confirm
      );
    }
    return true;
  };

  const next = () => {
    triggerHaptic("selection");
    if (!canProceed()) {
      setErrorMessage(step === 3 && password !== confirm ? t.passwordMismatch : t.regIncomplete);
      triggerHaptic("warning");
      return;
    }
    setErrorMessage(null);
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    triggerHaptic("light");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    triggerHaptic("medium");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgNameAr,
          orgNameEn,
          entityType,
          venueLabel: venueLabel || orgNameAr,
          primaryColor,
          privacyMode,
          gateSecurityPhone,
          adminNameAr,
          adminNameEn,
          email,
          mobile,
          password,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerHaptic("success");
        setDone(true);
      } else {
        triggerHaptic("error");
        setErrorMessage(data.error || t.regIncomplete);
      }
    } catch {
      triggerHaptic("error");
      setErrorMessage(t.scanConnError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qatar text-white shadow-md shadow-qatar/20">
            <Car className="h-5 w-5" />
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-white font-arabic">{t.brandLockup}</span>
        </Link>
        <Link href="/login" className="text-xs font-bold text-qatar hover:underline">
          {t.regHaveAccount}
        </Link>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 pb-16">
        {done ? (
          <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
            <h1 className="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-arabic">
              {t.regSuccessTitle}
            </h1>
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{t.regSuccessBody}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-qatar px-6 py-3 text-sm font-bold text-white shadow-lg shadow-qatar/25 transition hover:bg-qatar-800"
            >
              <span>{t.regSuccessGo}</span>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-arabic">
                {t.regTitle}
              </h1>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">{t.regSubtitle}</p>
            </div>

            {/* Stepper */}
            <div className="mt-8 flex items-center justify-between">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isComplete = step > s.id;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                          isComplete
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : isActive
                            ? "border-qatar bg-qatar text-white shadow-md shadow-qatar/25"
                            : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <span className={`text-[10px] font-bold ${isActive ? "text-qatar" : "text-slate-500 dark:text-slate-400"}`}>
                        {s.title}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`mx-1 h-0.5 flex-1 ${step > s.id ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Card */}
            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c0c0f]">
              {errorMessage && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <Field label={t.regOrgNameAr} htmlFor="reg-org-name-ar">
                    <input id="reg-org-name-ar" value={orgNameAr} onChange={(e) => setOrgNameAr(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label={t.regOrgNameEn} htmlFor="reg-org-name-en">
                    <input id="reg-org-name-en" value={orgNameEn} onChange={(e) => setOrgNameEn(e.target.value)} className={inputClass} dir="ltr" />
                  </Field>
                  <Field label={t.regEntityType} htmlFor="reg-entity-type">
                    <select id="reg-entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)} className={inputClass}>
                      {ENTITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t.regVenueLabel} htmlFor="reg-venue-label">
                    <input id="reg-venue-label" value={venueLabel} onChange={(e) => setVenueLabel(e.target.value)} className={inputClass} />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Field label={t.regPrimaryColor} htmlFor="reg-primary-color">
                    <div className="flex items-center gap-3">
                      <input id="reg-primary-color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700" />
                      <span className="font-mono text-xs font-bold text-slate-500">{primaryColor}</span>
                    </div>
                  </Field>
                  <Field label={t.regPrivacyMode}>
                    <div className="space-y-2">
                      {[
                        { id: "mode_a", label: t.regModeOpen },
                        { id: "mode_b", label: t.regModeMedium },
                        { id: "mode_c", label: t.regModeRestricted },
                      ].map((m) => (
                        <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 text-xs font-bold dark:border-slate-800">
                          <input type="radio" name="privacy" checked={privacyMode === m.id} onChange={() => setPrivacyMode(m.id as any)} className="accent-qatar" />
                          <span className="text-slate-700 dark:text-slate-200">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label={t.regGatePhone} htmlFor="reg-gate-phone">
                    <input id="reg-gate-phone" value={gateSecurityPhone} onChange={(e) => setGateSecurityPhone(e.target.value)} className={inputClass} dir="ltr" />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Field label={t.regAdminNameAr} htmlFor="reg-admin-name-ar">
                    <input id="reg-admin-name-ar" value={adminNameAr} onChange={(e) => setAdminNameAr(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label={t.regAdminNameEn} htmlFor="reg-admin-name-en">
                    <input id="reg-admin-name-en" value={adminNameEn} onChange={(e) => setAdminNameEn(e.target.value)} className={inputClass} dir="ltr" />
                  </Field>
                  <Field label={t.regEmailLabel} htmlFor="reg-email">
                    <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@organization.com" className={inputClass} dir="ltr" autoComplete="email" />
                  </Field>
                  <Field label={t.regMobileLabel} htmlFor="reg-mobile">
                    <input id="reg-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+974 5512 3456" className={inputClass} dir="ltr" autoComplete="tel" />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={t.regPasswordLabel} htmlFor="reg-password">
                      <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.regPasswordHint} className={inputClass} autoComplete="new-password" />
                    </Field>
                    <Field label={t.regConfirmLabel} htmlFor="reg-confirm">
                      <input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={inputClass} autoComplete="new-password" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3 text-sm">
                  <ReviewRow label={t.regReviewOrg} value={orgNameAr || "—"} />
                  <ReviewRow label={t.regReviewType} value={ENTITY_OPTIONS.find((o) => o.value === entityType)?.label || "—"} />
                  <ReviewRow label={t.regReviewVenue} value={venueLabel || orgNameAr || "—"} />
                  <ReviewRow
                    label={t.regReviewPrivacy}
                    value={privacyMode === "mode_a" ? t.onbModeOpen : privacyMode === "mode_b" ? t.onbModeMedium : t.onbModeRestricted}
                  />
                  <ReviewRow label={t.regReviewAdmin} value={adminNameAr || "—"} />
                  <ReviewRow label={t.regReviewEmail} value={email || "—"} />
                  <ReviewRow label={t.regReviewMobile} value={mobile || "—"} />
                  <p className="pt-2 text-[11px] text-slate-500">{t.regTerms}</p>
                  <TurnstileWidget onVerify={setTurnstileToken} className="flex justify-center pt-2" />
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <button type="button" onClick={back} className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    <span>{t.regPrev}</span>
                  </button>
                ) : <span />}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={next}
                    disabled={!canProceed()}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-qatar px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition hover:bg-qatar-800 disabled:opacity-50"
                  >
                    <span>{t.regNext}</span>
                    <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (isTurnstileEnabled() && !turnstileToken)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-qatar px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-qatar/25 transition hover:bg-qatar-800 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>{isSubmitting ? t.regCreating : t.regCreate}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white";

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  /** When provided the label is programmatically linked to the control. */
  htmlFor?: string;
}) {
  const labelClass =
    "mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300";
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
