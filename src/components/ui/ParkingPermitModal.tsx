"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, Printer, Download, Sparkles, ShieldCheck, QrCode, RefreshCw, Ban, AlertTriangle } from "lucide-react";
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
    permit_status?: string | null;
    plate_number: string;
    make: string;
    model: string;
    color: string;
  };
  /**
   * Called after the permit token is rotated or revoked so the screen that owns
   * the vehicle list can refetch. Without it the modal would show a new QR code
   * while the list behind it still holds the old token.
   */
  onPermitChanged?: () => void;
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
  onPermitChanged,
}: ParkingPermitModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  // The token can change while the modal is open (rotation), so the QR is
  // driven by state rather than by the prop alone.
  const [token, setToken] = useState<string>("");
  const [permitStatus, setPermitStatus] = useState<string>(vehicle?.permit_status || "active");
  const [permitBusy, setPermitBusy] = useState<null | "rotate" | "revoke">(null);
  const [permitError, setPermitError] = useState<string | null>(null);
  const permitRef = useRef<HTMLDivElement>(null);
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  // Seed the token from the vehicle whenever the modal opens, then keep it in
  // state so a rotation can replace the QR code without closing the sheet.
  useEffect(() => {
    if (!isOpen) return;
    setToken(vehicle?.permit_token || vehicle?.id || "");
    setPermitStatus(vehicle?.permit_status || "active");
    setPermitError(null);
  }, [isOpen, vehicle?.permit_token, vehicle?.id, vehicle?.permit_status]);

  useEffect(() => {
    if (!isOpen || !token) {
      setQrDataUrl("");
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    // High-entropy opaque permit token architecture: never encode the raw plate.
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
  }, [isOpen, token]);

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

  /**
   * Rotating issues a fresh token and invalidates the old sticker immediately:
   * the QR printed on a copied sticker stops verifying. This is the answer to
   * "someone photographed my permit", which until now had none — the endpoint
   * existed but nothing in the app called it.
   */
  const handleRotatePermit = async () => {
    if (!vehicle?.id) return;
    if (
      !confirm(
        L(
          "سيتم إصدار رمز جديد وإبطال الملصق الحالي فوراً. ستحتاج لطباعة الملصق من جديد. هل تريد المتابعة؟",
          "A new code will be issued and the current sticker invalidated immediately. You will need to print it again. Continue?"
        )
      )
    )
      return;

    triggerHaptic("medium");
    setPermitBusy("rotate");
    setPermitError(null);
    try {
      const res = await fetch("/api/profile/vehicles/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.permitToken) {
        setToken(json.permitToken);
        setPermitStatus("active");
        triggerHaptic("success");
        onPermitChanged?.();
      } else {
        setPermitError(json.error || L("تعذّر تدوير التصريح", "Could not rotate the permit"));
      }
    } catch {
      setPermitError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setPermitBusy(null);
    }
  };

  /** Revoking stops the permit verifying at all, without deleting the vehicle. */
  const handleRevokePermit = async () => {
    if (!vehicle?.id) return;
    if (
      !confirm(
        L(
          "سيتم إلغاء التصريح ولن يعمل الملصق عند المسح. هل أنت متأكد؟",
          "The permit will be revoked and the sticker will stop working when scanned. Are you sure?"
        )
      )
    )
      return;

    triggerHaptic("warning");
    setPermitBusy("revoke");
    setPermitError(null);
    try {
      const res = await fetch(
        `/api/profile/vehicles/permit?vehicleId=${encodeURIComponent(vehicle.id)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setPermitStatus("revoked");
        triggerHaptic("success");
        onPermitChanged?.();
      } else {
        setPermitError(json.error || L("تعذّر إلغاء التصريح", "Could not revoke the permit"));
      }
    } catch {
      setPermitError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      setPermitBusy(null);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRINGS.sheet}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:pb-6 dark:bg-surface-card dark:border dark:border-slate-800"
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
              <span className="text-micro font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
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
            <div className="mt-3 text-micro text-slate-600 font-medium">
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

        {/* Permit lifecycle. A printed sticker can be photographed or copied;
            until this existed there was no way to invalidate one — the rotate
            and revoke endpoints were built but nothing called them. */}
        <div className="mt-3 rounded-control border border-line bg-surface-sunken/40 p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-qatar" aria-hidden="true" />
            <div className="min-w-0">
              <h4 className="text-caption font-bold text-slate-800 dark:text-slate-100">
                {L("أمان التصريح", "Permit security")}
              </h4>
              <p className="mt-0.5 text-micro text-slate-500 dark:text-slate-400">
                {L(
                  "إذا صُوِّر الملصق أو نُسخ، أصدر رمزاً جديداً ليتوقف الملصق القديم عن العمل فوراً.",
                  "If the sticker was photographed or copied, issue a new code so the old one stops working immediately."
                )}
              </p>
            </div>
          </div>

          {permitStatus === "revoked" && (
            <div className="mt-2.5 flex items-center gap-2 rounded-control bg-rose-50 px-3 py-2 text-caption font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{L("هذا التصريح ملغى ولن يعمل عند المسح", "This permit is revoked and will not verify")}</span>
            </div>
          )}

          {permitError && (
            <div className="mt-2.5 flex items-center gap-2 rounded-control bg-amber-50 px-3 py-2 text-caption font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{permitError}</span>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRotatePermit}
              disabled={!vehicle?.id || permitBusy !== null}
              className="btn btn-secondary gap-2 text-xs disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${permitBusy === "rotate" ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>
                {permitBusy === "rotate"
                  ? L("جارٍ الإصدار...", "Issuing...")
                  : L("إصدار رمز جديد", "Issue a new code")}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRevokePermit}
              disabled={!vehicle?.id || permitBusy !== null || permitStatus === "revoked"}
              className="btn btn-secondary gap-2 text-xs text-rose-600 disabled:opacity-50 dark:text-rose-400"
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              <span>
                {permitBusy === "revoke"
                  ? L("جارٍ الإلغاء...", "Revoking...")
                  : L("إلغاء التصريح", "Revoke permit")}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
