# حَرِّك | HARRIK — Implementation Status (Roadmap §1–§15)

> Status of the work delivered against `docs/PROMPT_ROADMAP.md`.

## Verification
- `npx tsc --noEmit` → clean
- `npx next lint` → 0 errors
- `npx vitest run` → **116/116 tests passing**
- `npx next build` → success (21 pages + 29 API route handlers = **50 routes**)
- `pnpm test:a11y:local` → **16/16 axe specs passing** (`mobile-ar` + `desktop-en`)
- `pnpm db:verify:local` → **10/10 schema probes** · `pnpm db:verify` (remote project) → **10/10** (migration 08 applied via the SQL Editor)
- `pnpm test:lighthouse:local --prod` → `/login` (production build): **accessibility 100 · best practices 100 · performance 76 · SEO 63** (SEO is intentionally capped: `robots.txt` blocks crawling)

---

## Delivered

### §2 — Persistent session / sign-in once ✅
- Long-lived (~400 day) secure cookies configured in `lib/supabase/client.ts`, `server.ts`, `middleware.ts`.
- `AuthContext`: ephemeral-session enforcement when "remember this device" is off; `markUnlocked()` on password login.
- Login page: "تذكّر هذا الجهاز (دخول مرة واحدة)" checkbox (default on).

### §3 — Biometric unlock ✅
- `lib/biometric.ts` (WebAuthn `create`/`get` with platform authenticator).
- `components/auth/BiometricLock.tsx` full-screen unlock gate wired into `AppShell`.
- `/profile`: enable / disable / test fingerprint controls.

### §4 — Reliable push + in-app center ✅
- `public/sw.js` v5: deep-link `notificationclick`, `renotify`, `pushsubscriptionchange` re-registration.
- In-app notification center = inbox with server-side pagination ("تحميل المزيد").

### §5 — Fallback channel + escalation ✅
- `lib/notifications/alert-dispatch.ts`: push to owner → escalate to security/admin when unreachable → optional SMS per member preference.
- `lib/notifications/channels.ts`: Twilio/Unifonic SMS, Resend/SendGrid email (safe no-op when unconfigured).
- Used by both `/api/alerts` and `/api/scan/alert`.

### §6 — Settings actually enforced ✅
- `lib/org-settings.ts` + member-readable `GET /api/settings`.
- `/api/search` applies privacy masking (server-side), partial-search toggle and min-digits.
- `VehicleResultCard` adapts actions to privacy mode; uses tenant WhatsApp template.
- `CreateAlertDialog` loads tenant `parking_alert_types` (fallback to the five defaults).
- `EntityConfigContext` now reads `/api/settings` (works for all roles, not just admins).

### §7 — Logic & security gaps ✅
- Test fixtures moved to `lib/test-fixtures.ts`, gated by `FIXTURES_ENABLED`; search fails explicitly in production instead of returning fake data.
- **Fixed (critical):** `/api/search` called `find_vehicle_by_plate` with a non-existent `p_org_id` argument → PostgREST `404 PGRST202`, so the RPC always failed and the endpoint silently served seed data. Once fixtures were disabled in production this became a hard `503` on every search. The route now calls `find_vehicle_by_plate(p_query)` only; the function derives the organization from the verified session. Verified against the live database and covered by regression test 21.
- Durable alert throttle via `claim_alert_slot` RPC (with in-process fast path).
- Visitor alerts target `visitor_pass_id` (new column) instead of misusing `vehicle_id`.
- Server-side pagination on `/api/alerts`.

### §8 — Auth lifecycle ✅
- `/forgot-password` + `/reset-password` (with strength meter).
- Staff creation/import: strong random passwords + email invitations (`inviteUserByEmail`) and one-time setup links — **no shared default password**.

### §9 — Professional onboarding ✅
- `/register`: 4-step wizard → `POST /api/register` provisions org (`status='onboarding'`), admin profile, default settings + alert types.
- `/onboarding`: resumable setup wizard (branding/privacy, team, activation) → `GET/PATCH /api/onboarding`.
- Login routes onboarding admins to `/onboarding`; middleware enforces the onboarding gate.

