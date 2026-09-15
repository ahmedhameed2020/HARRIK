import type { Config } from "tailwindcss";

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
        // Qatar Maroon Brand Palette
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
      },
      fontFamily: {
        arabic: ["var(--font-arabic)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
