"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { EntityConfigProvider } from "@/contexts/EntityConfigContext";

/**
 * The authenticated chrome (navbar, mobile island, biometric gate, PWA prompt,
 * error reporter) lives in its own module so it is code-split away from the
 * public pages. `next/dynamic` keeps it server-rendered for app pages — the
 * navbar is in the HTML — while `/login`, `/register`, `/scan`, … never request
 * the chunk.
 */
const AppChrome = dynamic(() =>
  import("./AppChrome").then((m) => m.AppChrome)
);

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";
  const isPlatformPage = pathname.startsWith("/platform");
  const isAuthFlowPage =
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/register" ||
    pathname.startsWith("/onboarding");

  useEffect(() => {
    // Register Service Worker for PWA & push (public pages included: /scan is
    // opened by visitors who never sign in).
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    }
  }, []);

  if (isLoginPage || isPlatformPage || isAuthFlowPage) {
    return <>{children}</>;
  }

  return <AppChrome>{children}</AppChrome>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <EntityConfigProvider>
          <AppShellContent>{children}</AppShellContent>
        </EntityConfigProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
