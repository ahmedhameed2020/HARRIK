import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { LANG_COOKIE, THEME_COOKIE } from "@/lib/locale";

/**
 * Bilingual metadata.
 *
 * The root layout stays static (no `cookies()` read) so every route keeps its
 * static optimisation; the active language, direction and colour scheme are
 * applied *before first paint* by the inline script below, which reads the
 * preference cookies.
 */
export const metadata: Metadata = {
  title: "حَرِّك | HARRIK — Smart Parking | منظومة المواقف الذكية",
  description:
    "اعرف صاحب المركبة. تواصل. حل المشكلة. | Find the vehicle, reach the right person, keep things moving.",
  applicationName: "HARRIK",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "حَرِّك | HARRIK",
  },
  icons: {
    // Point at a file that actually exists in `public/`; declaring the icon
    // link also stops Chrome from probing `/favicon.ico` (which 404s).
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icon-192.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available (WCAG 1.4.4): `maximumScale`/`userScalable`
  // are deliberately NOT set, so the page can be magnified to 200%.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8A1538" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

/**
 * Applies the persisted language, direction and colour scheme before the first
 * paint so there is no RTL→LTR flash or light→dark flicker. Kept tiny and
 * fully guarded; `suppressHydrationWarning` on <html> covers the attribute
 * changes React did not render.
 */
const preflightScript = `(function(){try{var e=document.documentElement;var c=document.cookie||"";function g(n){var m=c.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));return m?decodeURIComponent(m[1]):null}var l=g("${LANG_COOKIE}")==="en"?"en":"ar";var t=g("${THEME_COOKIE}")==="dark";e.lang=l;e.dir=l==="ar"?"rtl":"ltr";if(t){e.classList.add("dark")}else{e.classList.remove("dark")}}catch(err){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preflightScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans min-h-screen bg-slate-50 dark:bg-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
