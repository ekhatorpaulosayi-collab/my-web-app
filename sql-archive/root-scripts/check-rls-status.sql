-- Check RLS status and policies for storefront tables

-- 1. Check if RLS is enabled on tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('stores', 'products')
  AND schemaname = 'public';

-- 2. Check existing policies on stores table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'stores';

-- 3. Check existing policies on products table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'products';

-- 4. Test the exact query the frontend is running
-- (Simulating anonymous access - no auth context)
SELECT
  user_id,
  business_name,
  store_slug,
  is_public
FROM stores
WHERE store_slug = 'paulglobal22'
  AND is_public = true;

-- 5. If store exists, test products query
SELECT
  id,
  name,
  selling_price / 100 as price_naira,
  quantity,
  is_public,
  is_active,
  image_url
FROM products
WHERE user_id = 'qLU0oHxiSHhLHWt9aqTg57M4L5F3'
  AND is_public = true
  AND is_active = true
  AND quantity > 0
ORDER BY name;
