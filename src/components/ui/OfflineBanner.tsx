"use client";

import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { translations } from "@/i18n/translations";

/**
 * Displays a slim banner when the device goes offline, so users understand why
 * live data (search, alerts, realtime) may be stale.
 */
export function OfflineBanner() {
  const { lang } = useLocale();
  const t = translations[lang];
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-16 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-[11px] font-bold text-white">
      <WifiOff className="h-3.5 w-3.5" />
      <span>{t.offlineBanner}</span>
    </div>
  );
}
