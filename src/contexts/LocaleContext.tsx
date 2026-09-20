"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Language } from "@/i18n/translations";
import {
  LANG_COOKIE,
  THEME_COOKIE,
  dirFor,
  normalizeLanguage,
  normalizeTheme,
  writePreferenceCookie,
  type AppTheme,
} from "@/lib/locale";

type Theme = AppTheme;

interface LocaleContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  dir: "rtl" | "ltr";
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** True when the active language is English (LTR). */
  isEn: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LANG_KEY = LANG_COOKIE;
const THEME_KEY = THEME_COOKIE;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");
  const [theme, setThemeState] = useState<Theme>("light");

  // Hydrate persisted preferences. The cookie is the server-visible mirror and
  // wins over localStorage so the first client render matches the SSR markup.
  useEffect(() => {
    try {
      const cookieLang = readCookie(LANG_COOKIE);
      const cookieTheme = readCookie(THEME_COOKIE);
      const savedLang = cookieLang ?? localStorage.getItem(LANG_KEY);
      if (savedLang === "ar" || savedLang === "en") setLangState(savedLang);
      const savedTheme = cookieTheme ?? localStorage.getItem(THEME_KEY);
      if (savedTheme === "dark" || savedTheme === "light") setThemeState(savedTheme);
      // Keep both stores in sync for first-visit users (cookie may be absent).
      if (!cookieLang) writePreferenceCookie(LANG_COOKIE, normalizeLanguage(savedLang));
      if (!cookieTheme) writePreferenceCookie(THEME_COOKIE, normalizeTheme(savedTheme));
    } catch {
      // ignore
    }
  }, []);

  // Reflect on <html>
  useEffect(() => {
    document.documentElement.dir = dirFor(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore
    }
    writePreferenceCookie(LANG_COOKIE, next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Language = prev === "ar" ? "en" : "ar";
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {
        // ignore
      }
      writePreferenceCookie(LANG_COOKIE, next);
      return next;
    });
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
    writePreferenceCookie(THEME_COOKIE, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore
      }
      writePreferenceCookie(THEME_COOKIE, next);
      return next;
    });
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      dir: dirFor(lang),
      theme,
      setTheme,
      toggleTheme,
      isEn: lang === "en",
    }),
    [lang, setLang, toggleLang, theme, setTheme, toggleTheme]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Graceful fallback: Arabic RTL defaults when rendered outside the provider.
    return {
      lang: "ar",
      setLang: () => {},
      toggleLang: () => {},
      dir: "rtl",
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
      isEn: false,
    };
  }
  return ctx;
}
