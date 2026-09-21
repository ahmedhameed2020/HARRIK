"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useLocale } from "@/contexts/LocaleContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallPrompt() {
  const { lang } = useLocale();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed in this session
    if (sessionStorage.getItem("harrik_pwa_dismissed") === "true") {
      setIsDismissed(true);
    }

    // Check iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Listen for beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic("selection");

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      setIsDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    triggerHaptic("light");
    setIsDismissed(true);
    sessionStorage.setItem("harrik_pwa_dismissed", "true");
  };

  // Don't render if running as standalone PWA, dismissed, or no prompt available on desktop
  if (isStandalone || isDismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      {/* Floating Bottom Glass Banner */}
      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg animate-in slide-in-from-bottom-5 duration-300 md:bottom-6 md:right-6 md:left-auto md:w-96">
        <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 text-white">
          {/* Subtle Qatar Glow Accent */}
          <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-qatar/30 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-qatar text-white shadow-md shadow-qatar/30">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black font-arabic">{lang === "ar" ? "تثبيت تطبيق حَرِّك" : "Install the HARRIK app"}</h4>
              <p className="text-caption text-slate-300">
                {lang === "ar" ? "أيقونة سريعة واستقبال فوري للتنبيهات" : "Quick icon and instant alert delivery"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-qatar px-3.5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-qatar-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{lang === "ar" ? "تثبيت" : "Install"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in slide-in-from-bottom-8 duration-300">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute left-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-qatar text-white shadow-lg shadow-qatar/25">
                <Smartphone className="h-7 w-7" />
              </div>
              <h3 className="mt-3 heading-section font-arabic">
                {lang === "ar" ? "تثبيت حَرِّك على أجهزة iPhone و iPad" : "Install HARRIK on iPhone & iPad"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar" ? "اتبع الخطوتين التاليتين لإضافة التطبيق لشاشتك الرئيسية:" : "Follow these two steps to add the app to your Home Screen:"}
              </p>
            </div>

            <div className="mt-6 space-y-3.5">
              <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                  <Share className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">{lang === "ar" ? "١. اضغط على زر المشاركة" : "1. Tap the Share button"}</p>
                  <p className="text-slate-500 dark:text-slate-400">{lang === "ar" ? "في شريط متصفح Safari بالأسفل" : "In the Safari browser bar at the bottom"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-white">
                  <PlusSquare className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">{lang === "ar" ? "٢. اختر «إضافة إلى الصفحة الرئيسية»" : "2. Choose “Add to Home Screen”"}</p>
                  <p className="text-slate-500 dark:text-slate-400">&quot;Add to Home Screen&quot;</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition active:scale-95 dark:bg-white dark:text-slate-900"
            >
              {lang === "ar" ? "فهمت ذلك" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
