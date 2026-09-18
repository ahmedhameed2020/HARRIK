/**
 * HARRIK DESIGN SYSTEM CONSTANTS (TypeScript)
 * Programmatic access to brand, semantic, elevation, and radius tokens.
 */

export const BRAND_COLORS = {
  maroon: {
    950: "#3b0616",
    900: "#570d24",
    800: "#70112e",
    700: "#8a1538", // Primary Qatar Maroon Anchor
    600: "#a31a43",
    500: "#bd2150",
    400: "#d63c6b",
    300: "#e87094",
    200: "#f5b0c4",
    100: "#fce8ee",
    50: "#fdf5f7",
  },
  pearl: "#fcfaee",
  white: "#ffffff",
  graphite: {
    canvas: "#0b0f17",
    card: "#131926",
    raised: "#1a2234",
  },
} as const;

export const SEMANTIC_COLORS = {
  success: {
    light: "#15803d",
    dark: "#22c55e",
    softLight: "#f0fdf4",
    softDark: "rgba(34, 197, 94, 0.14)",
  },
  warning: {
    light: "#b45309",
    dark: "#f59e0b",
    softLight: "#fffbeb",
    softDark: "rgba(245, 158, 11, 0.14)",
  },
  danger: {
    light: "#b91c1c",
    dark: "#ef4444",
    softLight: "#fef2f2",
    softDark: "rgba(239, 68, 68, 0.14)",
  },
  info: {
    light: "#0369a1",
    dark: "#38bdf8",
    softLight: "#f0f9ff",
    softDark: "rgba(56, 189, 248, 0.14)",
  },
} as const;

export const RADIUS = {
  control: "12px",
  input: "16px",
  card: "20px",
  cardPremium: "24px",
  hero: "28px",
  sheet: "28px",
  pill: "9999px",
} as const;

export const TOUCH_TARGETS = {
  min: "48px",
  optimal: "56px",
} as const;
