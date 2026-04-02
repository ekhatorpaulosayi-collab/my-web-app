-- Fix product limit for Free tier (should be 30, not 12)
-- This fixes the subscription redirect issue at 12 products

-- Update Free tier to 30 products
UPDATE subscription_tiers
SET max_products = 30
WHERE LOWER(name) = 'free' AND max_products != 30;

-- Log the change for audit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM subscription_tiers
    WHERE LOWER(name) = 'free' AND max_products = 30
  ) THEN
    RAISE NOTICE 'Free tier product limit correctly set to 30 products';
  END IF;
END $$;

-- Verify all tiers have correct limits
SELECT
  name,
  max_products,
  CASE
    WHEN LOWER(name) = 'free' THEN '✅ Should be 30'
    WHEN LOWER(name) = 'starter' THEN '✅ Should be 200'
    WHEN LOWER(name) IN ('pro', 'business', 'enterprise') THEN '✅ Should be unlimited (999999 or NULL)'
    ELSE '⚠️ Unknown tier'
  END as expected_limit
FROM subscription_tiers
WHERE is_active = true
ORDER BY display_order;