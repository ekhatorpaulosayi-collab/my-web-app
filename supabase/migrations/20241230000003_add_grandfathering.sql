-- Add grandfathering support for beta users
-- Created: December 30, 2024
-- Purpose: Give unlimited AI to current users, enforce limits for new users

-- Add grandfathering columns to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS grandfathered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS grandfathered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grandfathered_reason TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grandfathered
ON user_subscriptions(grandfathered)
WHERE grandfathered = true;

-- Mark ALL CURRENT users as grandfathered (unlimited AI forever)
-- This gives unlimited AI to anyone who signed up before this migration runs
UPDATE user_subscriptions
SET
  grandfathered = true,
  grandfathered_at = NOW(),
  grandfathered_reason = 'Beta tester - unlimited AI chats forever as thank you for early support'
WHERE grandfathered IS NULL OR grandfathered = false;

-- Comment for future reference
COMMENT ON COLUMN user_subscriptions.grandfathered IS 'Beta users get unlimited AI chats forever';
COMMENT ON COLUMN user_subscriptions.grandfathered_at IS 'When user was grandfathered';
COMMENT ON COLUMN user_subscriptions.grandfathered_reason IS 'Why user was grandfathered';

-- Update Free tier to 30 AI chats/month (for NEW users only)
UPDATE subscription_tiers
SET max_ai_chats_monthly = 30
WHERE name = 'Free';

-- Verify other tiers are correct
UPDATE subscription_tiers
SET max_ai_chats_monthly = 500
WHERE name = 'Starter';

UPDATE subscription_tiers
SET max_ai_chats_monthly = 1500
WHERE name = 'Pro';

UPDATE subscription_tiers
SET max_ai_chats_monthly = 10000
WHERE name = 'Business';
