-- =====================================================
-- STOREHOUSE SUBSCRIPTION TIER SYSTEM
-- Complete implementation with Monthly/Annual billing
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_tiers CASCADE;

-- =====================================================
-- TABLE 1: Subscription Tiers Definition
-- =====================================================
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly INTEGER NOT NULL, -- In Naira (kobo = price * 100 for Paystack)
  price_annual INTEGER NOT NULL,  -- Annual price (already discounted 20%)

  -- Product & Inventory Limits
  max_products INTEGER,           -- NULL = unlimited
  max_images_per_product INTEGER NOT NULL,

  -- Team Limits
  max_users INTEGER NOT NULL,

  -- AI & Chat Limits
  max_ai_chats_monthly INTEGER NOT NULL,

  -- Feature Flags
  has_product_variants BOOLEAN DEFAULT false,
  has_debt_tracking BOOLEAN DEFAULT false,
  has_invoicing BOOLEAN DEFAULT false,
  has_recurring_invoices BOOLEAN DEFAULT false,
  has_profit_analytics BOOLEAN DEFAULT false,
  has_advanced_analytics BOOLEAN DEFAULT false,
  has_whatsapp_ai BOOLEAN DEFAULT false,
  has_export_data BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_dedicated_manager BOOLEAN DEFAULT false,
  has_custom_training BOOLEAN DEFAULT false,
  has_store_customization BOOLEAN DEFAULT false,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert tier definitions
INSERT INTO subscription_tiers (
  id, name, description,
  price_monthly, price_annual,
  max_products, max_images_per_product, max_users, max_ai_chats_monthly,
  has_product_variants, has_debt_tracking, has_invoicing, has_recurring_invoices,
  has_profit_analytics, has_advanced_analytics, has_whatsapp_ai, has_export_data,
  has_priority_support, has_dedicated_manager, has_custom_training, has_store_customization,
  display_order
) VALUES
-- FREE TIER
(
  'free', 'Free', 'Perfect for solo entrepreneurs testing the waters',
  0, 0,                    -- Free
  50, 1, 1, 50,           -- 50 products, 1 image, 1 user, 50 AI chats
  false, false, false, false,
  false, false, false, false,
  false, false, false, false,
  1
),
-- STARTER TIER
(
  'starter', 'Starter', 'Perfect for small shops with 1-3 staff',
  5000, 48000,            -- ₦5,000/month or ₦48,000/year (20% off)
  200, 3, 3, 500,         -- 200 products, 3 images, 3 users, 500 AI chats
  true, true, true, false,
  true, true, false, true,
  false, false, false, true,
  2
),
-- PRO TIER
(
  'pro', 'Pro', 'For established businesses ready to dominate',
  10000, 96000,           -- ₦10,000/month or ₦96,000/year (20% off)
  NULL, 5, 5, 2000,       -- Unlimited products, 5 images, 5 users, 2000 AI chats
  true, true, true, true,
  true, true, true, true,
  true, false, false, true,
  3
),
-- BUSINESS TIER
(
  'business', 'Business', 'For serious retailers & multi-branch aspirations',
  15000, 144000,          -- ₦15,000/month or ₦144,000/year (20% off)
  NULL, 10, 10, 5000,     -- Unlimited products, 10 images, 10 users, 5000 AI chats
  true, true, true, true,
  true, true, true, true,
  true, true, true, true,
  4
);

