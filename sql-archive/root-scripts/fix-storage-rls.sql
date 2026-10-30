-- Fix Storage RLS Policies for Firebase Auth Users
-- This allows uploads even when using Firebase authentication instead of Supabase auth

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload store images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own store images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own store images" ON storage.objects;

-- Create permissive policies for migration phase
-- These allow all authenticated users (including anon with valid JWT) to upload

-- Products bucket policies
CREATE POLICY "Allow all uploads to products bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Allow all updates to products bucket"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'products');

CREATE POLICY "Allow all deletes from products bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'products');

-- Stores bucket policies
CREATE POLICY "Allow all uploads to stores bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'stores');

CREATE POLICY "Allow all updates to stores bucket"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'stores');

CREATE POLICY "Allow all deletes from stores bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'stores');

-- Verification
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
