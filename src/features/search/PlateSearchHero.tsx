"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, X, Camera, Loader2, Car, AlertCircle, ArrowRight, History } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SearchResultVehicle } from "@/types";
import { translations, Language } from "@/i18n/translations";
import { VehicleResultCard } from "./VehicleResultCard";
import { PlateKeypad } from "./PlateKeypad";
import { QatarPlate } from "@/components/ui/QatarPlate";
import { triggerHaptic } from "@/lib/haptics";
import { TACTILE_TAP, DURATION, EASING } from "@/lib/motion";
import { useEntityConfig } from "@/contexts/EntityConfigContext";

const CameraPlateScanner = dynamic(
  () => import("./CameraPlateScanner").then((m) => m.CameraPlateScanner),
  { ssr: false }
);
const CreateAlertDialog = dynamic(
  () => import("../alerts/CreateAlertDialog").then((m) => m.CreateAlertDialog),
  { ssr: false }
);
const ReportUnknownDialog = dynamic(
  () => import("../unknown/ReportUnknownDialog").then((m) => m.ReportUnknownDialog),
  { ssr: false }
);
const UnregisteredEscalationHub = dynamic(
  () => import("./UnregisteredEscalationHub").then((m) => m.UnregisteredEscalationHub),
  { ssr: false }
);

interface PlateSearchHeroProps {
  lang: Language;
}

/** A plate the operator looked up from this device. */
interface RecentSearch {
  q: string;
  plate?: string;
}

const RECENT_KEY = "harrik_recent_searches";
const RECENT_MAX = 5;

