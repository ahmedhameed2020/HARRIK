/**
 * حَرِّك | HARRIK — Locale & theme constants shared by server and client.
 *
 * The active language/theme live in localStorage (instant client switching) and
 * are mirrored into cookies so the server can render the correct
 * `<html lang dir class>` and bilingual metadata on the first paint (no flash,
 * no wrong-direction hydration).
 */

export type AppLanguage = "ar" | "en";
export type AppTheme = "light" | "dark";

export const LANG_COOKIE = "harrik_lang";
export const THEME_COOKIE = "harrik_theme";

/** One year — the preference is not sensitive and rarely changes. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "en" ? "en" : "ar";
}

export function normalizeTheme(value: string | null | undefined): AppTheme {
  return value === "dark" ? "dark" : "light";
}

export function dirFor(language: AppLanguage): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

/** Client-side helper: mirrors a preference into a readable cookie. */
export function writePreferenceCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
}
