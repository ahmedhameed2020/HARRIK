"use client";

import React from "react";
import { Phone, MessageSquare, AlertTriangle, ShieldCheck, Car } from "lucide-react";
import { SearchResultVehicle } from "@/types";
import { generateWhatsAppLink, generateTelLink, AlertTypeCode } from "@/lib/whatsapp";
import { translations, Language } from "@/i18n/translations";

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

  const ownerName =
    lang === "ar"
      ? vehicle.owner_name_ar || vehicle.owner_name_en
      : vehicle.owner_name_en || vehicle.owner_name_ar;

  const deptName =
    lang === "ar"
      ? vehicle.department_name_ar || vehicle.department_name_en
      : vehicle.department_name_en || vehicle.department_name_ar;

  const whatsappUrl = generateWhatsAppLink({
    plateNumber: vehicle.plate_number,
    phone: vehicle.owner_mobile || "",
    type: "BLOCKING",
    language: lang,
  });

  const telUrl = generateTelLink(vehicle.owner_mobile);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-xl shadow-slate-200/50 transition-all dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
      {/* Plate Header Banner — Styled as a Qatar License Plate */}
      <div className="relative border-b bg-gradient-to-r from-slate-50 to-slate-100 p-5 dark:from-slate-800/80 dark:to-slate-900 border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Qatar License Plate Replica */}
            <div className="inline-flex items-center overflow-hidden rounded-lg border-2 border-slate-900 bg-white font-mono shadow-md dark:border-slate-300">
              <div className="flex flex-col items-center justify-center bg-qatar px-2.5 py-1 text-[10px] font-bold text-white tracking-wider">
                <span>قطر</span>
                <span className="text-[8px] opacity-90">QATAR</span>
              </div>
              <div className="px-4 py-1 text-2xl font-black tracking-widest text-slate-950 numeric-plate">
                {vehicle.plate_number}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {vehicle.color} {vehicle.year ? `• ${vehicle.year}` : ""}
              </p>
            </div>
          </div>

          {vehicle.is_primary && (
            <span className="inline-flex items-center gap-1 self-start sm:self-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.primaryVehicle}
            </span>
          )}
        </div>
      </div>

      {/* Owner Information Section */}
      <div className="p-5">
        <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {t.ownerTitle}
              </span>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white font-arabic mt-0.5">
                {ownerName || "غير محدد"}
              </h4>
            </div>
            {vehicle.owner_employee_id && (
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                #{vehicle.owner_employee_id}
              </span>
            )}
          </div>

          {deptName && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-400 dark:text-slate-500 text-xs">
                {t.departmentLabel}:
              </span>
              <span>{deptName}</span>
            </div>
          )}

          {vehicle.owner_mobile && (
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-400 dark:text-slate-500 text-xs">
                {t.mobileLabel}:
              </span>
              <span className="font-mono numeric-plate">{vehicle.owner_mobile}</span>
            </div>
          )}
        </div>

        {/* 3 Prominent Large Touch Actions */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* 1. Direct Phone Call */}
          <a
            href={telUrl || "#"}
            className={`flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${
              !telUrl ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.callAction}</span>
          </a>

          {/* 2. WhatsApp Deep Link */}
          <a
            href={whatsappUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 ${
              !whatsappUrl ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>{t.whatsappAction}</span>
          </a>

          {/* 3. Send Parking Alert */}
          <button
            onClick={() => onOpenAlertModal(vehicle)}
            className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-qatar px-4 py-3 text-sm font-bold text-white shadow-md shadow-qatar/20 transition hover:bg-qatar-900 active:scale-95"
          >
            <AlertTriangle className="h-5 w-5" />
            <span>{t.sendAlertAction}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
