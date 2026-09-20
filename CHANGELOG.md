# Changelog

All notable changes to the **حَرِّك | HARRIK** project will be documented in this file.

## [1.1.0] — Roadmap Implementation (PROMPT_ROADMAP)

### Added
- **Persistent Session / Sign-in Once (§2):** ~400-day secure session cookies (browser/server/middleware), silent refresh, "remember this device" (ephemeral session when disabled), and device/session management.
- **Biometric Unlock (§3):** WebAuthn platform-authenticator (fingerprint / Face ID) device lock with a full-screen unlock gate, enable/disable + test controls in `/profile`.
- **Reliable Push (§4):** hardened Service Worker v5 (deep-link notifications, `pushsubscriptionchange` auto re-registration), plus in-app notification center (inbox) with pagination.
- **Fallback Notification Channel (§5):** automatic escalation to security/admin when an owner is unreachable via push, provider-agnostic SMS/Email channel layer (Twilio/Unifonic, Resend/SendGrid), and per-member channel preference.
- **Settings Actually Enforced (§6):** privacy modes A/B/C now applied server-side in search, partial-search toggle + min-digits wired, custom WhatsApp template honored, tenant alert types loaded dynamically, venue/gate settings used across search escalation.
- **Logic & Security Hardening (§7):** test fixtures removed from production paths, durable DB alert throttle (`claim_alert_slot`), visitor-pass alert targeting (new `visitor_pass_id`), server-side pagination for alerts, and shared alert dispatch.
- **Auth Lifecycle (§8):** forgot/reset password pages, strong random passwords (no shared default), and email invitations for new members.
- **Professional Onboarding (§9):** public multi-step registration wizard (`/register`) that provisions a tenant + admin, and an authenticated setup wizard (`/onboarding`) with resumable status and activation.

### Changed
- New member-readable endpoint `GET /api/settings` (all roles) so client UIs reflect tenant configuration.
- Search no longer returns fake seed data in production; it fails explicitly instead.

### Added (localization)
- **Full bilingual UI (§10):** new `LocaleContext` is the single source of truth for language/theme/direction (persisted). Every user-facing screen — including all admin pages, profile, dashboard, reports, scan, auth and onboarding flows — now renders in Arabic or English.
- **UX polish (§11):** global error boundary, loading skeleton, 404 page and offline banner.

### Added (infra)
- Migrations: `20260917000001_visitor_alerts_throttle_and_prefs.sql`.
- Shared helpers: `lib/org-settings.ts`, `lib/notifications/*`, `lib/biometric.ts`, `lib/test-fixtures.ts`, `lib/supabase/onboarding-auth.ts`.
- UX: global error boundary, loading skeleton, 404 page, offline banner.

### Fixed
- **Critical — plate search RPC signature mismatch:** `/api/search` called
  `find_vehicle_by_plate` with a non-existent `p_org_id` argument, so PostgREST
  answered `404 PGRST202` and the RPC always failed. The failure used to be
  masked by the seed fallback; after removing fake data from production (§7)
  every search would have returned `503`. The route now calls
  `find_vehicle_by_plate(p_query)` only — the function derives the organization
  from the verified session (`current_user_org_id()`), which is also stricter.
  Verified against the live database; regression test 21 guards the signature.

### Added (abuse protection, pagination & lifecycle — migration 08)
- **Durable rate limiting:** `rate_limit_buckets` table + `claim_rate_limit_slot()`
  RPC and `lib/security/rate-limit.ts` helpers (all fail-open).
- **Registration hardening:** durable per-IP throttle replaces the in-memory map;
  optional Cloudflare Turnstile (`TURNSTILE_SECRET_KEY` +
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) with a widget wired into `/register` and `/scan`.
- **Scan abuse protection:** IP throttling on `/api/scan/verify` and `/api/scan/alert`.
- **Server-side pagination + search:** `/api/unknown`, `/api/admin/staff`,
  `/api/admin/vehicles` and `/api/alerts` accept `limit`/`offset` and return
  `hasMore`; admin pages debounce search and offer "load more".
- **Timed escalation:** `parking_alerts.escalated_at` — alerts pending past 90 s
  are escalated once to security/admin (lazily on inbox/dashboard read, or via
  `POST /api/alerts/escalate` with `CRON_SECRET`).
