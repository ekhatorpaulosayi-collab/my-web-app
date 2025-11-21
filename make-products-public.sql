-- Make all products public (visible on storefront)
-- Run this in Supabase SQL Editor

UPDATE products
SET is_public = true, is_active = true
WHERE user_id = 'qLU0oHxiSHhLHWt9aqTg57M4L5F3';

-- Verification: Check all products
SELECT
  id,
  name,
  is_public,
  is_active,
  quantity,
  selling_price / 100 as price_naira
FROM products
WHERE user_id = 'qLU0oHxiSHhLHWt9aqTg57M4L5F3';
