"use client";

import React, { useState } from "react";
import { Delete, Globe, X, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { triggerHaptic } from "@/lib/haptics";
import { TACTILE_KEYPAD_TAP } from "@/lib/motion";

interface PlateKeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSearch?: () => void;
  onClose?: () => void;
  canSearch?: boolean;
}

export function PlateKeypad({
  onDigitPress,
  onBackspace,
  onClear,
  onSearch,
  onClose,
  canSearch = false,
}: PlateKeypadProps) {
  const [numeralMode, setNumeralMode] = useState<"arabic" | "western">("western");
  const shouldReduceMotion = useReducedMotion();

  const westernDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const arabicDigits = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "٠"];

  const currentDigits = numeralMode === "arabic" ? arabicDigits : westernDigits;

  const handlePress = (digit: string) => {
    triggerHaptic("light");
    onDigitPress(digit);
  };

  const toggleNumeralMode = () => {
    triggerHaptic("selection");
    setNumeralMode((prev) => (prev === "western" ? "arabic" : "western"));
  };

  return (
    <div className="w-full max-w-sm mx-auto rounded-[24px] p-3.5 sm:p-4 bg-white/95 dark:bg-[#131926]/95 border border-slate-200/90 dark:border-slate-800 shadow-xl backdrop-blur-xl select-none">
      {/* Top Controls Bar */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={toggleNumeralMode}
          className="harrik-btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm"
        >
          <Globe className="h-3.5 w-3.5 text-harrik-maroon-700 dark:text-rose-400" />
          <span>{numeralMode === "western" ? "أرقام عربية (١٢٣)" : "English (123)"}</span>
        </button>

        {onClose && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            aria-label="Close keypad"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 3x4 Tactile Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {/* Digits 1 to 9 */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
          const digit = currentDigits[idx];
          return (
            <motion.button
              key={digit}
              type="button"
              whileTap={shouldReduceMotion ? undefined : TACTILE_KEYPAD_TAP}
              onClick={() => handlePress(digit)}
              className="flex min-h-[56px] h-14 items-center justify-center rounded-[16px] bg-slate-50 hover:bg-slate-100 dark:bg-[#1a2234] dark:hover:bg-[#232d42] border border-slate-200/80 dark:border-slate-700/60 shadow-sm text-2xl font-black font-mono text-slate-950 dark:text-white tabular-nums transition-colors"
            >
              {digit}
            </motion.button>
          );
        })}

        {/* Row 4: Clear Button */}
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : TACTILE_KEYPAD_TAP}
          onClick={() => {
            triggerHaptic("warning");
            onClear();
          }}
          className="flex min-h-[56px] h-14 items-center justify-center rounded-[16px] bg-slate-50 hover:bg-rose-50 dark:bg-[#1a2234] dark:hover:bg-rose-950/30 border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
        >
          مسح
        </motion.button>

        {/* Digit 0 */}
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : TACTILE_KEYPAD_TAP}
          onClick={() => handlePress(currentDigits[9])}
          className="flex min-h-[56px] h-14 items-center justify-center rounded-[16px] bg-slate-50 hover:bg-slate-100 dark:bg-[#1a2234] dark:hover:bg-[#232d42] border border-slate-200/80 dark:border-slate-700/60 shadow-sm text-2xl font-black font-mono text-slate-950 dark:text-white tabular-nums transition-colors"
        >
          {currentDigits[9]}
        </motion.button>

        {/* Backspace Button */}
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : TACTILE_KEYPAD_TAP}
          onClick={() => {
            triggerHaptic("light");
            onBackspace();
          }}
          className="flex min-h-[56px] h-14 items-center justify-center rounded-[16px] bg-slate-50 hover:bg-slate-100 dark:bg-[#1a2234] dark:hover:bg-[#232d42] border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 transition-colors"
          aria-label="Backspace"
        >
          <Delete className="h-6 w-6" />
        </motion.button>
      </div>

      {/* Direct Search Key on Keypad if enabled */}
      {onSearch && canSearch && (
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : TACTILE_KEYPAD_TAP}
          onClick={() => {
            triggerHaptic("medium");
            onSearch();
          }}
          className="mt-2.5 w-full flex min-h-[48px] h-12 items-center justify-center gap-2 rounded-[16px] bg-[#8a1538] hover:bg-[#70112e] text-white font-bold text-sm shadow-md transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>بحث عن المركبة</span>
        </motion.button>
      )}
    </div>
  );
}