### §10 — Localization ✅ (complete for UI surfaces)
- **Root cause fixed:** language/theme state is no longer per-page. New `src/contexts/LocaleContext.tsx` provides a single `lang`/`theme`/`dir` source of truth, persisted to `localStorage`, and `AppShell` wraps the app with it.
- **Every user-facing screen is bilingual (AR/EN):** plate search + vehicle card, keypad, camera scanner, public `/scan`, login, forgot/reset password, `/register`, `/onboarding`, error / 404 / offline banner, biometric lock, alerts inbox, dashboard, executive reports, **all admin screens** (`staff`, `vehicles`, `visitors`, `import`, `alerts`, `unknown`, `audit`, `settings`), and `profile` (including push + biometric sections), PWA install prompt, and parking-permit modal.
- The shared platform dictionary in `src/i18n/translations.ts` gained ~180 keys; page-scoped copy uses an inline `L(ar, en)` helper driven by `useLocale()`, so no component hard-codes a single-language string.
- **Intentionally Arabic in both modes:** the Qatar plate artwork (`قطر / QATAR`), sample CSV data, and seeded demo fallback names.
- **Not localized (by design):** static Next.js `metadata` (title/description) in `app/layout.tsx`.

### §11 — UX polish ✅
- `app/error.tsx` + `app/global-error.tsx` (bilingual error boundaries), `app/not-found.tsx` (bilingual 404), `components/ui/OfflineBanner.tsx`.

### §7b — Abuse protection, pagination, timely escalation & device management ✅
Delivered in migration `20260918000001_rate_limit_and_timed_escalation.sql` plus app code.

- **Durable rate limiting (§7.4):** new `rate_limit_buckets` table + `claim_rate_limit_slot()` RPC (SECURITY DEFINER, granted to `anon`/`authenticated`, direct table access revoked). Shared helpers in `lib/security/rate-limit.ts` (`clientIp`, `enforceRateLimit`, `verifyTurnstile`) — all **fail open** so emergencies are never blocked.
- **Registration hardening:** `/api/register` now uses the durable IP limiter (2 per 5 min) instead of an in-memory `Map`, plus optional Turnstile (`TURNSTILE_SECRET_KEY`). Bot challenge widget (`components/ui/TurnstileWidget.tsx`) is wired into `/register` and `/scan` and only renders when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
- **Scan abuse protection:** `/api/scan/verify` (30/min/IP) and `/api/scan/alert` (10 per 5 min/IP) are throttled; the alert endpoint also verifies Turnstile when configured.
- **Server-side pagination + search (§7.5):** `/api/unknown`, `/api/admin/staff`, `/api/admin/vehicles` (and `/api/alerts`) accept `limit`/`offset` and return `hasMore`. Staff supports server-side `q` / `status` / `departmentId`; vehicles supports `q` (plate, make, model **and owner name** via two-step id resolution) and `status`. Admin pages debounce the search box and offer "load more".
- **Timed escalation (§5.1):** `parking_alerts.escalated_at` + `lib/notifications/escalate-stale.ts`. Alerts still `pending` after 90 s are pushed once to security/admin. Runs lazily on `GET /api/alerts` and `GET /api/dashboard`, and on demand via `POST /api/alerts/escalate` (cron secret header or an admin session).
- **Device & session management (§2.6):** `GET/DELETE /api/profile/devices` + `POST {action:"signout_others"}` (GoTrue admin `signOut(jwt,"others")`), surfaced as a new section in `/profile`.
- **Unknown → registered vehicle (§7.6):** `POST /api/unknown/promote` creates the vehicle, optionally links a staff owner (first vehicle becomes primary, with rollback on link failure), closes the report and writes an audit entry. `admin/unknown` now opens a promote dialog instead of only flipping the status.

