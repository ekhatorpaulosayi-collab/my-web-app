-- =====================================================
-- STOREHOUSE: Multi-Image Upload + AI Chat Improvements
-- =====================================================
-- This migration adds:
-- 1. Multi-image support per product (1/3/5/10 per tier)
-- 2. Updated AI chat quota (80% flexible / 20% storefront)
-- 3. Product/user limits enforcement
-- 4. User tracking for AI context awareness
-- =====================================================

-- =====================================================
-- PART 1: MULTI-IMAGE SUPPORT
-- =====================================================

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL,  -- References products by ID (using TEXT to match existing schema)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER DEFAULT 0,  -- For ordering images
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_user_id ON product_images(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);

-- RLS policies for product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Users can only see their own product images
CREATE POLICY product_images_select ON product_images
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own product images
CREATE POLICY product_images_insert ON product_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own product images
CREATE POLICY product_images_update ON product_images
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own product images
CREATE POLICY product_images_delete ON product_images
  FOR DELETE USING (auth.uid() = user_id);

-- Public access for storefront (read-only)
CREATE POLICY product_images_public_select ON product_images
  FOR SELECT USING (true);

-- =====================================================
-- PART 2: SUBSCRIPTION TIERS & LIMITS
-- =====================================================

-- Update subscription_tiers table with new limits
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS product_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS images_per_product INTEGER DEFAULT 1;

-- Set default limits based on tier
UPDATE subscription_tiers
SET
  product_limit = CASE tier
    WHEN 'free' THEN 50
    WHEN 'starter' THEN 200
    WHEN 'pro' THEN 999999
    WHEN 'business' THEN 999999
    ELSE 50
  END,
  user_limit = CASE tier
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 5
    WHEN 'business' THEN 999999
    ELSE 1
  END,
  images_per_product = CASE tier
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 3
    WHEN 'pro' THEN 5
    WHEN 'business' THEN 10
    ELSE 1
  END
WHERE product_limit IS NULL OR user_limit IS NULL OR images_per_product IS NULL;

-- =====================================================
-- PART 3: AI CHAT QUOTA UPDATE (80/20 SPLIT)
-- =====================================================

-- Update ai_chat_usage table structure
ALTER TABLE ai_chat_usage
DROP COLUMN IF EXISTS onboarding_used,
DROP COLUMN IF EXISTS onboarding_limit,
DROP COLUMN IF EXISTS help_used,
DROP COLUMN IF EXISTS help_limit,
ADD COLUMN IF NOT EXISTS flexible_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flexible_limit INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS tier_started_at TIMESTAMP DEFAULT NOW();

-- Update existing records with new quota structure
UPDATE ai_chat_usage
SET
  flexible_limit = CASE
    WHEN storefront_limit = 0 THEN 16  -- Free tier after 3 months (80% of 20)
    WHEN storefront_limit = 10 THEN 40  -- Free tier first 3 months (80% of 50)
    WHEN storefront_limit = 100 THEN 400  -- Starter tier (80% of 500)
    WHEN storefront_limit = 300 THEN 1200  -- Pro tier (80% of 1500)
    WHEN storefront_limit = 2000 THEN 8000  -- Business tier (80% of 10000)
    ELSE 40
  END,
  storefront_limit = CASE
    WHEN storefront_limit = 0 THEN 4  -- Free tier after 3 months (20% of 20)
    WHEN storefront_limit = 10 THEN 10  -- Free tier first 3 months (20% of 50)
    WHEN storefront_limit = 100 THEN 100  -- Starter tier (20% of 500)
    WHEN storefront_limit = 300 THEN 300  -- Pro tier (20% of 1500)
    WHEN storefront_limit = 2000 THEN 2000  -- Business tier (20% of 10000)
    ELSE 10
  END
WHERE flexible_limit IS NULL OR tier_started_at IS NULL;

-- =====================================================
-- PART 4: HELPER FUNCTIONS
-- =====================================================

