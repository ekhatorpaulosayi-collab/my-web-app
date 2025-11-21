-- =====================================================
-- Add Product Attributes Feature
-- Allows category-specific fields (size, color, etc.)
-- =====================================================

-- Add attributes column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_products_attributes
ON products USING gin(attributes);

-- Add index for specific attribute searches (e.g., filter by size)
CREATE INDEX IF NOT EXISTS idx_products_attributes_keys
ON products USING gin(attributes jsonb_path_ops);

-- Update existing products to have empty attributes object
UPDATE products
SET attributes = '{}'::jsonb
WHERE attributes IS NULL;

-- Verify the change
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name = 'attributes';

-- Example queries for testing:
-- 1. Find all products with specific size
-- SELECT * FROM products WHERE attributes->>'size' = 'XL';

-- 2. Find products with any size attribute
-- SELECT * FROM products WHERE attributes ? 'size';

-- 3. Find products with multiple attribute matches
-- SELECT * FROM products
-- WHERE attributes->>'color' = 'Blue'
--   AND attributes->>'size' = 'L';
