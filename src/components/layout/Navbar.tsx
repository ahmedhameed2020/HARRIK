"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Search, Bell, Shield, Moon, Sun, Globe, LogOut, User } from "lucide-react";
import { translations, Language } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
interface NavbarProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  activeCount?: number;
}

export function Navbar({
  lang,
  onLanguageChange,
  theme,
  onThemeToggle,
  activeCount = 0,
}: NavbarProps) {
  const t = translations[lang];
  const pathname = usePathname();
  const { user, profile, role, isAdmin, isSecurity, signOut } = useAuth();

  const isSearch = pathname === "/";
  const isInbox = pathname === "/inbox";
  const isAdminPath = pathname.startsWith("/admin");
  const canAccessAdmin = isAdmin || isSecurity;

  const handleLangToggle = () => {
    triggerHaptic("selection");
    onLanguageChange(lang === "ar" ? "en" : "ar");
  };

  const handleThemeToggle = () => {
    triggerHaptic("selection");
    onThemeToggle();
  };

  const handleSignOut = async () => {
    triggerHaptic("warning");
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 pt-safe backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Lockup */}
        <Link
          href="/"
          onClick={() => triggerHaptic("light")}
          className="flex items-center gap-2.5 transition-transform active:scale-95 hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qatar text-white shadow-lg shadow-qatar/25 ring-1 ring-white/20">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-arabic">
              {t.brandLockup}
            </span>
            <span className="hidden sm:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {profile?.organization?.name_ar || profile?.organization?.name_en || t.tagline}
            </span>
          </div>
        </Link>

        {/* Center Navigation for Desktop */}
        <nav
          aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"}
          className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-100/70 p-1 backdrop-blur dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50"
        >
          <Link
            href="/"
            onClick={() => triggerHaptic("selection")}
            aria-current={isSearch ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              isSearch
                ? "bg-white text-qatar shadow-sm dark:bg-slate-800 dark:text-qatar-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t.navSearch}
          </Link>

          <Link
            href="/inbox"
            onClick={() => triggerHaptic("selection")}
            aria-current={isInbox ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              isInbox
                ? "bg-white text-qatar shadow-sm dark:bg-slate-800 dark:text-qatar-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <div className="relative">
              <Bell className="h-4 w-4" aria-hidden="true" />
              {activeCount > 0 && (
                <span
                  aria-label={
                    lang === "ar"
                      ? `${activeCount} تنبيه نشط`
                      : `${activeCount} active alerts`
                  }
                  className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse"
                >
                  {activeCount > 9 ? "9+" : activeCount}
                </span>
              )}
            </div>
            {t.navInbox}
          </Link>

          <Link
            href="/profile"
            onClick={() => triggerHaptic("selection")}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              pathname === "/profile"
                ? "bg-white text-qatar shadow-sm dark:bg-slate-800 dark:text-qatar-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{lang === "ar" ? "ملفي ومركباتي" : "My Vehicles"}</span>
          </Link>

          {canAccessAdmin && (
            <Link
              href="/admin"
              onClick={() => triggerHaptic("selection")}
              aria-current={isAdminPath ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                isAdminPath
                  ? "bg-white text-qatar shadow-sm dark:bg-slate-800 dark:text-qatar-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              {t.navAdmin}
            </Link>
          )}
        </nav>

        {/* Right Actions: User Profile, Language & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* User Profile Pill & Sign Out (when authenticated) */}
          {user && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 py-1 ps-2.5 pe-1.5 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <Link
                href="/profile"
                onClick={() => triggerHaptic("selection")}
                className="hidden sm:inline font-bold text-slate-700 hover:text-qatar dark:text-slate-200 dark:hover:text-qatar-300 max-w-[120px] truncate transition"
              >
                {profile?.name_ar || profile?.name_en || user.email?.split("@")[0]}
              </Link>
              {role && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isAdmin
                    ? "bg-qatar-50 text-qatar dark:bg-qatar-950 dark:text-qatar-300"
                    : role === "security"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                }`}>
                  {role === "admin"
                    ? lang === "ar" ? "مدير" : "Admin"
                    : role === "security"
                    ? lang === "ar" ? "أمن" : "Security"
                    : lang === "ar" ? "كادر" : "Staff"}
                </span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                data-icon-button="true"
                title={lang === "ar" ? "تسجيل الخروج" : "Sign Out"}
                aria-label={lang === "ar" ? "تسجيل الخروج" : "Sign out"}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Language Switcher */}
          <button
            onClick={handleLangToggle}
            data-testid="lang-toggle"
            aria-label={
              lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"
            }
            lang={lang === "ar" ? "en" : "ar"}
            className="flex h-11 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3.5 text-xs font-bold text-slate-700 shadow-sm transition active:scale-90 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-qatar" aria-hidden="true" />
            <span>{t.switchLang}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            data-icon-button="true"
            data-testid="theme-toggle"
            aria-label={
              theme === "light"
                ? lang === "ar"
                  ? "تفعيل الوضع الداكن"
                  : "Switch to dark mode"
                : lang === "ar"
                ? "تفعيل الوضع الفاتح"
                : "Switch to light mode"
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition active:scale-90 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

