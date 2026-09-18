/**
 * HARRIK MOTION TOKENS & SYSTEM
 * Reusable durations, easings, spring configurations, variants, and reduced-motion utilities.
 * Built with Motion for React.
 */

import { Transition } from "motion/react";

// --- Durations (seconds) ---
export const DURATION = {
  instant: 0.08,
  fast: 0.12,
  normal: 0.18,
  comfortable: 0.24,
  sheet: 0.32,
  kpiCount: 0.5,
} as const;

// --- Easing Curves (Cubic Bezier) ---
export const EASING = {
  standard: [0.16, 1, 0.3, 1] as const, // Smooth ease-out
  entrance: [0, 0, 0.2, 1] as const,    // Decelerating
  exit: [0.4, 0, 1, 1] as const,        // Fast exit
} as const;

// --- Spring Personalities ---
export const SPRINGS = {
  // Soft: Cards & Layout transitions
  soft: {
    type: "spring",
    stiffness: 180,
    damping: 24,
    mass: 0.8,
  } satisfies Transition,

  // Responsive: Navigation, Tabs, Interactive Indicators
  responsive: {
    type: "spring",
    stiffness: 340,
    damping: 28,
    mass: 0.6,
  } satisfies Transition,

  // Sheet: Bottom Sheet, Modals
  sheet: {
    type: "spring",
    stiffness: 280,
    damping: 28,
    mass: 0.9,
  } satisfies Transition,
} as const;

// --- Tactile Touch Gestures ---
export const TACTILE_TAP = {
  scale: 0.975,
  transition: {
    duration: DURATION.instant,
    ease: EASING.standard,
  },
} as const;

export const TACTILE_KEYPAD_TAP = {
  scale: 0.94,
  transition: {
    duration: DURATION.instant,
    ease: EASING.standard,
  },
} as const;

// --- Variants ---

// 1. Result Card Entrance (Visual continuity from Plate)
export const resultCardVariants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.comfortable,
      ease: EASING.entrance,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: DURATION.fast,
      ease: EASING.exit,
    },
  },
};

// 2. Bottom Sheet Backdrop
export const sheetBackdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASING.exit },
  },
};

// 3. Bottom Sheet Panel
export const sheetPanelVariants = {
  hidden: { y: "100%", opacity: 0.8 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: SPRINGS.sheet,
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.exit,
    },
  },
};

// 4. Per-Digit Plate Motion (Only modified digit travels)
export const plateDigitVariants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.94,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.entrance,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.94,
    transition: {
      duration: DURATION.fast,
      ease: EASING.exit,
    },
  },
};

// 5. Staggered Group Container
export const staggerContainer = (staggerDelay = 0.04) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.entrance,
    },
  },
};
