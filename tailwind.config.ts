import type { Config } from "tailwindcss";

/**
 * حَرِّك | HARRIK — Tailwind theme.
 *
 * The neutral ramps are *deliberately remapped*: `slate` and `zinc` no longer
 * resolve to Tailwind's cool blue-greys but to a warm, premium neutral ramp
 * (soft white → warm grey → charcoal). Every existing `text-slate-500` /
 * `border-slate-200` / `dark:bg-zinc-900` in the codebase therefore inherits
 * the same refined palette, and new code stays consistent by default.
 *
 * The accent stays Qatar maroon — one accent colour, tied to the brand and the
 * Qatar plate artwork.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Qatar Maroon — the single, refined accent colour.
        qatar: {
          DEFAULT: "#8A1538",
          50: "#fdf2f4",
          100: "#fbe6ea",
          200: "#f6cfd7",
          300: "#eea6b6",
          400: "#e2738d",
          500: "#d04767",
          600: "#b52849",
          700: "#981b3a",
          800: "#8A1538", // Official Qatar Maroon
          900: "#6d152e",
          950: "#3d0715",
        },
        primary: {
          DEFAULT: "#8A1538",
          foreground: "#ffffff",
        },

        /**
         * Warm neutral ramp — replaces Tailwind's cool `slate`.
         * soft white #F8F6F3 → warm grey → deep charcoal #0E0C0A.
         * `500` is deliberately darker than Tailwind's stone-500 so muted copy
         * clears WCAG AA (4.5:1) on the warm canvas. `850` is included because
         * the codebase already referenced it.
         */
        slate: {
          50: "#f8f6f3",
          100: "#f3f0ec",
          200: "#eae6e1",
          300: "#d8d2ca",
          400: "#a29a90",
          500: "#6e675f",
          600: "#57504a",
          700: "#423c36",
          800: "#2a2622",
          850: "#211e1a",
          900: "#1a1714",
          950: "#0e0c0a",
        },

        /** Warm charcoal ramp — replaces Tailwind's cool `zinc` (dark surfaces). */
        zinc: {
          50: "#faf9f7",
          100: "#f3f1ee",
          200: "#e6e2dd",
          300: "#d1cbc3",
          400: "#a69f96",
          500: "#7a736b",
          600: "#59534c",
          700: "#413c36",
          800: "#2a2724",
          850: "#211f1c",
          900: "#191715",
          950: "#0d0c0b",
        },

        /** Semantic aliases bound to the token layer (see src/styles/tokens.css). */
        surface: {
          page: "var(--surface-page)",
          card: "var(--surface-card)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
          pearl: "var(--surface-pearl)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
        },
        line: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        brand: {
          DEFAULT: "var(--color-brand)",
          hover: "var(--color-brand-hover)",
          soft: "var(--color-brand-soft)",
          border: "var(--color-brand-border)",
        },
      },

      /**
       * Type scale with paired line-height and tracking, so hierarchy is
       * consistent instead of ad-hoc `text-2xl font-black` per screen.
       */
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        caption: ["0.75rem", { lineHeight: "1.125rem", letterSpacing: "0.005em" }],
        body: ["0.875rem", { lineHeight: "1.375rem" }],
        lead: ["1rem", { lineHeight: "1.625rem" }],
        h3: ["1.0625rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        h2: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em" }],
        h1: ["1.625rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        display: ["2rem", { lineHeight: "2.375rem", letterSpacing: "-0.025em" }],
        hero: ["2.5rem", { lineHeight: "2.875rem", letterSpacing: "-0.03em" }],
      },

      /** Warm, layered, low-contrast shadows (never harsh black). */
      boxShadow: {
        soft: "0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.03)",
        card: "0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px -12px rgba(28, 25, 23, 0.10)",
        float: "0 12px 32px -12px rgba(28, 25, 23, 0.18), 0 2px 8px -4px rgba(28, 25, 23, 0.06)",
        inset: "inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
      },

      borderRadius: {
        control: "0.875rem",
        card: "1.25rem",
        surface: "1.75rem",
      },

      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      fontFamily: {
        arabic: ["var(--font-arabic)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
/**
 * tailwindcss-animate provides the `animate-in` / `fade-in` / `zoom-in-*` /
 * `slide-in-from-*` utilities that several screens already reference (scan,
 * dialogs, import success states). Without it those classes silently did
 * nothing — elements just appeared with no transition.
 */
  plugins: [require("tailwindcss-animate")],
};

export default config;
