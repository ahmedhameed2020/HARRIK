"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Shield, User } from "lucide-react";
import { Navbar } from "./Navbar";
import { Language, translations } from "@/i18n/translations";
import { triggerHaptic } from "@/lib/haptics";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { motion } from "motion/react";
import { SPRINGS } from "@/lib/motion";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("ar");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const t = translations[lang];
  const { isAdmin, isSecurity, profile } = useAuth();
  const { activeCount } = useRealtimeAlerts({
    organizationId: profile?.organization_id,
  });

  useEffect(() => {
    // Register Service Worker for PWA & push
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    }
  }, []);

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

  const isLoginPage = pathname === "/login";
  const isPlatformPage = pathname.startsWith("/platform");
  if (isLoginPage || isPlatformPage) {
    return <>{children}</>;
  }

  const isSearch = pathname === "/";
  const isInbox = pathname === "/inbox";
  const isAdminPath = pathname.startsWith("/admin");
  const canAccessAdmin = isAdmin || isSecurity;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        theme={theme}
        onThemeToggle={toggleTheme}
        activeCount={activeCount}
      />

      <main className="flex-1 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] md:pb-12">
        {children}
      </main>

      {/* Floating Signature Mobile Bottom Navigation Island */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-3 inset-x-4 z-40 mx-auto max-w-md md:hidden"
      >
        <div className="floating-nav-island flex h-16 items-center justify-around rounded-[24px] px-3 shadow-lg">
          {/* 1. Search Destination */}
          <Link
            href="/"
            onClick={() => triggerHaptic("selection")}
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
          >
            {isSearch && (
              <motion.div
                layoutId="activeNavPill"
                transition={SPRINGS.responsive}
                className="absolute inset-x-2 inset-y-1 rounded-[16px] bg-[#8a1538]/10 dark:bg-[#8a1538]/25"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <Search
                className={`h-5 w-5 transition-transform duration-150 ${
                  isSearch ? "text-[#8a1538] dark:text-rose-400 scale-105" : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors ${
                  isSearch ? "text-[#8a1538] dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
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
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
          >
            {isInbox && (
              <motion.div
                layoutId="activeNavPill"
                transition={SPRINGS.responsive}
                className="absolute inset-x-2 inset-y-1 rounded-[16px] bg-[#8a1538]/10 dark:bg-[#8a1538]/25"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <Bell
                  className={`h-5 w-5 transition-transform duration-150 ${
                    isInbox ? "text-[#8a1538] dark:text-rose-400 scale-105" : "text-slate-400 dark:text-slate-500"
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
                  isInbox ? "text-[#8a1538] dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
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
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
          >
            {pathname === "/profile" && (
              <motion.div
                layoutId="activeNavPill"
                transition={SPRINGS.responsive}
                className="absolute inset-x-2 inset-y-1 rounded-[16px] bg-[#8a1538]/10 dark:bg-[#8a1538]/25"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <User
                className={`h-5 w-5 transition-transform duration-150 ${
                  pathname === "/profile" ? "text-[#8a1538] dark:text-rose-400 scale-105" : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors ${
                  pathname === "/profile" ? "text-[#8a1538] dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
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
              className="relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors active:scale-95"
            >
              {isAdminPath && (
                <motion.div
                  layoutId="activeNavPill"
                  transition={SPRINGS.responsive}
                  className="absolute inset-x-2 inset-y-1 rounded-[16px] bg-[#8a1538]/10 dark:bg-[#8a1538]/25"
                />
              )}
              <div className="relative z-10 flex flex-col items-center">
                <Shield
                  className={`h-5 w-5 transition-transform duration-150 ${
                    isAdminPath ? "text-[#8a1538] dark:text-rose-400 scale-105" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`text-[10px] font-bold mt-0.5 transition-colors ${
                    isAdminPath ? "text-[#8a1538] dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
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
    </div>
  );
}

import { EntityConfigProvider } from "@/contexts/EntityConfigContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EntityConfigProvider>
        <AppShellContent>{children}</AppShellContent>
      </EntityConfigProvider>
    </AuthProvider>
  );
}

