"use client";

import React, { useState } from "react";
import { CheckCircle2, Megaphone, PhoneCall, Sparkles } from "lucide-react";
import { translations, Language } from "@/i18n/translations";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { triggerHaptic } from "@/lib/haptics";

interface ReportUnknownDialogProps {
  isOpen: boolean;
  plateQuery: string;
  lang: Language;
  venueLabel?: string;
  gateSecurityPhone?: string;
  onClose: () => void;
}

const COMMON_MAKES_AR = ["تويوتا", "نيسان", "لكزس", "لاندكروزر", "كيا", "هيونداي", "مرسيدس"];
const COMMON_COLORS_AR = ["أبيض", "أسود", "فضي", "رمادي", "كحلي / أزرق", "عنابي"];

export function ReportUnknownDialog({
  isOpen,
  plateQuery,
  lang,
  venueLabel,
  gateSecurityPhone,
  onClose,
}: ReportUnknownDialogProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = translations[lang];
  const isAr = lang === "ar";
  const label = venueLabel || (isAr ? "المنشأة" : "the facility");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: plateQuery,
          make: make.trim() || undefined,
          model: model.trim() || undefined,
          color: color.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsDone(true);
        triggerHaptic("success");
        setTimeout(() => {
          setIsDone(false);
          setMake("");
          setModel("");
          setColor("");
          setNote("");
          onClose();
        }, 1800);
      } else {
        triggerHaptic("error");
        setErrorMessage(data.error || (isAr ? "فشل إرسال البلاغ" : "Failed to submit report"));
      }
    } catch {
      triggerHaptic("error");
      setErrorMessage(isAr ? "تعذر الاتصال بالخادم" : "Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span>{t.reportUnknownTitle}</span>
          <span className="font-mono text-sm font-black text-slate-900 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            {plateQuery}
          </span>
        </span>
      }
      subtitle={
        isAr
          ? `إرسال بلاغ مباشر إلى لوحة أمن ومراقبة ${label}`
          : `Send direct dispatch to ${label} security operations console`
      }
    >
      {isDone ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-200">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white font-arabic">
            {t.reportSubmittedSuccess}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "تم إشعار رجال الأمن بمواصفات السيارة للمعاينة الميدانية وسحب الكاميرات."
              : "Security officers have been notified to inspect and review gate footage."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
              {errorMessage}
            </div>
          )}

          {/* Quick Make Chips */}
          {isAr && (
            <div>
              <label className="block text-caption font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                نوع السيارة الشائع (اختيار سريع):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MAKES_AR.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setMake(item);
                    }}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                      make === item
                        ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "الشركة المصنعة" : "Make"}
              </label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder={t.makePlaceholder}
                className="field text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "طراز السيارة" : "Model"}
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t.modelPlaceholder}
                className="field text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Quick Color Chips */}
          {isAr && (
            <div>
              <label className="block text-caption font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                لون السيارة (اختيار سريع):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_COLORS_AR.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setColor(item);
                    }}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                      color === item
                        ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? "لون السيارة" : "Color"}
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={t.colorPlaceholder}
              className="field text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? "ملاحظات إضافية والموقع الدقيق" : "Notes & Exact Location"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isAr
                  ? "مثال: متوقفة أمام البوابة 3 تغلق مسار لاندكروزر بيضاء"
                  : "e.g. Blocked near Gate 3 in front of White Land Cruiser"
              }
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-medium focus:border-qatar focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              rows={2}
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary min-h-[48px] w-full gap-2 py-3 text-center text-xs sm:text-sm"
            >
              <Megaphone className="h-4 w-4" />
              <span>{isSubmitting ? (isAr ? "جارٍ إرسال البلاغ..." : "Submitting...") : t.submitReportBtn}</span>
            </button>

            {gateSecurityPhone && (
              <a
                href={`tel:${gateSecurityPhone.replace(/[\s-]/g, "")}`}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isAr ? `أو اتصال فوري بحارس البوابة (${gateSecurityPhone})` : `Or call gate security directly (${gateSecurityPhone})`}</span>
              </a>
            )}
          </div>
        </form>
      )}
    </BottomSheet>
  );
}
