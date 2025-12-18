-- =====================================================
-- TESTING PHASE: Upgrade All Users to PRO Tier
-- =====================================================
-- This upgrades all existing users from 'free' to 'pro'
-- so they can test all features with higher limits
-- =====================================================

-- Upgrade all users to PRO tier
UPDATE user_subscriptions
SET
  tier_id = 'pro',
  status = 'active',
  updated_at = NOW()
WHERE tier_id = 'free';

-- Verify the upgrade
SELECT
  user_id,
  tier_id,
  status,
  billing_cycle,
  ai_chats_used_this_month
FROM user_subscriptions
ORDER BY created_at DESC;

-- =====================================================
-- What PRO tier gives users (all FREE during testing):
-- =====================================================
-- ✅ Unlimited products (no limit)
-- ✅ 5 images per product
-- ✅ 5 users/staff members
-- ✅ 2000 AI chats per month
-- ✅ Product variants
-- ✅ Debt tracking
-- ✅ Invoicing
-- ✅ Recurring invoices
-- ✅ Profit analytics
-- ✅ Advanced analytics
-- ✅ WhatsApp AI
-- ✅ Data export
-- ✅ Priority support
