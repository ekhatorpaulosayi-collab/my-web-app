-- Fix phantom sales issue
-- Delete orphan sales records that have no valid product

-- First, identify and log orphan sales for audit
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM sales
  WHERE product_id IS NULL
     OR product_id NOT IN (SELECT id FROM products);

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orphan sales records to clean up', orphan_count;
  END IF;
END $$;

-- Delete orphan sales (no valid product)
DELETE FROM sales
WHERE product_id IS NULL
   OR product_id NOT IN (SELECT id FROM products);

-- Add constraint to prevent future orphan sales
-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sales_product'
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales
    ADD CONSTRAINT fk_sales_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add NOT NULL constraint to product_id if not already present
-- This ensures sales must have a product
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales'
    AND column_name = 'product_id'
    AND is_nullable = 'YES'
  ) THEN
    -- First ensure no NULL values exist
    DELETE FROM sales WHERE product_id IS NULL;
    -- Then add the constraint
    ALTER TABLE sales ALTER COLUMN product_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);

-- Add validation trigger to prevent invalid product_id
CREATE OR REPLACE FUNCTION validate_sale_product()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'Product ID cannot be null for sales';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.product_id) THEN
    RAISE EXCEPTION 'Product with ID % does not exist', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_sale_product_trigger ON sales;
CREATE TRIGGER validate_sale_product_trigger
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_product();