function readRecentSearches(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(list: RecentSearch[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* storage disabled — the list simply stays empty */
  }
}

export function PlateSearchHero({ lang }: PlateSearchHeroProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<SearchResultVehicle | null>(null);
  const [escalation, setEscalation] = useState<{
    venueLabel?: string;
    venueNameAr?: string;
    gateSecurityPhone?: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Dialog states
  const [alertTargetVehicle, setAlertTargetVehicle] = useState<SearchResultVehicle | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isUnknownOpen, setIsUnknownOpen] = useState(false);

  const t = translations[lang];
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { settings } = useEntityConfig();
  const minDigits = settings.min_partial_digits || 3;

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  /** Keeps the device-local lookup history (newest first, de-duplicated). */
  const rememberSearch = (q: string, plate?: string) => {
    const entry: RecentSearch = { q, plate };
    const next = [entry, ...readRecentSearches().filter((item) => item.q !== q)].slice(0, RECENT_MAX);
    writeRecentSearches(next);
    setRecentSearches(next);
  };

  const clearRecentSearches = () => {
    triggerHaptic("light");
    writeRecentSearches([]);
    setRecentSearches([]);
  };

  // Perform plate lookup (network lookup begins immediately)
  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const clean = q.trim();

    if (!clean) {
      setResults([]);
      setSelectedVehicle(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSelectedVehicle(null);
    triggerHaptic("medium");

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
        if (data.results.length === 1) {
          rememberSearch(clean, data.results[0]?.plate_number);
        } else if (data.results.length > 0) {
          rememberSearch(clean);
        }
        if (data.escalation) {
          setEscalation(data.escalation);
        }
        if (data.results.length === 1) {
          setSelectedVehicle(data.results[0]);
          triggerHaptic("success");
        } else if (data.results.length > 1) {
          triggerHaptic("selection");
        } else {
          triggerHaptic("warning");
        }
      } else {
        setResults([]);
        if (data.escalation) {
          setEscalation(data.escalation);
        }
        triggerHaptic("warning");
      }
    } catch {
      setResults([]);
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced auto-search when query reaches >= 3 digits
  useEffect(() => {
    const clean = query.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (clean.length >= minDigits) {
      debounceTimerRef.current = setTimeout(() => {
        handleSearch(clean);
      }, 300);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, minDigits]);

  const handleClear = () => {
    triggerHaptic("light");
    setQuery("");
    setResults([]);
    setSelectedVehicle(null);
    setHasSearched(false);
  };

  const handleKeypadDigit = (digit: string) => {
    setQuery((prev) => prev + digit);
  };

  const handleKeypadBackspace = () => {
    setQuery((prev) => prev.slice(0, -1));
  };

  return (
    <div className="relative mx-auto max-w-xl px-4 pt-3 sm:pt-6">
      {/* Brand Context Indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-[#8a1538] dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60">
          <Car className="h-3.5 w-3.5" />
          <span>{t.descriptor}</span>
        </div>

        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white font-arabic">
          {t.searchHeroTitle}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {t.searchHeroSubtitle}
        </p>
      </div>

      {/* Signature Interactive Qatar Plate Component (Auto-collapses when active results are displayed to avoid visual duplication) */}
      <AnimatePresence initial={false}>
        {results.length === 0 && (
          <motion.div
            key="hero-qatar-plate"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: DURATION.fast, ease: EASING.standard }}
            className="mt-5 flex flex-col items-center justify-center overflow-hidden"
          >
            <QatarPlate plateNumber={query} size="lg" />

            {/* Subtle Searching Activity Indicator right below plate */}
            <div className="h-6 mt-2 flex items-center justify-center">
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: DURATION.fast, ease: EASING.entrance }}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#8a1538] dark:text-rose-400"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{lang === "ar" ? "جاري البحث عن المركبة…" : "Searching…"}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prominent Mobile-First Search Input Box */}
      <div className="mt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative"
        >
          <div className="relative flex items-center overflow-hidden rounded-[20px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-card shadow-sm transition-all focus-within:border-[#8a1538] focus-within:ring-2 focus-within:ring-[#8a1538]/20">
            <div className="flex h-14 w-11 items-center justify-center text-slate-400 flex-shrink-0">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#8a1538] dark:text-rose-400" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </div>

            <input
              type="text"
              inputMode="numeric"
              dir={query ? "ltr" : (lang === "ar" ? "rtl" : "ltr")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length === 0) {
                  handleClear();
                }
              }}
              placeholder={t.plateInputPlaceholder}
              aria-label={t.plateInputPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              className={`h-14 flex-1 min-w-0 bg-transparent px-2 text-lg sm:text-xl font-bold tracking-wider text-slate-950 dark:text-white placeholder:text-slate-400 placeholder:font-normal placeholder:text-sm focus:outline-none ${
                query ? "font-mono text-left" : ""
              }`}
              autoFocus
            />

            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition flex-shrink-0"
                aria-label={t.clearInput}
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || !query.trim()}
              whileTap={shouldReduceMotion ? undefined : TACTILE_TAP}
              className={`m-1.5 flex h-11 min-w-[96px] items-center justify-center rounded-[14px] px-4 text-xs font-bold shadow-sm transition-all flex-shrink-0 sm:text-sm ${
                query.trim() && !isLoading
                  ? "bg-[#8a1538] text-white hover:bg-[#70112e] hover:shadow-md"
                  : "cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800/70 dark:text-zinc-400"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t.searching}</span>
                </span>
              ) : (
                t.searchButton
              )}
            </motion.button>
          </div>
        </form>

        {/* Tactile Tools Row (Keypad & Camera) */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setShowKeypad((prev) => !prev);
            }}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all border ${
              showKeypad
                ? "bg-[#8a1538] text-white border-[#8a1538] shadow-sm shadow-[#8a1538]/20"
                : "bg-white dark:bg-surface-card border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
            }`}
            title={lang === "ar" ? "لوحة الأرقام الملموسة" : "Numeric keypad"}
          >
            <span>🔢</span>
            <span>{lang === "ar" ? "أرقام اللوحة" : "Numeric Keypad"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setIsCameraOpen(true);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:text-[#8a1538] hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            title={lang === "ar" ? "مسح اللوحة بالكاميرا" : "Scan plate with camera"}
          >
            <Camera className="h-4 w-4 text-[#8a1538] dark:text-rose-400" />
            <span>{lang === "ar" ? "مسح بالكاميرا" : "Scan Plate"}</span>
          </button>
        </div>

        {/* Recent searches — device-local, no server round-trip */}
        {!hasSearched && recentSearches.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                {lang === "ar" ? "أحدث عمليات البحث على هذا الجهاز" : "Recent searches on this device"}
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:text-qatar dark:text-zinc-500 dark:hover:text-rose-400"
              >
                {lang === "ar" ? "مسح" : "Clear"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setQuery(item.q);
                    handleSearch(item.q);
                  }}
                  className="group flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-qatar/40 hover:text-qatar dark:border-zinc-800 dark:bg-surface-card dark:text-zinc-200 dark:hover:border-rose-500/40"
                >
                  <Search className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-qatar dark:text-zinc-500" aria-hidden="true" />
                  <span className="font-mono">{item.plate ?? item.q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Tactile Keypad */}
        <AnimatePresence>
          {showKeypad && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DURATION.fast, ease: EASING.standard }}
              className="mt-3 overflow-hidden"
            >
              <PlateKeypad
                onDigitPress={handleKeypadDigit}
                onBackspace={handleKeypadBackspace}
                onClear={handleClear}
                onSearch={() => handleSearch()}
                canSearch={query.trim().length > 0}
                onClose={() => setShowKeypad(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Area with Motion Continuity */}
      <div className="mt-6 space-y-4">
        {/* Ambiguous Multi-Matches Selector */}
        {!isLoading && hasSearched && results.length > 1 && !selectedVehicle && (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold">{t.partialNotice}</p>
            </div>

            <div className="mt-2.5 divide-y divide-amber-200/60 dark:divide-amber-900/40">
              {results.map((v) => (
                <div
                  key={v.vehicle_id}
                  onClick={() => setSelectedVehicle(v)}
                  className="flex cursor-pointer items-center justify-between py-2.5 px-2 rounded-xl transition hover:bg-amber-100/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-black text-slate-950 dark:text-white">
                      {v.plate_number}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {v.make} {v.model} ({v.color})
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-xs font-bold text-[#8a1538] dark:text-rose-400">
                    <span>{lang === "ar" ? "اختيار" : "Select"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single Match Display Card */}
        <AnimatePresence mode="wait">
          {!isLoading && hasSearched && selectedVehicle && (
            <motion.div key={selectedVehicle.vehicle_id}>
              <VehicleResultCard
                vehicle={selectedVehicle}
                lang={lang}
                onOpenAlertModal={(v) => {
                  setAlertTargetVehicle(v);
                  setIsAlertOpen(true);
                }}
              />

              {results.length > 1 && (
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  {lang === "ar" ? "← العودة إلى قائمة السيارات المطابقة" : "← Back to matching vehicles list"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty / Unregistered Escalation Hub */}
        {!isLoading && hasSearched && results.length === 0 && (
          <UnregisteredEscalationHub
            plateQuery={query}
            lang={lang}
            escalation={escalation}
            onOpenReportDialog={() => setIsUnknownOpen(true)}
            onTryAgain={handleClear}
          />
        )}
      </div>

      {/* Alert Modal */}
      <CreateAlertDialog
        isOpen={isAlertOpen}
        vehicle={alertTargetVehicle}
        lang={lang}
        onClose={() => setIsAlertOpen(false)}
        onAlertSent={() => {
          setIsAlertOpen(false);
        }}
      />

      {/* Report Unknown Modal */}
      <ReportUnknownDialog
        isOpen={isUnknownOpen}
        plateQuery={query}
        lang={lang}
        venueLabel={escalation?.venueLabel}
        gateSecurityPhone={escalation?.gateSecurityPhone}
        onClose={() => setIsUnknownOpen(false)}
      />

      {/* Camera Plate Scanner Modal */}
      <CameraPlateScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPlateDetected={(scannedPlate) => {
          setQuery(scannedPlate);
          handleSearch(scannedPlate);
        }}
        lang={lang}
      />
    </div>
  );
}
