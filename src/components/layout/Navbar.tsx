"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Search, Bell, Shield, Moon, Sun, Globe } from "lucide-react";
import { translations, Language } from "@/i18n/translations";

interface NavbarProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export function Navbar({ lang, onLanguageChange, theme, onThemeToggle }: NavbarProps) {
  const t = translations[lang];
  const pathname = usePathname();

  const isSearch = pathname === "/";
  const isInbox = pathname === "/inbox";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Lockup */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-qatar text-white shadow-md shadow-qatar/20">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-arabic">
              {t.brandLockup}
            </span>
            <span className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.tagline}
            </span>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              isSearch
                ? "bg-qatar-50 text-qatar dark:bg-qatar-950/40 dark:text-qatar-300 font-bold"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Search className="h-4 w-4" />
            {t.navSearch}
          </Link>

          <Link
            href="/inbox"
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              isInbox
                ? "bg-qatar-50 text-qatar dark:bg-qatar-950/40 dark:text-qatar-300 font-bold"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Bell className="h-4 w-4" />
            {t.navInbox}
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              isAdmin
                ? "bg-qatar-50 text-qatar dark:bg-qatar-950/40 dark:text-qatar-300 font-bold"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Shield className="h-4 w-4" />
            {t.navAdmin}
          </Link>
        </nav>

        {/* Right Actions: Language & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(lang === "ar" ? "en" : "ar")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-qatar" />
            <span>{t.switchLang}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