### §11c — Observability, skeletons, alert types & scheduled reports ✅
- **Central error logging (§11.8):** `lib/observability/error-sink.ts` + `lib/observability/scrub.ts` + `lib/observability/client.ts`. Server errors are captured for every request through `src/instrumentation.ts` (`onRequestError`) — no route changes needed. Browser errors come from `app/global-error.tsx`, `app/error.tsx` and a window `error` / `unhandledrejection` listener (`components/system/ErrorReporter.tsx`) posted to the public, rate-limited `POST /api/observability/report`. Sinks: `SENTRY_DSN` (store API) or `ERROR_WEBHOOK_URL`; console-only when unset. **All free text is PII-scrubbed** (e-mails, phones, 4+ digit runs/plates, tokens) before it leaves the process.
- **Per-page skeletons (§11.2):** shared primitives in `components/ui/Skeleton.tsx` and 13 route-level `loading.tsx` files covering the root, inbox, profile and every admin route (dashboard, staff, vehicles, visitors, alerts, unknown, audit, import, reports, settings).
- **Alert-type management (§6):** `GET/POST/PATCH/DELETE /api/admin/alert-types` (admin-only, code validated, duplicate-guarded, audited, refuses to delete a type still referenced by alerts) plus a full manager UI in the settings → Alerts tab (inline rename, activate/deactivate, delete, add).
- **Scheduled e-mail report (§5.3):** `POST /api/reports/email` (cron secret **or** an authenticated admin) sends an aggregate HTML report built by `lib/reports/summary.ts`. The payload contains **counts and durations only** — no owner names, phones or plates. Recipients come from `to[]` or `REPORT_EMAIL_TO`; the admin UI has an "Email report" button.

### §10b / §13 — Pre-paint locale, accessibility & browser E2E ✅
- **No-flash locale & theme (finishes §10):** the active language/theme are mirrored into cookies (`harrik_lang`, `harrik_theme`) by `lib/locale.ts` + `LocaleContext`, and a tiny inline script in `app/layout.tsx` applies `lang` / `dir` / `.dark` **before first paint**. Result: no RTL→LTR flash, no light→dark flicker, and SSR markup matches the client (`suppressHydrationWarning` on `<html>`). Metadata is bilingual; the root layout stays static (no `cookies()` read) so all routes keep static optimisation.
- **Accessibility (§11.7):** global `:focus-visible` outline, a bilingual **skip link** ("تخطَّ إلى المحتوى الرئيسي") as the first focusable element, `#main-content` landmark with `tabIndex={-1}`, `aria-label` + `aria-current="page"` on both navigations, Arabic/English `aria-label`s on every icon-only control (sign out, language, theme, refresh), `role="status" aria-live="polite"` on status banners, `aria-hidden` on decorative icons, `data-icon-button` 44px touch targets, and a `prefers-reduced-motion` override.
- **Browser E2E harness (§13):** `playwright.config.ts` + `tests/e2e/public.spec.ts` (8 specs) and `tests/e2e/authenticated.spec.ts` (6 specs), run on two projects — `mobile-ar` (Pixel 7, ar-QA) and `desktop-en` (Chrome, en-US). Vitest excludes `tests/e2e`.

```bash
pnpm build:next                 # or let the config fall back to `next dev`
pnpm exec playwright install chromium
pnpm test:e2e                   # public suite always runs
# authenticated journey (skips automatically without these):
E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
# against an already-running deployment:
E2E_BASE_URL=https://… pnpm test:e2e
```

**Verified result:** `28 passed` against the local Supabase stack (`mobile-ar` + `desktop-en`), covering login, wrong-credentials error, language-switch persistence across reloads, theme persistence, auth-gated redirects, `/scan` malformed-token handling, and — signed in — the main landmark, skip link, plate search, inbox, admin dashboard, profile (push/biometric/devices) and language persistence across navigation.

