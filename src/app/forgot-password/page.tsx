"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Car, Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";

export default function ForgotPasswordPage() {
  const { lang, dir } = useLocale();
  const t = translations[lang];
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(t.forgotEmailRequired);
      return;
    }

    setIsLoading(true);
    triggerHaptic("light");

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/reset-password`,
      });

      if (error) {
        triggerHaptic("error");
        setErrorMessage(error.message);
      } else {
        triggerHaptic("success");
        setSent(true);
      }
    } catch {
      triggerHaptic("error");
      setErrorMessage(t.scanConnError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir={dir} className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-qatar text-white shadow-xl shadow-qatar/30">
            <Car className="h-8 w-8" />
          </div>
          <h1 className="heading-page font-arabic">{t.forgotTitle}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.forgotSubtitle}</p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{t.forgotSentTitle}</p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{t.forgotSentBody}</p>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-qatar hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span>{t.forgotBackLogin}</span>
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
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="field ps-10 pe-4"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-qatar py-4 text-sm font-bold text-white shadow-lg shadow-qatar/25 transition active:scale-95 hover:bg-qatar-900 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              <span>{isLoading ? t.forgotSending : t.forgotSend}</span>
            </button>

            <div className="text-center">
              <Link href="/login" className="inline-flex min-h-[44px] items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400">
                {t.forgotBackLogin}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