- **Device & session management:** `/api/profile/devices` (+ "sign out other
  devices" via GoTrue admin `signOut(jwt,"others")`) and a new `/profile` section.
- **Unknown → registered vehicle:** `POST /api/unknown/promote` registers the
  vehicle, optionally links an owner, closes the report and writes an audit entry.
- New test suite `tests/unit/abuse-protection.test.ts` (13 tests).

### Added (observability, skeletons, alert types & scheduled reports)
- **Central error logging (§11.8):** `lib/observability/*` + `src/instrumentation.ts`
  (`onRequestError`) capture every server error centrally, plus client boundaries
  and window `error`/`unhandledrejection` listeners. Sinks: `SENTRY_DSN` or
  `ERROR_WEBHOOK_URL` (console-only when unset). All free text is **PII-scrubbed**
  before leaving the process; the public reporting endpoint is rate-limited.
- **Per-page skeletons (§11.2):** shared `components/ui/Skeleton.tsx` primitives and
  13 route-level `loading.tsx` files (root, inbox, profile + all admin routes).
- **Alert-type management (§6):** admin-only `GET/POST/PATCH/DELETE
  /api/admin/alert-types` (validated codes, duplicate guard, audit trail, refuses to
  delete a type referenced by alerts) with a full manager UI in Settings → Alerts.
- **Scheduled e-mail report (§5.3):** `POST /api/reports/email` (cron secret or an
  authenticated admin) sends an aggregate HTML report — counts and durations only,
  no PII — built by `lib/reports/summary.ts`. New "Email report" button on
  `/admin/reports`.
- New test suite `tests/unit/observability-reports.test.ts` (10 tests).

### Added (pre-paint locale, accessibility & browser E2E)
- **No-flash locale/theme (§10):** preferences are mirrored into cookies (`harrik_lang`, `harrik_theme`) and applied by an inline pre-paint script in `app/layout.tsx`, so `lang`, `dir` and `.dark` are correct before first paint. Metadata is now bilingual; the root layout stays static.
- **Accessibility (§11.7):** `:focus-visible` outline, bilingual skip link + `#main-content` landmark, `aria-label` / `aria-current` on navigation, labelled icon-only controls, `role="status"` live regions for status banners, 44px touch targets, `prefers-reduced-motion` override.
- **Browser E2E (§13):** Playwright harness with `mobile-ar` and `desktop-en` projects — `tests/e2e/public.spec.ts` (8 specs) and `tests/e2e/authenticated.spec.ts` (6 specs, auto-skipped without `E2E_EMAIL`/`E2E_PASSWORD`). New scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:report`. Verified green (28/28) against a local Supabase stack.

### Added (quality gates, local-stack tooling & accessibility fixes)
- **axe accessibility audit (§11.7):** `tests/e2e/a11y.spec.ts` runs `@axe-core/playwright` over every key surface — `/login`, `/forgot-password`, the `/register` wizard, an invalid `/scan` token, and (signed in) `/`, `/inbox`, `/profile`, `/admin` — failing on `serious`/`critical` violations. Scripts: `test:a11y`, `test:a11y:local`. Verified green: **16/16** on both Playwright projects.
- **Lighthouse audit (§11.6):** `scripts/lighthouse.mjs` drives Lighthouse through the Chromium Playwright already installed (no second browser download) and enforces accessibility ≥ 90 and best-practices ≥ 90; performance and SEO are reported as informational (override with `LH_MIN_*`). `scripts/lighthouse-local.mjs` (`pnpm test:lighthouse:local`) turns it into a one-command audit against the local stack, and `--prod` audits a real `next build` + `next start` build (enforcing performance ≥ 70 as well). Measured on `/login`: dev build **accessibility 100 · best practices 100 · performance 43**; production build **accessibility 100 · best practices 100 · performance 76** (LCP 3.3 s, TBT 530 ms, CLS 0). Reports land in `lighthouse-report.{html,json}` (both git-ignored).
- **Migration verifier:** `scripts/db-verify.mjs` (`pnpm db:verify`, `pnpm db:verify:local`) probes the live REST API for every object the hardening migrations add — including a regression guard that the stale 2-arg `find_vehicle_by_plate(p_query, p_org_id)` overload does **not** reappear — and prints a ✓/✗ checklist with a non-zero exit on any failure. Local stack **10/10** and remote project **10/10** (migration 08 applied through the SQL Editor, since `supabase db push` needs an Owner/Admin login).
- **One-command local stack:** `pnpm dev:local`, `pnpm db:local:up`, `pnpm db:verify:local`, `pnpm test:e2e:local`, `pnpm test:a11y:local` and `pnpm test:lighthouse:local` all inject `.env.local.localdev` as process env, so the local Docker stack is used without ever touching `.env.local`. `test:e2e:local` now fails fast when the port is already serving (Next would otherwise bind another port and the suite would silently test the wrong server).
- **`docs/MIGRATION_08_REMOTE.md`:** step-by-step guide for applying migration 08 to the remote project (SQL Editor / `--db-url` / linked CLI), with the verification queries, expected output, behaviour while pending, and rollback.
- **`public/robots.txt`:** the origin is closed to crawlers (`Disallow: /`) — this is an internal platform and `/scan?token=…` visitor links are single-use credentials. As a direct consequence Lighthouse's crawlability (SEO) score is intentionally capped.

### Fixed (accessibility & console noise)
- **Mobile bottom-nav contrast:** inactive labels/icons used `slate-400` on the white glass island (2.54:1, fails WCAG AA). Now `slate-600` (light) / `slate-400` (dark) — ≥ 7:1 — fixing `color-contrast` on `/`, `/inbox` and `/profile`.
- **Pinch-zoom restored (WCAG 1.4.4):** dropped `maximumScale: 1` and `userScalable: false` from the viewport export.
- **`/login` main landmark:** the sign-in card is now a real `<main id="main-content">`, so the page exposes exactly one main landmark (axe `landmark-one-main`, Lighthouse).
- **Decorative donut chart (axe `aria-hidden-focus`):** Recharts keeps a `tabindex="0"` on its pie layer even with `accessibilityLayer={false}`; `<Pie rootTabIndex={-1}>` removes it from the tab order inside the `aria-hidden` wrapper.
- **Silent requests on public pages:** the realtime-alerts hook and the tenant-settings fetch now wait for a session, and the declared app icon points at a file that exists — `/login` no longer logs `401`/`404` console errors. Lighthouse best-practices on `/login`: 96 → 100.

## [1.0.0] — 2026-09-16

### Added
- **Application Architecture:** Next.js 15+ App Router, React 19, TypeScript strict mode, and Tailwind CSS.
- **Bilingual & RTL Foundation:** Arabic RTL (`dir="rtl"`) default and English LTR (`dir="ltr"`) toggle with custom typography and Qatar Maroon brand palette.
- **Supabase Production Backend:**
  - Complete schema migrations for 13 tables (`organizations`, `departments`, `profiles`, `vehicles`, `staff_vehicles`, `parking_alerts`, `parking_alert_types`, `vehicle_search_events`, `unknown_vehicle_reports`, `contact_action_events`, `import_jobs`, `audit_logs`, `system_settings`).
  - Row Level Security (RLS) enabled on all tables with tenant isolation policies.
  - Normalization engine and trigger converting Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) and stripping separators.
  - Stored Procedures & RPCs: `find_vehicle_by_plate` and `get_dashboard_overview`.
- **Plate Search Engine:**
  - Mobile-first numeric keypad input with instant feedback.
  - Exact match + partial suffix fallback (minimum 3 digits).
  - Ambiguous multiple-matches selector.
  - Qatar license plate replica UI badge.
- **Direct Contact System:**
  - Direct phone calling (`tel:`).
  - WhatsApp deep-link generation (`wa.me`) with dynamic Arabic and English message templates.
- **Parking Alerts Lifecycle:**
  - 5 configurable alert types (`BLOCKING`, `LIGHTS_ON`, `WINDOW_OPEN`, `CHECK_VEHICLE`, `CONTACT_ME`).
  - Alert inbox with quick actions: "جاي حالًا 🏃‍♂️" (acknowledged) and "تم تحريك السيارة ✅" (resolved).
  - Exact resolution duration calculation.
- **Admin Dashboard & Analytics:**
  - Real computed KPIs (Registered Vehicles, Searches Today, Success Rate, Active Incidents, Resolution Rate).
  - Current Issues live monitoring and oldest active incident tracking.
  - Deterministic operational insights.
- **Directory & Management Screens:**
  - Staff Directory with search and department filtering.
  - Vehicle Directory with plate badges and ownership tracking.
  - Parking Alerts management table.
  - Unknown vehicle report management.
  - System settings for privacy modes (Mode A, B, C) and search limits.
- **Bulk Import:**
  - CSV / XLSX uploader, parser, and validator.
  - Pre-import preview with Ready, Warnings, and Errors counters.
  - Prevention of duplicate employee IDs and plates.
- **Automated Test Suite:**
  - 17 unit, integration, and critical E2E tests passing with 100% success.
