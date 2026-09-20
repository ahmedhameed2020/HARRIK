"use client";

import React, { useState, useMemo } from "react";
import { Car, Lightbulb, Maximize2, AlertTriangle, PhoneCall, Check, Loader2, Bell } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SearchResultVehicle } from "@/types";
import { translations, Language } from "@/i18n/translations";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { triggerHaptic } from "@/lib/haptics";
import { TACTILE_TAP, DURATION, EASING } from "@/lib/motion";
import { useEntityConfig } from "@/contexts/EntityConfigContext";

interface CreateAlertDialogProps {
  isOpen: boolean;
  vehicle: SearchResultVehicle | null;
  lang: Language;
  onClose: () => void;
  onAlertSent?: () => void;
}

/** Maps a known alert code (or icon hint) to a lucide icon. */
function iconForCode(code: string, icon?: string | null): React.ReactNode {
  const key = `${code} ${icon || ""}`.toUpperCase();
  if (key.includes("LIGHT")) return <Lightbulb className="h-5 w-5" />;
  if (key.includes("WINDOW")) return <Maximize2 className="h-5 w-5" />;
  if (key.includes("CHECK") || key.includes("ALERT")) return <AlertTriangle className="h-5 w-5" />;
  if (key.includes("CONTACT") || key.includes("PHONE")) return <PhoneCall className="h-5 w-5" />;
  if (key.includes("BLOCK") || key.includes("CAR")) return <Car className="h-5 w-5" />;
  return <Bell className="h-5 w-5" />;
}

export function CreateAlertDialog({
  isOpen,
  vehicle,
  lang,
  onClose,
  onAlertSent,
}: CreateAlertDialogProps) {
  const [selectedType, setSelectedType] = useState<string>("BLOCKING");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { alertTypes } = useEntityConfig();

  // Tenant-configured alert types, falling back to the canonical five.
  const alertOptions = useMemo<Array<{ code: string; label: string; icon: React.ReactNode }>>(() => {
    if (alertTypes && alertTypes.length > 0) {
      return alertTypes.map((at) => ({
        code: at.code,
        label: (lang === "ar" ? at.name_ar : at.name_en) || at.name_ar || at.code,
        icon: iconForCode(at.code, at.icon),
      }));
    }
    return [
      { code: "BLOCKING", label: translations[lang].alertType_BLOCKING, icon: <Car className="h-5 w-5" /> },
      { code: "LIGHTS_ON", label: translations[lang].alertType_LIGHTS_ON, icon: <Lightbulb className="h-5 w-5" /> },
      { code: "WINDOW_OPEN", label: translations[lang].alertType_WINDOW_OPEN, icon: <Maximize2 className="h-5 w-5" /> },
      { code: "CHECK_VEHICLE", label: translations[lang].alertType_CHECK_VEHICLE, icon: <AlertTriangle className="h-5 w-5" /> },
      { code: "CONTACT_ME", label: translations[lang].alertType_CONTACT_ME, icon: <PhoneCall className="h-5 w-5" /> },
    ];
  }, [alertTypes, lang]);

  // Keep the selected type valid when the available list changes.
  const effectiveSelected = alertOptions.some((o) => o.code === selectedType)
    ? selectedType
    : alertOptions[0]?.code || "BLOCKING";

  if (!vehicle) return null;
  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSent) return;

    setIsSubmitting(true);
    triggerHaptic("medium");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.vehicle_id,
          ownerId: vehicle.owner_id,
          alertTypeCode: effectiveSelected,
          plateNumber: vehicle.plate_number,
          message:
            customMessage.trim() ||
            alertOptions.find((o) => o.code === effectiveSelected)?.label,
        }),
      });

      if (res.ok) {
        setIsSent(true);
        triggerHaptic("success");
        setTimeout(() => {
          setIsSent(false);
          onAlertSent?.();
          onClose();
        }, 550); // Under 600ms total operational success window
      } else {
        triggerHaptic("error");
      }
    } catch {
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{t.alertModalTitle}</span>
          <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {vehicle.plate_number}
          </span>
        </div>
      }
      subtitle={t.alertModalSubtitle}
    >
      <AnimatePresence mode="wait">
        {isSent ? (
          /* Operational Success State (No Confetti, Clean Native Confirmation) */
          <motion.div
            key="success-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASING.entrance }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 mb-3 shadow-sm">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-slate-950 dark:text-white font-arabic">
              {t.alertSentSuccess}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {lang === "ar" ? "تم إرسال الإشعار لصاحب المركبة بنجاح" : "Alert dispatched to vehicle owner"}
            </p>
          </motion.div>
        ) : (
          /* Form with Selectable Reason Cards */
          <motion.form
            key="form-state"
            onSubmit={handleSubmit}
            className="space-y-3.5"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="space-y-2">
              {alertOptions.map((option) => {
                const isSelected = effectiveSelected === option.code;
                return (
                  <motion.div
                    key={option.code}
                    whileTap={shouldReduceMotion ? undefined : TACTILE_TAP}
                    onClick={() => {
                      triggerHaptic("selection");
                      setSelectedType(option.code);
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-[16px] p-3 transition-colors border ${
                      isSelected
                        ? "border-[#8a1538] bg-[#fdf5f7] dark:bg-[#8a1538]/20 dark:border-[#a31a43] shadow-sm"
                        : "border-slate-200/90 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1a2234]/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isSelected
                            ? "bg-[#8a1538] text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {option.icon}
                      </div>
                      <span
                        className={`text-sm font-bold font-arabic ${
                          isSelected
                            ? "text-[#8a1538] dark:text-rose-300"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {option.label}
                      </span>
                    </div>

                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-[#8a1538] bg-[#8a1538] text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Optional Note */}
            <div>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "ملاحظة إضافية لصاحب السيارة (اختياري)..."
                    : "Additional note for owner (optional)..."
                }
                className="w-full rounded-[16px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a2234]/70 p-3 text-sm focus:border-[#8a1538] focus:ring-1 focus:ring-[#8a1538] focus:outline-none dark:text-white transition-colors resize-none"
                rows={2}
              />
            </div>

            {/* Primary Send Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={shouldReduceMotion ? undefined : TACTILE_TAP}
              className="flex min-h-[52px] h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-[#8a1538] hover:bg-[#70112e] py-3 text-center text-sm font-bold text-white shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t.searching}</span>
                </>
              ) : (
                <span>{t.sendAlertBtn}</span>
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
