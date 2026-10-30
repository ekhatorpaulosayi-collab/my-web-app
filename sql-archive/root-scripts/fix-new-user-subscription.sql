-- Fix for new users not getting free subscriptions
-- This ensures new accounts can add products immediately

-- Step 1: Create free subscriptions for ALL existing users who don't have one
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
WHERE s.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_created_create_subscription ON auth.users;
DROP FUNCTION IF EXISTS create_default_subscription CASCADE;

-- Step 3: Create a more robust function that handles errors
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if subscription doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = NEW.id::text
  ) THEN
    INSERT INTO user_subscriptions (
      user_id,
      tier_id,
      billing_cycle,
      status,
      started_at,
      current_period_start,
      ai_chats_used_this_month
    )
    VALUES (
      NEW.id::text,
      'free',
      'monthly',
      'active',
      NOW(),
      NOW(),
      0
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Could not create default subscription for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger that runs after user creation
CREATE TRIGGER on_user_created_create_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- Step 5: Update the get_user_tier function to handle missing subscriptions gracefully
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
  -- First try to get actual subscription
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

  -- If no subscription found, return free tier defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'free'::TEXT,
      'Free'::TEXT,
      'monthly'::TEXT,
      50,  -- max_products
      1,   -- max_images_per_product
      1,   -- max_users
      100, -- max_ai_chats_monthly
      0,   -- ai_chats_used
      100, -- ai_chats_remaining
      false, -- has_product_variants
      true,  -- has_debt_tracking
      true,  -- has_invoicing
      false, -- has_recurring_invoices
      true,  -- has_profit_analytics
      false, -- has_whatsapp_ai
      true,  -- has_export_data
      false; -- has_priority_support
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update can_add_product to handle missing tier gracefully
CREATE OR REPLACE FUNCTION can_add_product(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_tier RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier (will now always return something)
  SELECT * INTO v_tier FROM get_user_tier(p_user_id);

  -- If no tier returned (shouldn't happen now), default to free tier
  IF v_tier IS NULL THEN
    v_tier := ROW('free', 'Free', 'monthly', 50, 1, 1, 100, 0, 100,
                  false, true, true, false, true, false, true, false);
  END IF;

  -- Count current products
  SELECT COUNT(*) INTO v_current_count
  FROM products
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- Check limit (NULL = unlimited)
  IF v_tier.max_products IS NULL THEN
    RETURN json_build_object(
      'allowed', true,
      'currentCount', v_current_count,
      'limit', null,
      'isUnlimited', true,
      'tierName', COALESCE(v_tier.tier_name, 'Free')
    );
  END IF;

  -- Check if within limit
  IF v_current_count >= v_tier.max_products THEN
    RETURN json_build_object(
      'allowed', false,
      'currentCount', v_current_count,
      'limit', v_tier.max_products,
      'tierName', COALESCE(v_tier.tier_name, 'Free'),
      'reason', format('You''ve reached your %s tier limit of %s products',
                      COALESCE(v_tier.tier_name, 'Free'), v_tier.max_products)
    );
  END IF;

  -- Allow adding product
  RETURN json_build_object(
    'allowed', true,
    'currentCount', v_current_count,
    'limit', v_tier.max_products,
    'tierName', COALESCE(v_tier.tier_name, 'Free')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the fix
DO $$
DECLARE
  users_without_subscription INTEGER;
  total_users INTEGER;
BEGIN
  -- Count users without subscriptions
  SELECT COUNT(*) INTO users_without_subscription
  FROM auth.users u
  LEFT JOIN user_subscriptions s ON u.id::text = s.user_id
  WHERE s.id IS NULL;

  -- Count total users
  SELECT COUNT(*) INTO total_users FROM auth.users;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'SUBSCRIPTION FIX RESULTS:';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users without subscription: %', users_without_subscription;

  IF users_without_subscription = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All users now have subscriptions!';
  ELSE
    RAISE WARNING '⚠️ WARNING: % users still without subscription', users_without_subscription;
  END IF;
  RAISE NOTICE '====================================';
END $$;