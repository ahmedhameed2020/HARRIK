"use client";

import React, { useState } from "react";
import { X, Car, Lightbulb, Maximize2, AlertTriangle, PhoneCall, CheckCircle2 } from "lucide-react";
import { SearchResultVehicle } from "@/types";
import { AlertTypeCode } from "@/lib/whatsapp";
import { translations, Language } from "@/i18n/translations";

interface CreateAlertDialogProps {
  isOpen: boolean;
  vehicle: SearchResultVehicle | null;
  lang: Language;
  onClose: () => void;
  onAlertSent?: () => void;
}

export function CreateAlertDialog({
  isOpen,
  vehicle,
  lang,
  onClose,
  onAlertSent,
}: CreateAlertDialogProps) {
  const [selectedType, setSelectedType] = useState<AlertTypeCode>("BLOCKING");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen || !vehicle) return null;
  const t = translations[lang];

  const alertOptions: Array<{
    code: AlertTypeCode;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      code: "BLOCKING",
      label: t.alertType_BLOCKING,
      icon: <Car className="h-5 w-5 text-qatar" />,
    },
    {
      code: "LIGHTS_ON",
      label: t.alertType_LIGHTS_ON,
      icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
    },
    {
      code: "WINDOW_OPEN",
      label: t.alertType_WINDOW_OPEN,
      icon: <Maximize2 className="h-5 w-5 text-blue-500" />,
    },
    {
      code: "CHECK_VEHICLE",
      label: t.alertType_CHECK_VEHICLE,
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    },
    {
      code: "CONTACT_ME",
      label: t.alertType_CONTACT_ME,
      icon: <PhoneCall className="h-5 w-5 text-emerald-500" />,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.vehicle_id,
          ownerId: vehicle.owner_id,
          alertTypeCode: selectedType,
          plateNumber: vehicle.plate_number,
          message:
            customMessage.trim() ||
            alertOptions.find((o) => o.code === selectedType)?.label,
        }),
      });

      if (res.ok) {
        setIsSent(true);
        setTimeout(() => {
          setIsSent(false);
          onAlertSent?.();
          onClose();
        }, 1500);
      }
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {isSent ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              {t.alertSentSuccess}
            </h3>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-arabic">
              {t.alertModalTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.alertModalSubtitle} — السيارة رقم ({vehicle.plate_number})
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                {alertOptions.map((option) => (
                  <label
                    key={option.code}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                      selectedType === option.code
                        ? "border-qatar bg-qatar-50/50 dark:border-qatar dark:bg-qatar-950/30"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        {option.icon}
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-arabic">
                        {option.label}
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="alertType"
                      value={option.code}
                      checked={selectedType === option.code}
                      onChange={() => setSelectedType(option.code)}
                      className="h-4 w-4 accent-qatar"
                    />
                  </label>
                ))}
              </div>

              <div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={lang === "ar" ? "ملاحظة إضافية (اختياري)..." : "Additional note (optional)..."}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-qatar focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-qatar py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-qatar/20 transition hover:bg-qatar-900 disabled:opacity-50"
              >
                {isSubmitting ? t.searching : t.sendAlertBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
