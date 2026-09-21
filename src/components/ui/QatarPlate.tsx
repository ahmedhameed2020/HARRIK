"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { plateDigitVariants } from "@/lib/motion";

interface QatarPlateProps {
  plateNumber: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  isInteractive?: boolean;
}

export function QatarPlate({
  plateNumber,
  size = "lg",
  className = "",
  isInteractive = false,
}: QatarPlateProps) {
  const shouldReduceMotion = useReducedMotion();
  const digits = plateNumber.trim().split("");
  const isEmpty = digits.length === 0;

  // Size styling tokens
  const sizeClasses = {
    sm: {
      frame: "h-9 rounded-lg border-[1.5px]",
      ribbon: "px-2 py-0.5 text-[8px]", // mobile-audit-ignore: licence-plate artwork microprint, scales with the plate
      countryAr: "text-[9px] font-black", // mobile-audit-ignore: licence-plate artwork microprint, scales with the plate
      countryEn: "text-[6px] tracking-wider", // mobile-audit-ignore: licence-plate artwork microprint, scales with the plate
      digitsArea: "px-2.5 text-base tracking-wider",
      placeholder: "tracking-wider text-xs",
      hasRivets: false,
      rivetSize: "",
    },
    md: {
      frame: "h-13 sm:h-14 rounded-xl border-2",
      ribbon: "pl-4 pr-3 py-1 text-micro",
      countryAr: "text-xs font-black",
      countryEn: "text-[7px] tracking-wider", // mobile-audit-ignore: licence-plate artwork microprint, scales with the plate
      digitsArea: "pl-3.5 pr-5 sm:pl-4 sm:pr-6 text-xl sm:text-2xl tracking-widest",
      placeholder: "tracking-wider text-sm",
      hasRivets: true,
      rivetSize: "h-2 w-2",
    },
    lg: {
      frame: "h-16 sm:h-20 rounded-2xl border-[2.5px]",
      ribbon: "pl-5 pr-4 sm:pl-6 sm:pr-5 py-1.5 sm:py-2",
      countryAr: "text-xs sm:text-sm font-black",
      countryEn: "text-[8px] sm:text-[9px] tracking-widest", // mobile-audit-ignore: licence-plate artwork microprint, scales with the plate
      digitsArea: "pl-4 pr-6 sm:pl-8 sm:pr-10 text-2xl sm:text-4xl tracking-widest",
      placeholder: "tracking-widest text-lg sm:text-xl",
      hasRivets: true,
      rivetSize: "h-2.5 w-2.5",
    },
  }[size];

  return (
    <div
      className={`qatar-plate-frame relative inline-flex items-stretch overflow-hidden select-none font-mono ${
        sizeClasses.frame
      } ${isInteractive ? "hover:shadow-lg transition-shadow duration-180 cursor-pointer" : ""} ${className}`}
      dir="ltr"
      aria-label={`Qatar license plate ${plateNumber || "empty"}`}
    >
      {/* Specular Surface Gloss Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none z-10" />

      {/* Left Mounting Screw Rivet */}
      {sizeClasses.hasRivets && (
        <div
          className={`absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 shadow-[inset_0_0.5px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.5)] border border-slate-400/80 flex items-center justify-center opacity-75 z-20 pointer-events-none ${sizeClasses.rivetSize}`}
          aria-hidden="true"
        >
          <div className="w-[55%] h-[1px] bg-slate-700/80 rounded-[0.5px] rotate-45" />
        </div>
      )}

      {/* Right Mounting Screw Rivet */}
      {sizeClasses.hasRivets && (
        <div
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 shadow-[inset_0_0.5px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.5)] border border-slate-400/80 flex items-center justify-center opacity-75 z-20 pointer-events-none ${sizeClasses.rivetSize}`}
          aria-hidden="true"
        >
          <div className="w-[55%] h-[1px] bg-slate-700/80 rounded-[0.5px] -rotate-25" />
        </div>
      )}

      {/* Qatar Flag Maroon Ribbon Panel */}
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-b from-[#8a1538] via-[#74112e] to-[#590d23] text-white select-none border-r border-slate-900/30 shadow-[inset_-1px_0_2px_rgba(0,0,0,0.25)] ${sizeClasses.ribbon}`}
      >
        <span className={`${sizeClasses.countryAr} leading-none tracking-normal font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]`}>
          قطر
        </span>
        <span className={`${sizeClasses.countryEn} font-black opacity-95 uppercase mt-0.5 tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]`}>
          QATAR
        </span>
      </div>

      {/* Stamped Plate Digits Area */}
      <div
        className={`flex flex-1 items-center justify-center font-black tracking-widest bg-gradient-to-b from-[#ffffff] via-[#fafafa] to-[#f1f3f5] qatar-plate-digits shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ${sizeClasses.digitsArea}`}
      >
        {isEmpty ? (
          <span className={`text-slate-300 font-mono font-medium select-none ${sizeClasses.placeholder}`}>
            ••••••
          </span>
        ) : (
          <div className="flex items-center justify-center">
            {digits.map((char, index) => (
              <span key={`${index}-${char}`} className="inline-block relative overflow-hidden">
                {shouldReduceMotion ? (
                  <span>{char}</span>
                ) : (
                  <motion.span
                    layout="position"
                    variants={plateDigitVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

