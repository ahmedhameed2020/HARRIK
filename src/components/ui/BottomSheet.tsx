"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { triggerHaptic } from "@/lib/haptics";
import { sheetBackdropVariants, sheetPanelVariants } from "@/lib/motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
}: BottomSheetProps) {
  const shouldReduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      triggerHaptic("light");
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
          {/* 1. Subtle Native Backdrop */}
          <motion.div
            variants={shouldReduceMotion ? undefined : sheetBackdropVariants}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
            exit={shouldReduceMotion ? undefined : "exit"}
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* 2. Native Sheet Container with Spring Entrance */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            variants={shouldReduceMotion ? undefined : sheetPanelVariants}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
            exit={shouldReduceMotion ? undefined : "exit"}
            className="relative z-10 w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] border-t sm:border border-slate-200/90 bg-white dark:bg-surface-card dark:border-slate-800 p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Grab Handle */}
            <div className="mx-auto -mt-1 mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  {title && (
                    <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white font-arabic">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {subtitle}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onClose();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Sheet Body */}
            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
