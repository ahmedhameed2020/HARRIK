-- ============================================================================
-- حَرِّك | HARRIK — Database Migration 11
--   * Storage bucket for organization logos
--
-- `organizations.logo_url` has existed since the initial schema, and the
-- onboarding wizard was specified to accept a logo upload (§9.2), but there
-- was nowhere to put the file — so the column could only ever hold a URL typed
-- in by hand, and the onboarding step did not exist.
--
-- Layout: one folder per tenant, `<organization_id>/<filename>`. The first path
-- segment is what the policies below authorise against, so a tenant can never
-- write into another tenant's folder.
--
-- The bucket is public-read on purpose: a logo is displayed on the parking
-- permit sticker and on screens that unauthenticated scanners reach, and
-- signed URLs would expire on a printed sticker. Nothing private is stored
-- here. Writes are restricted to that organization's own administrators.
--
-- Idempotent: safe to run twice.
-- ============================================================================

-- 1. THE BUCKET ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'org-logos',
    'org-logos',
    TRUE,
    2097152, -- 2 MiB: a logo, not a photograph
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. POLICIES -----------------------------------------------------------------
-- Helper predicate, inlined into each policy: the object's first path segment
-- is the caller's own organization, and the caller administers it.
--   (storage.foldername(name))[1] = '<organization_id>'

DROP POLICY IF EXISTS "org_logos_public_read" ON storage.objects;
CREATE POLICY "org_logos_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'org-logos');

DROP POLICY IF EXISTS "org_logos_admin_insert" ON storage.objects;
CREATE POLICY "org_logos_admin_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'org-logos'
        AND EXISTS (
            SELECT 1
              FROM public.profiles p
             WHERE p.id = auth.uid()
               AND p.is_active
               AND p.role IN ('admin', 'super_admin')
               AND p.organization_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "org_logos_admin_update" ON storage.objects;
CREATE POLICY "org_logos_admin_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'org-logos'
        AND EXISTS (
            SELECT 1
              FROM public.profiles p
             WHERE p.id = auth.uid()
               AND p.is_active
               AND p.role IN ('admin', 'super_admin')
               AND p.organization_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "org_logos_admin_delete" ON storage.objects;
CREATE POLICY "org_logos_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'org-logos'
        AND EXISTS (
            SELECT 1
              FROM public.profiles p
             WHERE p.id = auth.uid()
               AND p.is_active
               AND p.role IN ('admin', 'super_admin')
               AND p.organization_id::text = (storage.foldername(name))[1]
        )
    );

-- ============================================================================
-- VERIFICATION (run after applying)
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'org-logos';
--   SELECT policyname FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND policyname LIKE 'org_logos%';
-- Expect one bucket row and four policies.
-- ============================================================================
