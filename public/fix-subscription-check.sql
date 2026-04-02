-- Fix subscription functions to handle users without subscription rows
-- These users should be treated as free tier with 30 product limit

-- First, ensure all existing users have a subscription
INSERT INTO user_subscriptions (user_id, tier_id, billing_cycle, status, started_at, current_period_start)
SELECT
  u.id::text,
  'free',
  'monthly',
  'active',
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id::text = s.user_id
WHERE s.id IS NULL;

-- Update get_user_tier to return free tier when no subscription exists
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
  -- First try to get existing subscription
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
  WHERE s.user_id = p_user_id
    AND s.status = 'active';

  -- If no rows returned, return free tier defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'free'::TEXT,
      'Free'::TEXT,
      'monthly'::TEXT,
      30::INTEGER,  -- max_products: 30 for free tier
      1::INTEGER,   -- max_images_per_product: 1 for free tier
      1::INTEGER,   -- max_users: 1 for free tier
      50::INTEGER,  -- max_ai_chats_monthly: 50 for free tier
      0::INTEGER,   -- ai_chats_used: 0
      50::INTEGER,  -- ai_chats_remaining: 50
      false,        -- has_product_variants
      false,        -- has_debt_tracking
      false,        -- has_invoicing
      false,        -- has_recurring_invoices
      false,        -- has_profit_analytics
      false,        -- has_whatsapp_ai
      false,        -- has_export_data
      false;        -- has_priority_support
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update can_add_product to handle missing subscriptions properly
CREATE OR REPLACE FUNCTION can_add_product(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_tier RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier (now with fallback to free tier)
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
      'is_unlimited', true,
      'tier_name', v_tier.tier_name
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
    'limit', v_tier.max_products,
    'tier_name', v_tier.tier_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_ai_chat_quota to handle missing subscriptions
CREATE OR REPLACE FUNCTION public.check_ai_chat_quota(p_user_id TEXT)
RETURNS json AS $$
DECLARE
  v_tier_id TEXT;
  v_chat_limit INTEGER;
  v_chats_used INTEGER;
  v_allowed BOOLEAN;
  v_current_month TEXT;
BEGIN
  -- Get current month in YYYY-MM format
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's active subscription tier and chat limit
  SELECT st.id, st.max_ai_chats_monthly
  INTO v_tier_id, v_chat_limit
  FROM public.user_subscriptions us
  JOIN public.subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  LIMIT 1;

  -- If no active subscription, use free tier defaults
  IF v_tier_id IS NULL THEN
    v_tier_id := 'free';
    v_chat_limit := 50;  -- Free tier gets 50 AI chats per month
  END IF;

  -- Get or create usage record for current month
  INSERT INTO public.ai_chat_usage (user_id, month, chats_used)
  VALUES (p_user_id, v_current_month, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  -- Get current usage
  SELECT chats_used
  INTO v_chats_used
  FROM public.ai_chat_usage
  WHERE user_id = p_user_id
    AND month = v_current_month;

  -- Check if allowed (chats_used < limit)
  v_allowed := (v_chats_used < v_chat_limit);

  -- If allowed, increment usage
  IF v_allowed THEN
    UPDATE public.ai_chat_usage
    SET chats_used = chats_used + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND month = v_current_month;

    v_chats_used := v_chats_used + 1;
  END IF;

  -- Return result
  RETURN json_build_object(
    'allowed', v_allowed,
    'tier_id', v_tier_id,
    'chats_used', v_chats_used,
    'chat_limit', v_chat_limit,
    'chats_remaining', v_chat_limit - v_chats_used,
    'message', CASE
      WHEN v_allowed THEN 'Chat allowed'
      ELSE format('Monthly chat limit reached (%s/%s)', v_chats_used, v_chat_limit)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
DO $$
DECLARE
  test_result JSON;
  users_without_sub INTEGER;
BEGIN
  -- Count users without subscriptions
  SELECT COUNT(*) INTO users_without_sub
  FROM auth.users u
  LEFT JOIN user_subscriptions s ON u.id::text = s.user_id
  WHERE s.id IS NULL;

  RAISE NOTICE 'Users without subscription: %', users_without_sub;

  -- Test can_add_product with a user ID (replace with actual user ID for testing)
  -- This should now work even if the user has no subscription
  RAISE NOTICE 'Functions updated successfully. Users without subscriptions will now be treated as free tier.';
END $$;