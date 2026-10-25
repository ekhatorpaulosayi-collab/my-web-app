-- Check if store exists with slug 'paulglobal22'
SELECT
  user_id,
  business_name,
  store_slug,
  is_public
FROM stores
WHERE store_slug = 'paulglobal22';

-- Check products for the store owner
SELECT
  p.id,
  p.name,
  p.selling_price / 100 as price_naira,
  p.quantity,
  p.is_public,
  p.is_active,
  p.image_url,
  p.user_id
FROM products p
WHERE p.user_id = 'qLU0oHxiSHhLHWt9aqTg57M4L5F3'
  AND p.is_public = true
  AND p.is_active = true
  AND p.quantity > 0
ORDER BY p.name;
