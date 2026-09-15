"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Shield } from "lucide-react";
import { Navbar } from "./Navbar";
import { Language, translations } from "@/i18n/translations";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("ar");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const t = translations[lang];

  useEffect(() => {
    // Sync HTML direction and lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    // Sync Dark mode class
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isSearch = pathname === "/";
  const isInbox = pathname === "/inbox";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main className="flex-1 pb-20 md:pb-8">{children}</main>

      {/* Mobile Bottom Navigation Bar for One-Handed Use */}
      <div className="fixed bottom-0 z-40 flex h-16 w-full items-center justify-around border-t bg-white/95 px-4 backdrop-blur md:hidden border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            isSearch ? "text-qatar font-bold" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
          }`}
        >
          <Search className="h-5 w-5" />
          <span>{t.navSearch}</span>
        </Link>

        <Link
          href="/inbox"
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            isInbox ? "text-qatar font-bold" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
          }`}
        >
          <Bell className="h-5 w-5" />
          <span>{t.navInbox}</span>
        </Link>

        <Link
          href="/admin"
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            isAdmin ? "text-qatar font-bold" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
          }`}
        >
          <Shield className="h-5 w-5" />
          <span>{t.navAdmin}</span>
        </Link>
      </div>
    </div>
  );
}
