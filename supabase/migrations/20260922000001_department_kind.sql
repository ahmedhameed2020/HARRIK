-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 09
--   * Department classification (academic / administrative / support)
--
-- Why: a school groups its units very differently from a mall or a hospital.
-- The quick-access browse ("find the person by their department") needs to know
-- which units are teaching departments and which are back-office, so the UI can
-- present them in the right order and group them sensibly.
--
-- Additive and idempotent: safe to run twice.
-- ============================================================================

ALTER TABLE public.departments
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'academic';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_departments_kind'
    ) THEN
        ALTER TABLE public.departments
            ADD CONSTRAINT chk_departments_kind
            CHECK (kind IN ('academic', 'administrative', 'support'));
    END IF;
END $$;

-- Browse queries filter by organization + kind over active units.
CREATE INDEX IF NOT EXISTS idx_departments_org_kind
    ON public.departments (organization_id, kind)
    WHERE is_active;

-- Classify the codes shipped by the default seed. Generic by code, so it is a
-- no-op for tenants that do not use these codes.
UPDATE public.departments
   SET kind = 'administrative'
 WHERE code IN ('ADM', 'SEC')
   AND kind <> 'administrative';
