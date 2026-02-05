-- =====================================================
-- MIGRATION: Set Products Public by Default
-- Created: December 30, 2024
-- Purpose: Ensure all products are publicly visible by default
-- =====================================================

-- SAFETY CHECK: Verify products table exists before modifying
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    RAISE EXCEPTION 'products table does not exist. Cannot apply migration.';
  END IF;
END $$;

-- STEP 1: Set default value for is_public to TRUE
-- This ensures all NEW products created will be visible on storefront by default
ALTER TABLE products
ALTER COLUMN is_public SET DEFAULT true;

-- STEP 2: Add helpful comment for developers
COMMENT ON COLUMN products.is_public IS 'Whether product is visible on public storefront. Defaults to TRUE - products are shown unless owner explicitly hides them. Hidden products are only visible in owner dashboard.';

-- STEP 3: Report on existing private products (DO NOT auto-update - owner may have intentionally hidden them)
DO $$
DECLARE
  private_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM products;
  SELECT COUNT(*) INTO private_count FROM products WHERE is_public = false;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'PRODUCTS VISIBILITY REPORT';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total products: %', total_count;
  RAISE NOTICE 'Private products: % (%.1f%%)', private_count, (private_count::FLOAT / NULLIF(total_count, 0) * 100);
  RAISE NOTICE 'Public products: % (%.1f%%)', (total_count - private_count), ((total_count - private_count)::FLOAT / NULLIF(total_count, 0) * 100);
  RAISE NOTICE '==========================================';

  IF private_count > 0 THEN
    RAISE NOTICE 'NOTE: % private products found but NOT auto-updated', private_count;
    RAISE NOTICE 'Reason: Owners may have intentionally hidden these products';
    RAISE NOTICE 'To make ALL products public (use with caution):';
    RAISE NOTICE '  UPDATE products SET is_public = true WHERE is_public = false;';
  ELSE
    RAISE NOTICE 'All products are already public!';
  END IF;
END $$;

-- STEP 4: Verify the default is set correctly
DO $$
DECLARE
  default_value TEXT;
BEGIN
  SELECT column_default INTO default_value
  FROM information_schema.columns
  WHERE table_name = 'products' AND column_name = 'is_public';

  IF default_value = 'true' THEN
    RAISE NOTICE 'SUCCESS: products.is_public default is now TRUE';
  ELSE
    RAISE WARNING 'WARNING: products.is_public default may not be set correctly. Current value: %', default_value;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK PLAN (if needed - DO NOT RUN unless necessary)
-- =====================================================
-- To rollback this migration:
-- 1. ALTER TABLE products ALTER COLUMN is_public SET DEFAULT false;
-- 2. COMMENT ON COLUMN products.is_public IS NULL;
-- =====================================================
