"use client";

import React from "react";

interface QatarPlateBadgeProps {
  plateNumber: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function QatarPlateBadge({ plateNumber, size = "md", className = "" }: QatarPlateBadgeProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  return (
    <div
      className={`inline-flex items-stretch overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-sm select-none ${className}`}
      dir="ltr"
    >
      <div
        className={`flex flex-col items-center justify-center bg-qatar font-black text-white ${
          isSm ? "px-1.5 py-0.5 text-[8px]" : isLg ? "px-3.5 py-1.5 text-xs" : "px-2.5 py-1 text-micro"
        }`}
      >
        <span>قطر</span>
        <span className={`${isSm ? "text-[6px]" : isLg ? "text-[9px]" : "text-[8px]"} tracking-wider opacity-90`}>
          QATAR
        </span>
      </div>
      <div
        className={`flex items-center font-mono font-black tracking-widest text-slate-900 ${
          isSm ? "px-2 text-xs" : isLg ? "px-5 py-2 text-xl" : "px-3.5 py-1 text-base"
        }`}
      >
        {plateNumber}
      </div>
    </div>
  );
}
