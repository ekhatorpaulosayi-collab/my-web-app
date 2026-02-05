-- =====================================================
-- MIGRATION: Set Stores Public by Default
-- Created: December 30, 2024
-- Purpose: Ensure all stores are publicly accessible by default
-- =====================================================

-- SAFETY CHECK: Verify stores table exists before modifying
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
    RAISE EXCEPTION 'stores table does not exist. Cannot apply migration.';
  END IF;
END $$;

-- STEP 1: Set default value for is_public to TRUE
-- This ensures all NEW stores created will be public by default
ALTER TABLE stores
ALTER COLUMN is_public SET DEFAULT true;

-- STEP 2: Add helpful comment for developers
COMMENT ON COLUMN stores.is_public IS 'Whether store is publicly accessible. Defaults to TRUE - stores are public unless explicitly made private. This allows customers to view the store at /store/:slug';

-- STEP 3: Update existing private stores to public (SAFE - with reporting)
-- Count how many stores will be affected
DO $$
DECLARE
  private_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO private_count FROM stores WHERE is_public = false;

  IF private_count > 0 THEN
    RAISE NOTICE 'Found % private stores. Making them public...', private_count;

    -- Update all private stores to public
    UPDATE stores
    SET is_public = true
    WHERE is_public = false;

    RAISE NOTICE 'Successfully updated % stores to public', private_count;
  ELSE
    RAISE NOTICE 'No private stores found. All stores are already public.';
  END IF;
END $$;

-- STEP 4: Verify the default is set correctly
DO $$
DECLARE
  default_value TEXT;
BEGIN
  SELECT column_default INTO default_value
  FROM information_schema.columns
  WHERE table_name = 'stores' AND column_name = 'is_public';

  IF default_value = 'true' THEN
    RAISE NOTICE 'SUCCESS: stores.is_public default is now TRUE';
  ELSE
    RAISE WARNING 'WARNING: stores.is_public default may not be set correctly. Current value: %', default_value;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK PLAN (if needed - DO NOT RUN unless necessary)
-- =====================================================
-- To rollback this migration:
-- 1. ALTER TABLE stores ALTER COLUMN is_public SET DEFAULT false;
-- 2. COMMENT ON COLUMN stores.is_public IS NULL;
-- NOTE: This does NOT revert stores back to private - that would break customer access
-- =====================================================
