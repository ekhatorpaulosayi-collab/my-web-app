-- =====================================================
-- RESTORE ORIGINAL PRICING
-- =====================================================
-- Run this when testing phase is over to restore paid pricing
-- =====================================================

-- Restore original pricing for each tier
UPDATE subscription_tiers
SET
  price_monthly = CASE
    WHEN id = 'free' THEN 0
    WHEN id = 'starter' THEN 5000
    WHEN id = 'pro' THEN 10000
    WHEN id = 'business' THEN 15000
  END,
  price_annual = CASE
    WHEN id = 'free' THEN 0
    WHEN id = 'starter' THEN 48000
    WHEN id = 'pro' THEN 96000
    WHEN id = 'business' THEN 144000
  END,
  description = CASE
    WHEN id = 'free' THEN 'Perfect for solo entrepreneurs testing the waters'
    WHEN id = 'starter' THEN 'Perfect for small shops with 1-3 staff'
    WHEN id = 'pro' THEN 'For established businesses ready to dominate'
    WHEN id = 'business' THEN 'For serious retailers & multi-branch aspirations'
  END,
  updated_at = NOW()
WHERE id IN ('free', 'starter', 'pro', 'business');

-- Verify the restoration
SELECT
  id,
  name,
  price_monthly,
  price_annual,
  description
FROM subscription_tiers
ORDER BY display_order;

-- NOTE: This does NOT downgrade existing users
-- Users who got PRO during testing will keep it
-- New signups will start on FREE tier and need to pay to upgrade
