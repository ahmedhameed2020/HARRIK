"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";

function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS: Record<"ar" | "en", string[]> = {
  ar: ["ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية"],
  en: ["Very weak", "Weak", "Fair", "Good", "Strong"],
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const { lang, dir } = useLocale();
  const t = translations[lang];

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A recovery link signs the user in with a temporary session.
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setIsReady(Boolean(data.session));
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setIsReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage(t.passwordTooShort);
      triggerHaptic("warning");
      return;
    }
    if (password !== confirm) {
      setErrorMessage(t.passwordMismatch);
      triggerHaptic("warning");
      return;
    }

    setIsLoading(true);
    triggerHaptic("light");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        triggerHaptic("error");
        setErrorMessage(error.message);
      } else {
        triggerHaptic("success");
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      triggerHaptic("error");
      setErrorMessage(t.scanConnError);
    } finally {
      setIsLoading(false);
    }
  };

  const score = passwordScore(password);

  return (
    <div dir={dir} className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-qatar text-white shadow-xl shadow-qatar/30">
            <Car className="h-8 w-8" />
          </div>
          <h1 className="heading-page font-arabic">{t.resetTitle}</h1>
        </div>

        {done ? (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{t.resetSuccessTitle}</p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{t.resetRedirecting}</p>
          </div>
        ) : !isReady ? (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-600" />
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{t.resetInvalidTitle}</p>
            <Link href="/forgot-password" className="mt-4 inline-block text-xs font-bold text-qatar hover:underline">
              {t.resetRequestNew}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.resetNewPassword}
                className="field ps-10 pe-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-400"
                aria-label="toggle password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all ${
                      score >= 3 ? "bg-emerald-500" : score >= 2 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${(score / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {t.passwordStrength}: {STRENGTH_LABELS[lang][score]}
                </span>
              </div>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t.resetConfirmPassword}
                className="field ps-10 pe-4"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-qatar py-4 text-sm font-bold text-white shadow-lg shadow-qatar/25 transition active:scale-95 hover:bg-qatar-900 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              <span>{isLoading ? t.resetSaving : t.resetSave}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
