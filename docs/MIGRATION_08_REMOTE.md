# Migration 08 — applying it to the remote project (step by step)

**Target project:** `jcgnhttbkjlpgnekecor` → `https://jcgnhttbkjlpgnekecor.supabase.co`
**Migration file:** `supabase/migrations/20260918000001_rate_limit_and_timed_escalation.sql`
**Status: APPLIED ✅ on both stacks** — remote verified with `pnpm db:verify` → **10/10**
(via Route A below). This guide stays as the record of how it was applied and as the
runbook for any future migration that the CLI cannot push.

Everything in 08 is additive and idempotent (`CREATE TABLE IF NOT EXISTS`,
`CREATE OR REPLACE FUNCTION`, `ADD COLUMN IF NOT EXISTS`), so running it twice is
safe and it needs no data backfill.

---

## 0. Baseline — prove exactly what is missing

```bash
pnpm db:verify          # remote, reads .env.local
pnpm db:verify:local    # local Docker stack, reads .env.local.localdev
```

Before 08 is applied the remote run prints **6/10** with these four failures
(keep this as the “what a pending migration looks like” reference):

```
✗ 08  rate_limit_buckets table
✗ 08  claim_rate_limit_slot RPC
✗ 08  parking_alerts.escalated_at
✗ 08  unknown_vehicle_reports.matched_vehicle_id
```

That same command is the acceptance test afterwards — it must print **10/10**.
It needs only `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from the
env file, so it works even when the Supabase CLI cannot authenticate.

---

## Route A — SQL Editor (fastest, no CLI, no password) ✅ recommended

1. Open <https://supabase.com/dashboard/project/jcgnhttbkjlpgnekecor/sql/new>.
2. Open `supabase/migrations/20260918000001_rate_limit_and_timed_escalation.sql`
   and copy **the whole file**.
3. Paste it into the editor and press **Run**. Expected result: `Success. No rows returned`.
4. Paste the verification query from §2 below in the same editor and **Run** — all
   four rows must read `OK`.
5. Back on the machine: `pnpm db:verify` → **10/10**.

This is the only route that needs no Owner/Admin API access and no database
password, which is why it is the recommended one for this project.

---

## Route B — Supabase CLI with a database URL (no Management API)

Use this when you want the CLI history table to stay authoritative. It talks
straight to Postgres, so the account-level `403` cannot happen.

```bash
# one-off: paste the connection string from
# Dashboard → Project Settings → Database → Connection string (URI)
export HARRIK_DB_URL="postgresql://postgres.jcgnhttbkjlpgnekecor:<PASSWORD>@<host>:5432/postgres"

pnpm exec supabase migration list --db-url "$HARRIK_DB_URL"   # compare local vs remote
pnpm exec supabase db push         --db-url "$HARRIK_DB_URL" # applies only 08
```

`migration list` must show every version up to `20260917000001` on **both** sides;
only `20260918000001` should be remote-pending. If the remote history is behind
(the SQL was applied by hand earlier), record it without re-running anything:

```bash
pnpm exec supabase migration repair --status applied 20260918000001 --db-url "$HARRIK_DB_URL"
```

---

## Route C — Supabase CLI, linked project (needs Owner/Admin)

```bash
pnpm exec supabase login                       # must be an Owner/Admin of the org
pnpm exec supabase link --project-ref jcgnhttbkjlpgnekecor
pnpm exec supabase db push
```

> Known failure on the current account: `unexpected login role status 403`.
> The logged-in user is not Owner/Administrator of org `izyzsvjbulymnsspqaqs`.
> Either sign in as the owner, or use Route A / Route B — do not keep retrying.

---

## 2. Verification

### 2.1 From the app machine (preferred)

```bash
pnpm db:verify
# [harrik] 10/10 checks passed
# [harrik] schema is up to date.
```

Exit code `0` means every probe passed; `1` means something is still missing and
the failing migration number is printed.

### 2.2 Inside the SQL Editor (independent of the app)

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

### 2.3 Reload PostgREST if the RPC still 404s

PostgREST caches the schema; it normally reloads within seconds of a DDL change.
If `pnpm db:verify` still reports `Could not find the function … in the schema cache`
*after* the SQL ran, force a reload once:

```sql
notify pgrst, 'reload schema';
```

---

## 3. What the app does while 08 is pending (why this is not an outage)

Every consumer degrades safely, so the gap is a hardening gap, not a broken feature:

| Missing object | Behaviour without it |
| --- | --- |
| `claim_rate_limit_slot` | `lib/security/rate-limit.ts` **fails open** — requests are served, only the durable per-IP limiter is inactive (the in-process limiter still applies per isolate). |
| `rate_limit_buckets` | Only used by the RPC above. |
| `parking_alerts.escalated_at` | `lib/notifications/escalate-stale.ts` reports `unavailable` and skips escalation instead of escalating twice. |
| `unknown_vehicle_reports.matched_vehicle_id` | The link is written best-effort; the report row is still created and listed. |

---

## 4. Rollback (rarely needed)

```sql
drop function if exists public.claim_rate_limit_slot(text, text, int, int);
drop table    if exists public.rate_limit_buckets;
drop index    if exists public.idx_parking_alerts_needs_escalation;
alter table   public.parking_alerts drop column if exists escalated_at;
drop index    if exists public.idx_unknown_reports_matched_vehicle;
alter table   public.unknown_vehicle_reports drop column if exists matched_vehicle_id;
```

Rolling back returns the app to the "degrades safely" column above; no data is lost.
