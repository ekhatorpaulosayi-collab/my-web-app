-- =====================================================
-- TESTING PHASE: Make All Subscription Tiers FREE
-- =====================================================
-- This script sets all tier prices to 0 for testing
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Update all tiers to have 0 pricing
UPDATE subscription_tiers
SET
  price_monthly = 0,
  price_annual = 0,
  description = CASE
    WHEN id = 'free' THEN '🧪 TESTING PHASE - Free tier with basic limits'
    WHEN id = 'starter' THEN '🧪 TESTING PHASE - Free during beta (normally ₦5,000/month)'
    WHEN id = 'pro' THEN '🧪 TESTING PHASE - Free during beta (normally ₦10,000/month)'
    WHEN id = 'business' THEN '🧪 TESTING PHASE - Free during beta (normally ₦15,000/month)'
    ELSE description
  END,
  updated_at = NOW()
WHERE id IN ('free', 'starter', 'pro', 'business');

-- Verify the update
SELECT
  id,
  name,
  price_monthly,
  price_annual,
  max_products,
  max_users,
  max_ai_chats_monthly,
  description
FROM subscription_tiers
ORDER BY display_order;

-- =====================================================
-- IMPORTANT: To restore original pricing later, run:
-- =====================================================
-- UPDATE subscription_tiers SET price_monthly = 5000, price_annual = 48000 WHERE id = 'starter';
-- UPDATE subscription_tiers SET price_monthly = 10000, price_annual = 96000 WHERE id = 'pro';
-- UPDATE subscription_tiers SET price_monthly = 15000, price_annual = 144000 WHERE id = 'business';
