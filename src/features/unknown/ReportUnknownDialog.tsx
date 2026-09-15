"use client";

import React, { useState } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { translations, Language } from "@/i18n/translations";

interface ReportUnknownDialogProps {
  isOpen: boolean;
  plateQuery: string;
  lang: Language;
  onClose: () => void;
}

export function ReportUnknownDialog({
  isOpen,
  plateQuery,
  lang,
  onClose,
}: ReportUnknownDialogProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;
  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: plateQuery,
          message: `بلاغ سيارة غير معروفة: ${make} ${model} (${color}) - ${note}`,
        }),
      });

      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        onClose();
      }, 1500);
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {isDone ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              {t.reportSubmittedSuccess}
            </h3>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-arabic">
                  {t.reportUnknownTitle}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  رقم اللوحة: {plateQuery}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder={t.makePlaceholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
              />

              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t.modelPlaceholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
              />

              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder={t.colorPlaceholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
              />

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.notePlaceholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                rows={2}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-qatar py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-qatar/20 transition hover:bg-qatar-900 disabled:opacity-50"
              >
                {isSubmitting ? t.searching : t.submitReportBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