### §11.6 / §11.7 — Automated axe + Lighthouse audits, and one-command local tooling ✅
- **axe audit:** `tests/e2e/a11y.spec.ts` (`@axe-core/playwright`) walks WCAG 2.1 A/AA over `/login`, `/forgot-password`, the `/register` wizard, an invalid `/scan` token, and — authenticated — `/`, `/inbox`, `/profile`, `/admin`; it fails on any `serious`/`critical` violation and prints the offending selectors. `pnpm test:a11y` (any running server) or `pnpm test:a11y:local` (starts the local stack itself): **16/16 green**.
- **Lighthouse audit:** `scripts/lighthouse.mjs` launches the Chromium Playwright already downloaded (no second browser) and enforces `accessibility ≥ 90`, `best-practices ≥ 90`; `performance` and `seo` are reported as informational, with every threshold overridable through `LH_MIN_*`. `pnpm test:lighthouse:local` runs it against the local stack in one command and reuses a dev server that is already up; add `--prod` (or `LH_PROD=1`) to audit a `next build` + `next start` build instead of `next dev` — that mode enforces `performance ≥ 70` as well. Measured on `/login`: **dev build** accessibility 100 · best practices 100 · performance 43 · SEO 54; **production build** accessibility 100 · best practices 100 · **performance 76** (LCP 3.3 s, TBT 530 ms, CLS 0) · SEO 63. Reports land in `lighthouse-report.{html,json}` (git-ignored).
- **Migration verifier:** `scripts/db-verify.mjs` checks the deployed schema over the REST API (needs only the URL + service-role key, so it works when the Supabase CLI cannot authenticate) and exits non-zero while anything is missing. Local stack **10/10** · remote project **10/10**.
- **Accessibility fixes found by the audits:** mobile bottom-nav contrast (2.54:1 → ≥ 7:1), pinch-zoom restored (WCAG 1.4.4), a real `<main>` landmark on `/login`, and Recharts' pie layer removed from the tab order inside its `aria-hidden` container.
- **Console noise removed:** unauthenticated `/login` no longer issues a settings fetch or a `parking_alerts` query (both now wait for a session) and no longer 404s on the app icon — Lighthouse best-practices on `/login` went 96 → 100.

#### One-command local stack

| Command | What it does |
| --- | --- |
| `pnpm dev:local` | `next dev` on :3000 (override with `PORT`) against the local Supabase stack |
| `pnpm db:local:up` | `supabase migration up` — applies pending migrations to the local stack |
| `pnpm db:verify:local` / `pnpm db:verify` | ✓/✗ checklist of every migration object, local / remote |
| `pnpm test:e2e:local [spec] [--project=…]` | starts the local-env dev server on :3101, runs Playwright, tears it down |
| `pnpm test:a11y:local` | same, but only `tests/e2e/a11y.spec.ts` |
| `pnpm test:lighthouse:local [url]` | Lighthouse against the local stack (reuses a server already on :3101); add `--prod` for a real `next build` + `next start` audit |
| `pnpm test:lighthouse https://…/login` | Lighthouse against a real deployment (enforces performance ≥ 70 too) |

All of them read `.env.local.localdev` and inject it as **process** environment,
which overrides the `.env.local` file Next.js loads — the remote credentials in
`.env.local` are never touched or overwritten. Run one dev server at a time:
two Next dev processes sharing `.next` corrupt each other's webpack cache.



---

#### Scheduled jobs (Cron Triggers)

The worker answers Cloudflare Cron Triggers as well as HTTP requests. The
entrypoint is `worker/index.mjs`, which wraps the generated
`.open-next/worker.js` — that file is rebuilt by every build and exports only
`fetch`, so `scheduled()` has to be added around it. `wrangler.jsonc` points
`main` at the wrapper and declares the schedules; the routing lives in
`worker/cron-jobs.mjs` so it can be unit-tested without a Cloudflare build
(`tests/unit/cron-jobs.test.ts`, which also fails if the two files drift apart).

| schedule | job | why |
|---|---|---|
| `* * * * *` | `POST /api/alerts/escalate` | §5 wants an unacknowledged alert escalated to the security team within 60–90s. One minute is Cloudflare's finest granularity. |
| `0 3 * * *` | `POST /api/reports/email` | 06:00 Asia/Qatar — the daily operations report. |

Each job is dispatched **in process**: the handler builds a `Request` and hands
it to the app's own fetch handler, so there is no public URL to configure and
the shared secret never leaves the isolate. Both routes are excluded from the
session middleware and authenticate the caller themselves.

