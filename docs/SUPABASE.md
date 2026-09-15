# حَرِّك | HARRIK — Supabase Configuration & Migration Guide

## Overview

HARRIK uses **Supabase as the production backend from day one**.
Features utilized:
- PostgreSQL 17 database
- Supabase Auth (Email + Password)
- Row Level Security (RLS)
- Stored Procedures & RPCs (`find_vehicle_by_plate`, `get_dashboard_overview`)
- Supabase Realtime for instant alert delivery and dashboard synchronization.

---

## Directory Layout

```text
supabase/
├── migrations/
│   ├── 20260916000001_initial_schema.sql      # Core tables, constraints & indexes
│   └── 20260916000002_functions_and_rls.sql   # Normalization triggers, RPCs & RLS policies
└── seed.sql                                   # Deterministic Qatar school seed dataset
```

---

## Environment Configuration

In `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
```

---

## Applying Migrations

### Remote Supabase Project
Using Supabase CLI:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```
Or run the SQL scripts in order via the Supabase Dashboard SQL Editor:
1. `supabase/migrations/20260916000001_initial_schema.sql`
2. `supabase/migrations/20260916000002_functions_and_rls.sql`
3. `supabase/seed.sql` (for demo / development environment)

### Local Supabase (Docker)
```bash
supabase start
supabase db reset
```
