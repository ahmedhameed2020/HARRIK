"use client";

import React, { useEffect, useState } from "react";
import { Fingerprint, Lock, LogOut, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";
import {
  isBiometricEnabled,
  isUnlockedThisSession,
  verifyBiometric,
} from "@/lib/biometric";
import { triggerHaptic } from "@/lib/haptics";

/**
 * Renders a full-screen biometric gate over the app when the user has enabled
 * fingerprint unlock and the current session has not yet been unlocked.
 */
export function BiometricLock({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const { lang } = useLocale();
  const t = translations[lang];
  const [locked, setLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocked(false);
      return;
    }
    setLocked(isBiometricEnabled() && !isUnlockedThisSession());
  }, [user, isLoading]);

  const handleUnlock = async () => {
    setIsVerifying(true);
    setError(null);
    triggerHaptic("medium");
    const res = await verifyBiometric();
    if (res.success) {
      triggerHaptic("success");
      setLocked(false);
    } else {
      triggerHaptic("error");
      setError(res.error || t.bioUnlock);
    }
    setIsVerifying(false);
  };
  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-qatar shadow-2xl shadow-qatar/40">
          <Lock className="h-9 w-9 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-black font-arabic">{t.bioLockTitle}</h1>
        <p className="mt-2 max-w-xs text-sm text-slate-400">{t.bioLockBody}</p>

        <button
          type="button"
          onClick={handleUnlock}
          disabled={isVerifying}
          className="mt-8 flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-qatar px-8 py-4 text-sm font-bold text-white shadow-xl shadow-qatar/30 transition active:scale-[0.98] disabled:opacity-60"
        >
          {isVerifying ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Fingerprint className="h-6 w-6" />
          )}
          <span>{isVerifying ? t.bioVerifying : t.bioUnlock}</span>
        </button>

        {error && (
          <p className="mt-4 text-xs font-semibold text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-slate-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{t.bioLockLogout}</span>
        </button>
      </motion.div>
    </div>
  );
}
