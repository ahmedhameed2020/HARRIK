"use client";

import React from "react";
import { Phone, MessageSquare, AlertTriangle, ShieldCheck, User, Lock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SearchResultVehicle } from "@/types";
import { generateTelLink, buildWhatsAppLinkFromMessage } from "@/lib/whatsapp";
import { translations, Language } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { QatarPlate } from "@/components/ui/QatarPlate";
import { resultCardVariants, TACTILE_TAP } from "@/lib/motion";
import { useEntityConfig } from "@/contexts/EntityConfigContext";

interface VehicleResultCardProps {
  vehicle: SearchResultVehicle;
  lang: Language;
  onOpenAlertModal: (vehicle: SearchResultVehicle) => void;
}

export function VehicleResultCard({
  vehicle,
  lang,
  onOpenAlertModal,
}: VehicleResultCardProps) {
  const t = translations[lang];
  const shouldReduceMotion = useReducedMotion();
  const { formatWhatsapp, settings } = useEntityConfig();

  // Effective privacy mode: prefer the server-applied value, fall back to org settings.
  const privacyMode = vehicle.privacy_mode || settings.privacy_mode;
  const visibility =
    vehicle.contact_visibility ||
    (privacyMode === "mode_a" ? "full" : privacyMode === "mode_b" ? "alert_only" : "anonymous");

  const directContactAllowed = visibility === "full";
  const whatsappAllowed = directContactAllowed && settings.whatsapp_enabled;

  const ownerName =
    lang === "ar"
      ? vehicle.owner_name_ar || vehicle.owner_name_en
      : vehicle.owner_name_en || vehicle.owner_name_ar;

  const deptName =
    lang === "ar"
      ? vehicle.department_name_ar || vehicle.department_name_en
      : vehicle.department_name_en || vehicle.department_name_ar;

  const ownerLabel =
    ownerName ||
    (visibility === "anonymous" ? t.protectedOwner : t.registeredOwner);

  // WhatsApp uses the tenant-configured template when available.
  const whatsappUrl = whatsappAllowed
    ? buildWhatsAppLinkFromMessage(
        vehicle.owner_mobile || "",
        formatWhatsapp(vehicle.plate_number),
        (settings.country_calling_code || "+974").replace(/\D/g, "") || "974"
      )
    : "";

  const telUrl = directContactAllowed ? generateTelLink(vehicle.owner_mobile) : "";

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]} ${parts[1][0]}`;
    }
    return name.slice(0, 2);
  };

  const privacyNote =
    visibility === "alert_only"
      ? t.privacyAlertOnly
      : visibility === "anonymous"
      ? t.privacyAnonymous
      : null;

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : resultCardVariants}
      initial={shouldReduceMotion ? undefined : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      exit={shouldReduceMotion ? undefined : "exit"}
      className="overflow-hidden rounded-[24px] bg-white dark:bg-[#131926] border border-slate-200/90 dark:border-slate-800 shadow-xl transition-colors"
    >
      {/* 1. Header Banner — Plate & Primary Vehicle Identity */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#1a2234]/50 p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {/* Top Row: Plate + Primary Badge */}
          <div className="flex items-center justify-between gap-3">
            <QatarPlate plateNumber={vehicle.plate_number} size="md" />

            {vehicle.is_primary && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.primaryVehicle}</span>
              </span>
            )}
          </div>

          {/* Vehicle Make, Model & Color */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-arabic">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {vehicle.color} {vehicle.year ? `• ${lang === "ar" ? "موديل" : "year"} ${vehicle.year}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Owner Information Section (Respecting Privacy Mode) */}
      <div className="p-4 sm:p-5">
        <div className="rounded-[18px] bg-slate-50/80 dark:bg-[#1a2234]/60 p-3.5 sm:p-4 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            {/* Avatar with Initials */}
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#8a1538] text-white font-bold font-arabic shadow-sm">
              <span className="text-sm">
                {ownerName ? getInitials(ownerName) : visibility === "anonymous" ? <Lock className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base sm:text-lg font-black text-slate-950 dark:text-white font-arabic truncate">
                  {ownerLabel}
                </h4>
                {vehicle.owner_employee_id && (
                  <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    #{vehicle.owner_employee_id}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                {deptName && (
                  <span className="font-semibold text-rose-800 dark:text-rose-300">
                    {deptName}
                  </span>
                )}
                {vehicle.owner_mobile && directContactAllowed && (
                  <span className="font-mono numeric-plate font-semibold text-slate-500 dark:text-slate-400">
                    {vehicle.owner_mobile}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy notice */}
        {privacyNote && (
          <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{privacyNote}</span>
          </div>
        )}

        {/* 3. Dominant Mobile Thumb Actions — adapt to privacy mode */}
        <div
          className={`mt-4 grid grid-cols-1 gap-2.5 sm:gap-3 ${
            directContactAllowed ? "sm:grid-cols-3" : "sm:grid-cols-1"
          }`}
        >
          {directContactAllowed && (
            <>
              {/* Action 1: Direct Phone Call */}
              <motion.a
                href={telUrl || "#"}
                whileTap={shouldReduceMotion ? undefined : TACTILE_TAP}
                onClick={() => triggerHaptic("medium")}
                className={`flex min-h-[56px] h-14 items-center justify-center gap-2.5 rounded-[16px] px-4 py-3 text-sm font-bold text-emerald-950 dark:text-emerald-100 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800/80 shadow-sm transition-colors ${
                  !telUrl ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Phone className="h-4 w-4" />
                </div>
                <span>{t.callAction}</span>
              </motion.a>

              {/* Action 2: WhatsApp Direct Link */}
              {settings.whatsapp_enabled && (
                <motion.a
                  href={whatsappUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={shouldReduceMotion ? undefined : TACTILE_TAP}
                  onClick={() => triggerHaptic("medium")}
                  className={`flex min-h-[56px] h-14 items-center justify-center gap-2.5 rounded-[16px] px-4 py-3 text-sm font-bold text-white bg-[#25d366] hover:bg-[#20ba59] shadow-md shadow-emerald-600/20 transition-colors ${
                    !whatsappUrl ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>{t.whatsappAction}</span>
                </motion.a>
              )}
            </>
          )}

          {/* Action 3: Send Parking Alert (always available) */}
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : TACTILE_TAP}
            onClick={() => {
              triggerHaptic("medium");
              onOpenAlertModal(vehicle);
            }}
            className="flex min-h-[56px] h-14 items-center justify-center gap-2.5 rounded-[16px] px-4 py-3 text-sm font-bold text-white bg-[#8a1538] hover:bg-[#70112e] shadow-md shadow-rose-950/20 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            <span>{t.sendAlertAction}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
