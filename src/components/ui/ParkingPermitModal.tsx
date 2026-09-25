"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, Printer, Download, Sparkles, ShieldCheck, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "@/lib/haptics";
import { QatarPlate } from "@/components/ui/QatarPlate";
import { SPRINGS } from "@/lib/motion";
import { useLocale } from "@/contexts/LocaleContext";

interface ParkingPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id?: string;
    permit_token?: string;
    plate_number: string;
    make: string;
    model: string;
    color: string;
  };
  profile: {
    name_ar: string;
    name_en: string;
    employee_id?: string;
    department_name?: string;
    mobile?: string;
  };
  venueName?: string;
}

export function ParkingPermitModal({
  isOpen,
  onClose,
  vehicle,
  profile,
  venueName = "حَرِّك | HARRIK",
}: ParkingPermitModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const permitRef = useRef<HTMLDivElement>(null);
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  useEffect(() => {
    if (isOpen && (vehicle?.permit_token || vehicle?.id || vehicle?.plate_number)) {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      // High-entropy opaque permit token architecture: Never encode raw plate as token
      const token = vehicle.permit_token || vehicle.id || "11111111-1111-4111-8111-111111111111";
      const scanUrl = `${origin}/scan?token=${encodeURIComponent(token)}`;

      QRCode.toDataURL(scanUrl, {
        width: 320,
        margin: 1.5,
        color: {
          dark: "#1e1e24",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [isOpen, vehicle?.id, vehicle?.permit_token, vehicle?.plate_number]);

  if (!isOpen) return null;

  const handlePrint = () => {
    triggerHaptic("medium");
    window.print();
  };

  const handleDownload = () => {
    triggerHaptic("medium");
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `HARRIK_QR_${vehicle.plate_number}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRINGS.sheet}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-card dark:border dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qatar text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-arabic">
                {L("تصريح الموقف وملصق الباركود الذكي", "Smart parking permit & barcode sticker")}
              </h3>
              <p className="text-caption text-slate-500 dark:text-slate-400">
                Printable QR Smart Parking Permit
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* The Printable Permit Card */}
        <div className="my-5 flex justify-center">
          <div
            ref={permitRef}
            id="printable-permit-area"
            className="w-full rounded-2xl border-2 border-slate-800 bg-white p-5 text-center shadow-lg text-slate-900 relative overflow-hidden"
          >
            {/* Top Maroon Header Ribbon */}
            <div className="bg-qatar text-white py-2 px-3 rounded-xl mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-black tracking-wide font-arabic">
                  {venueName}
                </span>
              </div>
              <span className="text-[9px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                {L("تصريح رسمي", "Official permit")}
              </span>
            </div>

            {/* Qatar Physical Plate Simulation */}
            <div className="flex justify-center mb-4">
              <QatarPlate plateNumber={vehicle.plate_number} size="md" />
            </div>

            {/* High-res Static QR Code (Zero Animation) */}
            <div className="flex flex-col items-center justify-center my-2">
              {qrDataUrl ? (
                <div className="p-2 border-2 border-dashed border-slate-300 rounded-2xl bg-white shadow-sm">
                  {/* Deliberately a plain <img>: the source is an inline data URL
                      generated by QRCode.toDataURL, so next/image has nothing to
                      optimize and must not alter this print-fidelity card. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`QR for ${vehicle.plate_number}`}
                    className="h-44 w-44 object-contain"
                  />
                </div>
              ) : (
                <div className="h-44 w-44 animate-pulse bg-slate-100 rounded-2xl" />
              )}
              <p className="mt-2 text-caption font-black text-slate-600 font-arabic">
                {L("📱 امسح الباركود بكاميرا هاتفك لتنبيه السائق فوراً", "📱 Scan the code with your phone camera to alert the driver instantly")}
              </p>
            </div>

            {/* Driver and Vehicle Meta */}
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs grid grid-cols-2 gap-2 text-start bg-slate-50 p-2.5 rounded-xl font-arabic">
              <div>
                <span className="text-micro text-slate-500 block">{L("الاسم:", "Name:")}</span>
                <span className="font-bold text-slate-800">{lang === "ar" ? profile.name_ar : profile.name_en || profile.name_ar}</span>
              </div>
              <div>
                <span className="text-micro text-slate-500 block">{L("المركبة:", "Vehicle:")}</span>
                <span className="font-bold text-slate-800">
                  {vehicle.make} {vehicle.model} ({vehicle.color})
                </span>
              </div>
              {profile.department_name && (
                <div className="col-span-2">
                  <span className="text-micro text-slate-500 block">{L("القسم / الإدارة:", "Unit / department:")}</span>
                  <span className="font-bold text-slate-800">{profile.department_name}</span>
                </div>
              )}
            </div>

            {/* Micro footer */}
            <div className="mt-3 text-[9px] text-slate-600 font-medium">
              {L("نظام حَرِّك (HARRIK V1.0) • يوضع الملصق داخل الزجاج الأمامي للمركبة", "HARRIK V1.0 • Place the sticker inside the vehicle's windshield")}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handlePrint}
            className="btn btn-primary gap-2 px-4 py-3 text-xs sm:text-sm"
          >
            <Printer className="h-4 w-4" />
            <span>{L("طباعة الملصق", "Print sticker")}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="btn btn-secondary gap-2 px-4 py-3 text-xs text-slate-700 sm:text-sm dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            <span>{L("حفظ رمز QR", "Save QR code")}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
