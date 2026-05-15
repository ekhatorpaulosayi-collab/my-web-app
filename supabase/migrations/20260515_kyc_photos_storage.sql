-- Step 2 — Supabase Storage: kyc-photos bucket + RLS policies.
-- Spec: docs/KYC_V1_SPEC.md §3.6
--
-- Bucket:
--   id/name:            kyc-photos
--   public:             false (no anonymous access)
--   file_size_limit:    5MB (5_242_880 bytes)
--   allowed_mime_types: image/jpeg, image/png
--
-- Path convention (enforced by RLS):
--   kyc-photos/{user_id}/{vendor_kyc_id}/selfie.jpg
--
-- RLS model: storage.objects has RLS enabled. Without policies,
-- no role except service_role can touch kyc-photos objects.
-- We add 4 policies (INSERT/SELECT/UPDATE/DELETE), each scoped
-- to bucket_id='kyc-photos' AND first-folder-equals-caller's-UID.
-- Reviewer scripts use service_role and bypass RLS, so signed-URL
-- generation works transparently.
--
-- (storage.foldername(name))[1] returns the first path segment.
-- Using (select auth.uid()) instead of bare auth.uid() so Postgres
-- caches the value once per query rather than evaluating per row
-- (Supabase recommendation).

-- 1. Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-photos',
  'kyc-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies

CREATE POLICY kyc_photos_insert_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-photos'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

CREATE POLICY kyc_photos_select_own ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-photos'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

CREATE POLICY kyc_photos_update_own ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc-photos'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'kyc-photos'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

CREATE POLICY kyc_photos_delete_own ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-photos'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );
