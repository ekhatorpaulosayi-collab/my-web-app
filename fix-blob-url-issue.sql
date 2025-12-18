-- =====================================================
-- FIX: Remove Blob URL Images from Database
-- =====================================================
-- This removes broken image entries that have blob: URLs
-- instead of proper Supabase Storage URLs
-- =====================================================

-- Step 1: Find all blob URL images
SELECT
  id,
  product_id,
  image_url,
  position,
  created_at
FROM product_images
WHERE image_url LIKE 'blob:%'
ORDER BY created_at DESC;

-- Step 2: Delete blob URL images (UNCOMMENT TO RUN)
-- DELETE FROM product_images
-- WHERE image_url LIKE 'blob:%';

-- Step 3: Verify deletion
-- SELECT COUNT(*) as remaining_blob_urls
-- FROM product_images
-- WHERE image_url LIKE 'blob:%';

-- =====================================================
-- After running this, users will need to re-upload
-- the affected images (positions 3, 4, 5, etc.)
-- =====================================================
