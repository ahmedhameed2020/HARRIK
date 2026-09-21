"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Shield, User } from "lucide-react";
import { Navbar } from "./Navbar";
import { translations } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { BiometricLock } from "@/components/auth/BiometricLock";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ErrorReporter } from "@/components/system/ErrorReporter";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { motion } from "motion/react";
import { SPRINGS } from "@/lib/motion";

/**
 * حَرِّك | HARRIK — authenticated application chrome: navbar, skip link, the
 * floating mobile navigation island and the deferred widgets (PWA prompt,
 * biometric gate, error reporter).
 *
 * Kept in its own module and loaded through `next/dynamic` from `AppShell`, so
 * the public/auth pages (/login, /register, /scan, …) never download it. It is
 * still server-rendered for app pages, so the navbar does not pop in after
 * hydration.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const { lang, setLang, theme, toggleTheme } = useLocale();
  const pathname = usePathname();
  const t = translations[lang];
  const { isAdmin, isSecurity, profile } = useAuth();

  // Realtime alerts only exist inside the authenticated shell.
  const { activeCount } = useRealtimeAlerts({ organizationId: profile?.organization_id });

  const isSearch = pathname === "/";
  const isInbox = pathname === "/inbox";
  const isAdminPath = pathname.startsWith("/admin");
  const canAccessAdmin = isAdmin || isSecurity;
  return (
    <BiometricLock>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Keyboard users can jump straight past the navigation. */}
      <a href="#main-content" className="skip-link" data-testid="skip-link">
        {lang === "ar" ? "تخطَّ إلى المحتوى الرئيسي" : "Skip to main content"}
      </a>

      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        theme={theme}
        onThemeToggle={toggleTheme}
        activeCount={activeCount}
      />

      <OfflineBanner />

      <main
        id="main-content"
        tabIndex={-1}
        data-testid="main-content"
        className="flex-1 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] md:pb-12"
      >
        {children}
      </main>

      {/* Floating Signature Mobile Bottom Navigation Island */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-3 inset-x-4 z-40 mx-auto max-w-md md:hidden"
      >
        <div className="floating-nav-island flex h-[68px] items-center justify-around rounded-[26px] px-2.5">
          {/* 1. Search Destination */}
          <Link
            href="/"
            onClick={() => triggerHaptic("selection")}
            aria-current={isSearch ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
          >
            {isSearch && (
              <motion.div
                layoutId="activeNavPill"
                transition={SPRINGS.responsive}
                className="absolute inset-x-1.5 inset-y-1 rounded-[18px] bg-qatar/[0.08] dark:bg-qatar/20"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <Search
                className={`h-5 w-5 transition-transform duration-150 ${
                  isSearch ? "text-qatar dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                }`}
              />
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors ${
                  isSearch ? "text-qatar dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {t.navSearch}
              </span>
            </div>
          </Link>

          {/* 2. Inbox Destination */}
          <Link
            href="/inbox"
            onClick={() => triggerHaptic("selection")}
            aria-current={isInbox ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
          >
            {isInbox && (
              <motion.div
                layoutId="activeNavPill"
                transition={SPRINGS.responsive}
                className="absolute inset-x-1.5 inset-y-1 rounded-[18px] bg-qatar/[0.08] dark:bg-qatar/20"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <Bell
                  className={`h-5 w-5 transition-transform duration-150 ${
                    isInbox ? "text-qatar dark:text-rose-400 scale-105" : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white shadow-sm">
                    {activeCount > 9 ? "9+" : activeCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors ${
                  isInbox ? "text-qatar dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {t.navInbox}
              </span>
            </div>
          </Link>

          {/* 3. Profile Destination */}
          <Link
            href="/profile"
            onClick={() => triggerHaptic("selection")}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
          >
            {pathname === "/profile" && (
              <motion.div
                layoutId="activeNavPill"
                transition={SPRINGS.responsive}
                className="absolute inset-x-1.5 inset-y-1 rounded-[18px] bg-qatar/[0.08] dark:bg-qatar/20"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <User
                className={`h-5 w-5 transition-transform duration-150 ${
                  pathname === "/profile" ? "text-qatar dark:text-rose-400 scale-105" : "text-slate-500 dark:text-slate-400"
                }`}
              />
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors ${
                  pathname === "/profile" ? "text-qatar dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {lang === "ar" ? "ملفي" : "Profile"}
              </span>
            </div>
          </Link>

          {/* 4. Admin Destination (if authorized) */}
          {canAccessAdmin && (
            <Link
              href="/admin"
              onClick={() => triggerHaptic("selection")}
              aria-current={isAdminPath ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
            >
              {isAdminPath && (
                <motion.div
                  layoutId="activeNavPill"
                  transition={SPRINGS.responsive}
                  className="absolute inset-x-1.5 inset-y-1 rounded-[18px] bg-qatar/[0.08] dark:bg-qatar/20"
                />
              )}
              <div className="relative z-10 flex flex-col items-center">
                <Shield
                  className={`h-5 w-5 transition-transform duration-150 ${
                    isAdminPath ? "text-qatar dark:text-rose-400 scale-105" : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-bold mt-0.5 transition-colors ${
                    isAdminPath ? "text-qatar dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {t.navAdmin}
                </span>
              </div>
            </Link>
          )}
        </div>
      </nav>

      <PWAInstallPrompt />
      <ErrorReporter />
      </div>
    </BiometricLock>
  );
}
