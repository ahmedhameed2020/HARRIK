"use client";

import React, { useState, useEffect } from "react";
import { Search, X, AlertCircle, Car, ArrowRight, Check } from "lucide-react";
import { SearchResultVehicle } from "@/types";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { translations, Language } from "@/i18n/translations";
import { VehicleResultCard } from "./VehicleResultCard";
import { CreateAlertDialog } from "../alerts/CreateAlertDialog";
import { ReportUnknownDialog } from "../unknown/ReportUnknownDialog";

interface PlateSearchHeroProps {
  lang: Language;
}

export function PlateSearchHero({ lang }: PlateSearchHeroProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<SearchResultVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dialog states
  const [alertTargetVehicle, setAlertTargetVehicle] = useState<SearchResultVehicle | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isUnknownOpen, setIsUnknownOpen] = useState(false);

  const t = translations[lang];

  // Perform plate lookup
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

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
        if (data.results.length === 1) {
          setSelectedVehicle(data.results[0]);
        }
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSelectedVehicle(null);
    setHasSearched(false);
  };

  const handleQuickPlate = (plate: string) => {
    setQuery(plate);
    handleSearch(plate);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 sm:pt-8">
      {/* Hero Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-qatar-50 px-3.5 py-1.5 text-xs font-semibold text-qatar dark:bg-qatar-950/50 dark:text-qatar-300">
          <Car className="h-3.5 w-3.5" />
          <span>{t.descriptor}</span>
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white font-arabic">
          {t.searchHeroTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-400">
          {t.searchHeroSubtitle}
        </p>
      </div>

      {/* Prominent Mobile-First Search Input Box */}
      <div className="mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative"
        >
          <div className="relative flex items-center overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl shadow-slate-200/50 transition-all focus-within:border-qatar focus-within:ring-4 focus-within:ring-qatar/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <div className="flex h-16 w-16 items-center justify-center text-slate-400">
              <Search className="h-6 w-6" />
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length === 0) {
                  handleClear();
                }
              }}
              placeholder={t.plateInputPlaceholder}
              className="h-16 flex-1 bg-transparent pr-4 pl-12 text-xl font-bold tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:text-sm focus:outline-none dark:text-white font-mono"
              autoFocus
            />

            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-28 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={t.clearInput}
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="m-2 flex h-12 items-center justify-center rounded-xl bg-qatar px-6 text-sm font-bold text-white shadow-md shadow-qatar/20 transition hover:bg-qatar-900 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? t.searching : t.searchButton}
            </button>
          </div>
        </form>

        {/* Quick Sample Plate Chips for Instant Demo & Testing */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span className="font-semibold">{lang === "ar" ? "جرّب لوحات تجريبية:" : "Try sample plates:"}</span>
          <button
            onClick={() => handleQuickPlate("482731")}
            className="rounded-lg bg-slate-200/70 px-2.5 py-1 font-mono font-bold hover:bg-qatar hover:text-white transition dark:bg-slate-800"
          >
            482731 (أحمد حسن)
          </button>
          <button
            onClick={() => handleQuickPlate("٤٨٢٧٣١")}
            className="rounded-lg bg-slate-200/70 px-2.5 py-1 font-mono font-bold hover:bg-qatar hover:text-white transition dark:bg-slate-800"
          >
            ٤٨٢٧٣١ (أرقام عربية)
          </button>
          <button
            onClick={() => handleQuickPlate("2731")}
            className="rounded-lg bg-slate-200/70 px-2.5 py-1 font-mono font-bold hover:bg-qatar hover:text-white transition dark:bg-slate-800"
          >
            2731 (بحث جزئي متعدد)
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="mt-8 space-y-4">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="h-8 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        {/* Ambiguous Multi-Matches Selector */}
        {!isLoading && hasSearched && results.length > 1 && !selectedVehicle && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-bold">{t.partialNotice}</p>
            </div>

            <div className="mt-3 divide-y divide-amber-200/60 dark:divide-amber-900/40">
              {results.map((v) => (
                <div
                  key={v.vehicle_id}
                  onClick={() => setSelectedVehicle(v)}
                  className="flex cursor-pointer items-center justify-between py-3 transition hover:bg-amber-100/50 rounded-lg px-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-black text-slate-950 dark:text-white">
                      {v.plate_number}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {v.make} {v.model} ({v.color})
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-xs font-bold text-qatar">
                    <span>{lang === "ar" ? "اختيار" : "Select"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single Match Display Card */}
        {!isLoading && hasSearched && selectedVehicle && (
          <div>
            <VehicleResultCard
              vehicle={selectedVehicle}
              lang={lang}
              onOpenAlertModal={(v) => {
                setAlertTargetVehicle(v);
                setIsAlertOpen(true);
              }}
            />

            {/* If there were multiple results, button to return to list */}
            {results.length > 1 && (
              <button
                onClick={() => setSelectedVehicle(null)}
                className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                {lang === "ar" ? "← العودة إلى قائمة السيارات المطابقة" : "← Back to matching vehicles list"}
              </button>
            )}
          </div>
        )}

        {/* Empty / Unregistered Vehicle State */}
        {!isLoading && hasSearched && results.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Car className="h-8 w-8 opacity-80" />
            </div>

            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white font-arabic">
              {t.noResultTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t.noResultSubtitle}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleClear}
                className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                {t.tryAgainBtn}
              </button>

              <button
                onClick={() => setIsUnknownOpen(true)}
                className="w-full sm:w-auto rounded-xl bg-qatar px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-qatar/20 hover:bg-qatar-900"
              >
                {t.reportUnknownBtn}
              </button>
            </div>
          </div>
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
        onClose={() => setIsUnknownOpen(false)}
      />
    </div>
  );
}