**Required secret.** Neither job runs without `CRON_SECRET`; the handler logs
`CRON_SECRET is not set` and skips, rather than firing an unauthenticated call
every minute:

```bash
npx wrangler secret put CRON_SECRET
```

Before this existed, escalation ran only *lazily* — `GET /api/alerts` and
`GET /api/dashboard` escalate stale alerts as a side effect — so it depended on
somebody having the app open. That lazy path is still in place and is now the
backstop rather than the mechanism.

#### Notification channels (push → SMS fallback)

`profiles.notification_channel` (migration 07) decides whether an owner whose
push notification could not be delivered also gets an SMS. It is set per person
in **/profile → قناة استقبال التنبيهات**: `push` (default), `push_sms` or `all`.
Choosing anything other than `push` requires a valid mobile number, which the
API enforces.

The SMS itself only leaves the system when an provider is configured —
`SMS_PROVIDER` plus that provider's keys (`TWILIO_*` or `UNIFONIC_*`, see
`.env.example`). Without them `lib/notifications/channels.ts` reports
`not_configured` and the alert still goes out over push and in-app; nothing
breaks, the fallback is simply inert.

#### Mobile readiness (the app is phone-first)

HARRIK is operated on a phone — one-handed, outdoors, often in a hurry — so the
phone layout is the primary layout and desktop is the widened version of it.
Two checks keep it that way:

```bash
pnpm audit:mobile          # static: reads the JSX, exits 1 on a blocking issue
pnpm audit:mobile --all    # also lists advisory findings
pnpm audit:mobile:live     # live: drives Chromium at 360px and 390px
```

`audit:mobile` (`scripts/mobile-audit.mjs`) flags the patterns that reliably
break on a phone: a `<table>` with no `md:hidden` card list beside it, a
3+ column grid with no breakpoint prefix, a fixed width wider than the
viewport, content text under 11px, a form control small enough to trigger the
iOS focus-zoom, and anything pinned to the bottom edge without
`env(safe-area-inset-bottom)`. When a rule is genuinely wrong for a line — the
licence-plate artwork microprint, a numeric keypad that *is* three columns —
annotate that line, or the line directly above it, with `mobile-audit-ignore`
and the reason.

`audit:mobile:live` (`scripts/lib/measure-mobile.mjs`) measures the rendered
page instead of the classes: horizontal overflow, tap targets under 44px and
text under 11px, at 360px and 390px. Without credentials it can only reach the
unauthenticated routes, because everything else redirects to `/login`; give it
an account to cover the whole app:

```bash
E2E_EMAIL=… E2E_PASSWORD=… pnpm audit:mobile:live https://harrik.example.com
```

The conventions these checks enforce:

- **Lists**: a card list under `md:hidden`, the table `hidden md:block`. On the
  printable report the cards are additionally `print:hidden` and the table
  `print:block`, so paper keeps the full grid.
- **Dialogs**: `BottomSheet` (`src/components/ui/BottomSheet.tsx`) is the
  default — a sheet on phones, a centred dialog from `sm` up, capped at `92vh`
  with its own scroll and safe-area padding. A hand-rolled modal must do the
  same or its submit button ends up below the fold on a 360×640 screen.
- **Form controls**: 16px and 44px minimum on coarse pointers, applied centrally
  in `globals.css` rather than per screen. Below 16px iOS Safari zooms the page
  in on focus and never zooms back out.
- **Text**: `text-micro` (11px) is the floor for anything a user reads.

#### Deploying to Cloudflare

```bash
pnpm build        # opennextjs-cloudflare build (also the CI build command); `build:cf` is an alias
pnpm deploy:cf    # opennextjs-cloudflare deploy  -> Worker `harrik`
```

