"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * حَرِّك | HARRIK — Optional Cloudflare Turnstile challenge.
 *
 * Rendered only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured. When it is
 * absent the widget renders nothing and the server skips verification
 * (TURNSTILE_SECRET_KEY unset), so local/self-hosted setups keep working.
 *
 * Configure BOTH keys together:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
 *   TURNSTILE_SECRET_KEY=<secret key>
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function isTurnstileEnabled(): boolean {
  return Boolean(SITE_KEY);
}

interface TurnstileWidgetProps {
  /** Called with the verification token, or "" when it expires/fails. */
  onVerify: (token: string) => void;
  className?: string;
}

export function TurnstileWidget({ onVerify, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Load the Turnstile script once.
  useEffect(() => {
    if (!SITE_KEY || typeof window === "undefined") return;
    const w = window as any;
    if (w.turnstile) {
      setScriptReady(true);
      return;
    }
    const existing = document.getElementById("cf-turnstile-script") as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") setScriptReady(true);
      else existing.addEventListener("load", () => setScriptReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      setScriptReady(true);
    });
    document.head.appendChild(script);
  }, []);

  // Render the widget once the API is available.
  useEffect(() => {
    if (!SITE_KEY || !scriptReady || !containerRef.current) return;
    const w = window as any;
    if (!w.turnstile) return;

    containerRef.current.innerHTML = "";
    try {
      w.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onVerify(""),
        "error-callback": () => onVerify(""),
        theme: "auto",
      });
    } catch {
      // Widget already rendered / script race — safe to ignore.
    }
  }, [scriptReady, onVerify]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />;
}
