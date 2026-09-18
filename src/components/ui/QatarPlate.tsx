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
      frame: "h-9 rounded-xl border-[1.5px]",
      ribbon: "px-2 py-0.5 text-[8px]",
      countryAr: "text-[9px] font-black",
      countryEn: "text-[6px] tracking-wider",
      digitsArea: "px-2.5 text-base sm:text-lg tracking-wider",
      placeholder: "tracking-wider text-xs",
    },
    md: {
      frame: "h-13 sm:h-14 rounded-2xl border-2",
      ribbon: "px-3 py-1 text-[10px]",
      countryAr: "text-xs font-black",
      countryEn: "text-[7px] tracking-wider",
      digitsArea: "px-3.5 sm:px-4 text-xl sm:text-2xl tracking-widest",
      placeholder: "tracking-wider text-sm",
    },
    lg: {
      frame: "h-16 sm:h-20 rounded-2xl border-2",
      ribbon: "px-3.5 sm:px-5 py-1.5 sm:py-2",
      countryAr: "text-xs sm:text-sm font-black",
      countryEn: "text-[8px] sm:text-[9px] tracking-widest",
      digitsArea: "px-4 sm:px-8 text-2xl sm:text-4xl tracking-widest",
      placeholder: "tracking-widest text-lg sm:text-xl",
    },
  }[size];

  return (
    <div
      className={`qatar-plate-frame relative inline-flex items-stretch overflow-hidden select-none font-mono ${
        sizeClasses.frame
      } ${isInteractive ? "hover:shadow-lg transition-shadow duration-180" : ""} ${className}`}
      dir="ltr"
      aria-label={`Qatar license plate ${plateNumber || "empty"}`}
    >
      {/* Subtle Specular Inset Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none z-10" />

      {/* Qatar Emblem Ribbon Panel */}
      <div className={`flex flex-col items-center justify-center bg-gradient-to-b from-[#8a1538] to-[#630d27] text-white select-none ${sizeClasses.ribbon}`}>
        <span className={`${sizeClasses.countryAr} leading-none tracking-normal font-bold`}>
          قطر
        </span>
        <span className={`${sizeClasses.countryEn} font-extrabold opacity-95 uppercase mt-0.5`}>
          QATAR
        </span>
      </div>

      {/* Plate Digits Area */}
      <div
        className={`flex flex-1 items-center justify-center font-black tracking-widest text-slate-950 numeric-plate bg-white ${sizeClasses.digitsArea}`}
      >
        {isEmpty ? (
          <span className={`text-slate-300 font-normal select-none ${sizeClasses.placeholder}`}>
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