- Live at <https://harrik.ahmedhameed2020.workers.dev> (last deploy: 10.2 MB upload / 2.0 MB gzip, 13 ms startup).
- Worker secrets that must exist for the server features to work: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`. Public values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_TIMEZONE`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`) come from `wrangler.jsonc`.
- **Required patch:** `patches/@opennextjs__cloudflare@1.20.6.patch` aliases `sharp` to OpenNext's `empty.js` shim. Without it the build dies in “Bundling the OpenNext server…” with `No loader is configured for ".node" files`, because Next's optional `sharp` dependency is a native binary that esbuild cannot inline for Workers. `pnpm.patchedDependencies` applies the patch automatically on install — do not delete `patches/`.
- Image optimization stays off (`images.unoptimized: true`); if it is ever needed, use a Cloudflare Images loader rather than re-enabling `sharp`.

#### Premium design system (warm neutral + one accent)

The interface was re-skinned to a premium, calm aesthetic without changing structure or content:

| Layer | Where | What it defines |
| --- | --- | --- |
| Colour ramps | `tailwind.config.ts` | `slate`/`zinc` remapped to a **warm** ramp (soft white `#F8F6F3` → warm grey → charcoal `#0E0C0A`; dark surfaces `#191715`), so ~900 existing utility usages inherit it |
| Accent | `tailwind.config.ts` | Qatar maroon `#8A1538` — the single accent, tied to the brand and plate artwork |
| Tokens | `src/styles/tokens.css` | surfaces, hairline borders, warm text scale, layered elevation, glass, radii, spacing |
| Primitives | `src/app/globals.css` | `.surface-card`, `.surface-card-hover`, `.surface-glass`, `.eyebrow`, `.heading-page/section/card`, `.hairline` |
| Type scale | `tailwind.config.ts` | `micro · caption · body · lead · h3 · h2 · h1 · display · hero` with paired line-height + tracking |
| Depth | `tailwind.config.ts` | `shadow-soft · shadow-card · shadow-float`, `radius-control · radius-card · radius-surface` |

Rules of thumb for new work: use `surface-*` / `ink-*` / `line-*` / `brand-*` aliases instead of
literal hexes, prefer the named type sizes over ad-hoc `text-[13px]`, and keep **one** accent
colour — status colours (emerald/amber/red/sky) are reserved for state, never decoration.

**Accessibility note:** the warm ramp initially dropped muted copy to 4.21:1 on the warmer canvas;
`slate-500` is now `#6E675F` (≈5.1:1). `pnpm test:a11y:local` must stay green (16/16) after any
palette change — it caught this on the first pass.

#### Test budgets on a loaded machine

`playwright.config.ts` uses generous budgets (per-test 180 s, expect 30 s) and
`scripts/e2e-local.mjs` pre-requests every route before Playwright starts. Both exist for the same
reason: the suite runs against `next dev`, which compiles routes on demand, and on a shared machine
that first compile can exceed a test's budget — making a healthy app look broken. With the warm-up
in place the a11y suite went from 14.7 min *with failures* to **8/8 green in 4.8 min**. Use
`E2E_NO_WARMUP=1` to skip the warm-up.

## Pending migrations

| Migration | Purpose | Local | Remote |
| --- | --- | --- | --- |
| `20260918000001_rate_limit_and_timed_escalation.sql` | durable rate limiting, escalation marker, vehicle link | ✅ | ✅ |
| `20260922000001_department_kind.sql` | `departments.kind` (academic / administrative / support) for quick-access browse | ⏳ `pnpm db:local:up` (needs Docker) | ⏳ paste in the SQL Editor (same route as migration 08, see `docs/MIGRATION_08_REMOTE.md`) |

`pnpm db:verify` / `pnpm db:verify:local` now include a check for `departments.kind`, so the
migration state of a project can be confirmed with one command.

> Until migration 09 is applied, the department quick-access surfaces hide themselves: the list API
> returns an error for the missing column and the UI renders nothing rather than breaking the home
> screen.

## Remaining / follow-ups

