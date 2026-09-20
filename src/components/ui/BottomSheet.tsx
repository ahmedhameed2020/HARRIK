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
            className="surface-glass relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-surface border-t border-slate-200/90 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float sm:max-w-lg sm:rounded-surface sm:border sm:p-6 dark:border-slate-800"
          >
            {/* Grab Handle */}
            <div className="mx-auto -mt-1 mb-4 h-1.5 w-12 rounded-pill bg-slate-300/80 dark:bg-slate-700 sm:hidden" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  {title && (
                    <h3 className="heading-section font-arabic">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-caption font-semibold text-slate-500 dark:text-slate-400">
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 transition-all duration-200 hover:bg-slate-200 hover:text-slate-700 active:scale-95 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
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
