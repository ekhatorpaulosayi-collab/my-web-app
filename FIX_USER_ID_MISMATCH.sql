-- CRITICAL FIX: Check which user_id values exist in your sales table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: See all unique user_ids that have sales
SELECT DISTINCT
  user_id,
  COUNT(*) as sale_count,
  MIN(created_at) as first_sale,
  MAX(created_at) as last_sale
FROM sales
GROUP BY user_id
ORDER BY sale_count DESC;

-- Step 2: Check if there are Firebase UIDs vs Supabase UUIDs
-- Firebase UIDs look like: "abc123XYZ456..." (28 chars, alphanumeric)
-- Supabase UUIDs look like: "dffba89b-869d-422a-a542-2e2494850b44" (36 chars with dashes)
SELECT
  user_id,
  LENGTH(user_id) as id_length,
  CASE
    WHEN user_id LIKE '%-%-%-%-%' THEN 'Supabase UUID'
    ELSE 'Firebase UID'
  END as id_type,
  COUNT(*) as sale_count
FROM sales
GROUP BY user_id;

-- Step 3: Get a sample of recent sales to see what's being saved
SELECT
  id,
  user_id,
  product_name,
  created_at,
  sale_date
FROM sales
ORDER BY created_at DESC
LIMIT 10;