-- =====================================================
-- TABLE 2: User Subscriptions
-- =====================================================
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current subscription
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id) DEFAULT 'free',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'annual'

  -- Payment status
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, trialing
  payment_provider TEXT, -- 'paystack', 'manual', etc.
  payment_reference TEXT,

  -- Subscription dates
  started_at TIMESTAMP DEFAULT NOW(),
  current_period_start TIMESTAMP DEFAULT NOW(),
  current_period_end TIMESTAMP,
  trial_ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- AI Chat quota tracking
  ai_chats_used_this_month INTEGER DEFAULT 0,
  ai_chats_reset_at TIMESTAMP DEFAULT NOW(),

  -- Free tier grace period (50 AI chats for first 3 months)
  free_tier_started_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_tier_id ON user_subscriptions(tier_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- =====================================================
-- FUNCTION: Auto-create free subscription on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, tier_id, billing_cycle, status)
  VALUES (NEW.id, 'free', 'monthly', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user signs up
CREATE TRIGGER on_user_created_create_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- =====================================================
-- FUNCTION: Get user's tier with all limits
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id TEXT)
RETURNS TABLE (
  tier_id TEXT,
  tier_name TEXT,
  billing_cycle TEXT,
  max_products INTEGER,
  max_images_per_product INTEGER,
  max_users INTEGER,
  max_ai_chats_monthly INTEGER,
  ai_chats_used INTEGER,
  ai_chats_remaining INTEGER,
  has_product_variants BOOLEAN,
  has_debt_tracking BOOLEAN,
  has_invoicing BOOLEAN,
  has_recurring_invoices BOOLEAN,
  has_profit_analytics BOOLEAN,
  has_whatsapp_ai BOOLEAN,
  has_export_data BOOLEAN,
  has_priority_support BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    s.billing_cycle,
    t.max_products,
    t.max_images_per_product,
    t.max_users,
    t.max_ai_chats_monthly,
    s.ai_chats_used_this_month,
    (t.max_ai_chats_monthly - COALESCE(s.ai_chats_used_this_month, 0)) as ai_chats_remaining,
    t.has_product_variants,
    t.has_debt_tracking,
    t.has_invoicing,
    t.has_recurring_invoices,
    t.has_profit_analytics,
    t.has_whatsapp_ai,
    t.has_export_data,
    t.has_priority_support
  FROM user_subscriptions s
  JOIN subscription_tiers t ON s.tier_id = t.id
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check if user can add a product
-- =====================================================
CREATE OR REPLACE FUNCTION can_add_product(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_tier RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier
  SELECT * INTO v_tier FROM get_user_tier(p_user_id);

  -- Count current products
  SELECT COUNT(*) INTO v_current_count
  FROM products
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- Check limit (NULL = unlimited)
  IF v_tier.max_products IS NULL THEN
    RETURN json_build_object(
      'allowed', true,
      'current_count', v_current_count,
      'limit', null,
      'is_unlimited', true
    );
  END IF;

  IF v_current_count >= v_tier.max_products THEN
    RETURN json_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'limit', v_tier.max_products,
      'tier_name', v_tier.tier_name,
      'reason', format('You''ve reached your %s tier limit of %s products', v_tier.tier_name, v_tier.max_products)
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'limit', v_tier.max_products
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check if user can add product image
-- =====================================================
CREATE OR REPLACE FUNCTION can_add_product_image(p_user_id TEXT, p_product_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_tier RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier
  SELECT * INTO v_tier FROM get_user_tier(p_user_id);

  -- Count current images for this product
  SELECT COUNT(*) INTO v_current_count
  FROM product_images
  WHERE product_id = p_product_id;

  IF v_current_count >= v_tier.max_images_per_product THEN
    RETURN json_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'limit', v_tier.max_images_per_product,
      'tier_name', v_tier.tier_name,
      'reason', format('Your %s tier allows %s images per product', v_tier.tier_name, v_tier.max_images_per_product)
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'limit', v_tier.max_images_per_product
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can update their own subscription (for quota tracking)
CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Everyone can view tier definitions (for pricing page)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON subscription_tiers FOR SELECT
  USING (is_active = true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON subscription_tiers TO anon, authenticated;
GRANT SELECT, UPDATE ON user_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tier TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_product TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_product_image TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE subscription_tiers IS 'Defines available subscription tiers with pricing and feature limits';
COMMENT ON TABLE user_subscriptions IS 'Tracks each user''s active subscription and usage quotas';
COMMENT ON FUNCTION get_user_tier IS 'Returns user''s current tier with all limits and remaining quotas';
COMMENT ON FUNCTION can_add_product IS 'Checks if user can add another product based on their tier limit';
COMMENT ON FUNCTION can_add_product_image IS 'Checks if user can add another image to a product based on their tier limit';