- **Both migrations are applied and verified on both stacks** — local 10/10, remote 10/10 (`pnpm db:verify` / `pnpm db:verify:local`). The durable rate limiter, timed escalation and the unknown-report → vehicle link are therefore live; no code path depends on the "degrades safely" fallbacks any more.
- **Turnstile / e-mail / SMS / error-sink require configuration** — each is a no-op until its environment variables are set (see the table below).
- **`ALLOW_SELF_SERVE_ONBOARDING` is unset**, so `/register` is currently open to anyone who reaches the URL. Set it to `false` (or enable Turnstile) before public exposure.
- **Lighthouse numbers are measured on a production build** (`pnpm test:lighthouse:local --prod`): accessibility 100 · best practices 100 · performance 76 · SEO 63 on `/login`. Remaining performance headroom is LCP 3.3 s / TBT 530 ms (dev-mode runs are informational only), and the SEO score is capped on purpose by `robots.txt`. Only `/login` has been audited so far — repeat the command with a path (`pnpm test:lighthouse:local --prod http://127.0.0.1:3101/admin`) for the other surfaces.
- **The authenticated E2E suite needs credentials that exist in the deployment under test** — the committed integration tests run against the *local* Supabase stack (Vitest does not load `.env.local`), while a production build inlines `.env.local` (remote project). Use `pnpm test:e2e:local`, or point `E2E_BASE_URL` at a deployment whose seeded users you know.


---

## Required environment variables (all optional; safe no-ops when absent)

| Variable | Purpose |
| --- | --- |
| `SMS_PROVIDER` (`twilio` \| `unifonic`) | Enable SMS fallback |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Twilio SMS |
| `UNIFONIC_APP_SID` / `UNIFONIC_SENDER_ID` | Unifonic SMS |
| `EMAIL_PROVIDER` (`resend` \| `sendgrid`) | Transactional email |
| `RESEND_API_KEY` / `SENDGRID_API_KEY` / `EMAIL_FROM` | Email provider |
| `ALLOW_SELF_SERVE_ONBOARDING` (`false` to disable) | Gate public registration |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Enable Cloudflare Turnstile bot protection (set both) |
| `SENTRY_DSN` or `ERROR_WEBHOOK_URL` | Central error reporting sink (console-only when unset) |
| `CRON_SECRET` | Shared secret for `POST /api/alerts/escalate` and `POST /api/reports/email` |
| `REPORT_EMAIL_TO` | Default recipients for the scheduled e-mail report |
| `ENABLE_TEST_FIXTURES` (`true` to force) | Non-production seed/permit fixtures |

## Database migrations to apply
```
supabase/migrations/20260917000001_visitor_alerts_throttle_and_prefs.sql   # local ✅ · remote ✅
supabase/migrations/20260918000001_rate_limit_and_timed_escalation.sql     # local ✅ · remote ✅
```
Both migrations are applied on **both** stacks (`pnpm db:verify` → 10/10, `pnpm db:verify:local` → 10/10).
Migration 08 reached the remote project through the **SQL Editor** route described in
`docs/MIGRATION_08_REMOTE.md`, because `supabase db push` needs an Owner/Admin login.
If the project is later linked to the CLI, record the applied version so the history
matches the database: `supabase migration repair --status applied 20260918000001 --db-url …`
(re-running it would be harmless anyway — every statement is idempotent).

Check the current state of any project with `pnpm db:verify` / `pnpm db:verify:local`
(no CLI login needed — it only uses the service-role key already in the env file).

### Verifying migration 08 after applying
```sql
select 'claim_rate_limit_slot' as item,
       case when exists (select 1 from pg_proc where proname='claim_rate_limit_slot')
            then 'OK' else 'MISSING' end as status
union all select 'rate_limit_buckets',
       case when exists (select 1 from information_schema.tables where table_name='rate_limit_buckets')
            then 'OK' else 'MISSING' end
union all select 'parking_alerts.escalated_at',
       case when exists (select 1 from information_schema.columns
                         where table_name='parking_alerts' and column_name='escalated_at')
            then 'OK' else 'MISSING' end
union all select 'unknown_vehicle_reports.matched_vehicle_id',
       case when exists (select 1 from information_schema.columns
                         where table_name='unknown_vehicle_reports' and column_name='matched_vehicle_id')
            then 'OK' else 'MISSING' end;
```
