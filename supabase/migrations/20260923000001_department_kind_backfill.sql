-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 10
--   * Broaden the department classification backfill
--
-- Migration 09 only recognised the codes shipped by the default seed (ADM/SEC).
-- Real tenants name their units differently — the live school has ADMIN,
-- STUDENT and TEACH — so every non-matching unit silently stayed at the
-- 'academic' default and the browse grouping mislabelled its back office.
--
-- Only rows still sitting at the default are touched, so this never overrides a
-- classification an administrator has deliberately set.
-- Idempotent: safe to run twice.
-- ============================================================================

UPDATE public.departments
   SET kind = 'administrative'
 WHERE kind = 'academic'
   AND upper(code) IN (
       'ADM', 'ADMIN', 'ADMINISTRATION',
       'SEC', 'SECURITY', 'SAFETY',
       'FIN', 'FINANCE', 'ACC', 'ACCOUNTING',
       'HR', 'PAYROLL',
       'IT', 'ICT', 'OPS', 'OPERATIONS',
       'BUR', 'REG', 'REGISTRY'
   );

UPDATE public.departments
   SET kind = 'support'
 WHERE kind = 'academic'
   AND upper(code) IN (
       'STU', 'STUDENT', 'AFF', 'AFFAIRS',
       'LIB', 'LIBRARY',
       'MNT', 'MAINT', 'MAINTENANCE',
       'TRN', 'TRANSPORT', 'BUS',
       'NURSE', 'CLINIC', 'HEALTH',
       'CANTEEN', 'FOOD'
   );
