-- Supabase Storage Buckets Setup
-- Run this in Supabase SQL Editor to create storage buckets for images

-- Create 'products' bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Create 'stores' bucket for store logos and banners
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stores',
  'stores',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for 'products' bucket
-- Allow users to upload their own product images
CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own product images
CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own product images
CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all product images
CREATE POLICY "Public read access to product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Set up RLS policies for 'stores' bucket
-- Allow users to upload their own store images
CREATE POLICY "Users can upload store images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stores' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own store images
CREATE POLICY "Users can update own store images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stores' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own store images
CREATE POLICY "Users can delete own store images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stores' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all store images
CREATE POLICY "Public read access to store images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'stores');

-- Verification query
SELECT
  b.name as bucket_name,
  b.public as is_public,
  b.file_size_limit / 1024 / 1024 as size_limit_mb,
  b.allowed_mime_types
FROM storage.buckets b
WHERE b.name IN ('products', 'stores');
