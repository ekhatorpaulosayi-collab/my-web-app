-- Add visibility columns to products table if they don't exist

-- Add is_public column (for storefront visibility)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add is_active column (for active/archived products)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_featured column (for featured products)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Update existing products to be public and active
UPDATE products
SET
  is_public = true,
  is_active = true
WHERE is_public IS NULL OR is_active IS NULL;

-- Verification: Check all products
SELECT
  id,
  name,
  is_public,
  is_active,
  is_featured,
  quantity,
  selling_price / 100 as price_naira
FROM products
WHERE user_id = 'qLU0oHxiSHhLHWt9aqTg57M4L5F3';