-- Function to get image count for a product
CREATE OR REPLACE FUNCTION get_product_image_count(p_product_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM product_images WHERE product_id = p_product_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can add more images to a product
CREATE OR REPLACE FUNCTION can_add_product_image(p_user_id UUID, p_product_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_image_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier and image limit
  SELECT tier, images_per_product INTO v_tier, v_image_limit
  FROM subscription_tiers
  WHERE user_id = p_user_id;

  -- Get current image count for product
  v_current_count := get_product_image_count(p_product_id);

  -- Return result
  RETURN jsonb_build_object(
    'can_add', v_current_count < v_image_limit,
    'current_count', v_current_count,
    'limit', v_image_limit,
    'tier', v_tier
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can add more products
CREATE OR REPLACE FUNCTION can_add_product(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_product_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier and product limit
  SELECT tier, product_limit INTO v_tier, v_product_limit
  FROM subscription_tiers
  WHERE user_id = p_user_id;

  -- Count user's current products (you'll need to adapt based on your products table)
  -- Assuming products are in Firebase, we can't count here directly
  -- This would need to be checked in the application layer

  RETURN jsonb_build_object(
    'tier', v_tier,
    'limit', v_product_limit
  );
END;
$$ LANGUAGE plpgsql;

-- Updated quota check function with flexible/storefront split
CREATE OR REPLACE FUNCTION check_chat_quota(p_user_id UUID, p_context_type TEXT DEFAULT 'help')
RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_current_month DATE;
  v_used INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_months_since_start INTEGER;
BEGIN
  v_current_month := DATE_TRUNC('month', NOW());

  -- Get user's tier
  SELECT tier INTO v_tier FROM subscription_tiers WHERE user_id = p_user_id;

  -- Get or create usage record
  SELECT * INTO v_usage FROM ai_chat_usage
  WHERE user_id = p_user_id AND month = v_current_month;

  IF v_usage IS NULL THEN
    -- Create new record with appropriate limits
    INSERT INTO ai_chat_usage (user_id, month, flexible_limit, storefront_limit, tier_started_at)
    SELECT
      p_user_id,
      v_current_month,
      CASE v_tier
        WHEN 'free' THEN 40  -- First 3 months: 80% of 50
        WHEN 'starter' THEN 400  -- 80% of 500
        WHEN 'pro' THEN 1200  -- 80% of 1500
        WHEN 'business' THEN 8000  -- 80% of 10000
        ELSE 40
      END,
      CASE v_tier
        WHEN 'free' THEN 10  -- First 3 months: 20% of 50
        WHEN 'starter' THEN 100  -- 20% of 500
        WHEN 'pro' THEN 300  -- 20% of 1500
        WHEN 'business' THEN 2000  -- 20% of 10000
        ELSE 10
      END,
      COALESCE(
        (SELECT tier_started_at FROM subscription_tiers WHERE user_id = p_user_id),
        NOW()
      )
    RETURNING * INTO v_usage;
  END IF;

  -- Check if free tier and past 3 months - downgrade limits
  IF v_tier = 'free' THEN
    v_months_since_start := EXTRACT(MONTH FROM AGE(NOW(), v_usage.tier_started_at));
    IF v_months_since_start >= 3 THEN
      v_usage.flexible_limit := 16;  -- 80% of 20
      v_usage.storefront_limit := 4;  -- 20% of 20
    END IF;
  END IF;

  -- Determine which quota to use
  IF p_context_type = 'storefront' THEN
    v_used := v_usage.storefront_used;
    v_limit := v_usage.storefront_limit;
  ELSE
    -- 'onboarding', 'help', 'tips' all use flexible pool
    v_used := v_usage.flexible_used;
    v_limit := v_usage.flexible_limit;
  END IF;

  -- Check if quota available
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'quota_type', p_context_type,
      'used', v_used,
      'limit', v_limit,
      'remaining', 0,
      'tier', v_tier,
      'message', 'Monthly ' || p_context_type || ' chat limit reached. Upgrade for more!'
    );
  END IF;

  -- Increment usage
  IF p_context_type = 'storefront' THEN
    UPDATE ai_chat_usage
    SET storefront_used = storefront_used + 1, last_chat_at = NOW()
    WHERE user_id = p_user_id AND month = v_current_month;
  ELSE
    UPDATE ai_chat_usage
    SET flexible_used = flexible_used + 1, last_chat_at = NOW()
    WHERE user_id = p_user_id AND month = v_current_month;
  END IF;

  -- Return quota info
  RETURN jsonb_build_object(
    'allowed', true,
    'quota_type', p_context_type,
    'used', v_used + 1,
    'limit', v_limit,
    'remaining', v_limit - v_used - 1,
    'tier', v_tier,
    'flexible_used', CASE WHEN p_context_type = 'storefront' THEN v_usage.flexible_used ELSE v_usage.flexible_used + 1 END,
    'flexible_limit', v_usage.flexible_limit,
    'storefront_used', CASE WHEN p_context_type = 'storefront' THEN v_usage.storefront_used + 1 ELSE v_usage.storefront_used END,
    'storefront_limit', v_usage.storefront_limit
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 5: MIGRATION COMPLETE
-- =====================================================

-- Summary comment
COMMENT ON TABLE product_images IS 'Stores multiple images per product with ordering and primary image designation';
COMMENT ON FUNCTION check_chat_quota IS 'Updated to support 80% flexible / 20% storefront quota split';
COMMENT ON FUNCTION can_add_product_image IS 'Checks if user can add more images based on their tier (1/3/5/10)';
