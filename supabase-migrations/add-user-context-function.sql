-- =====================================================
-- USER CONTEXT FUNCTION FOR AI CHAT
-- =====================================================
-- This function gathers all relevant user data for AI personalization

CREATE OR REPLACE FUNCTION get_user_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
  v_tier TEXT;
  v_product_limit INTEGER;
  v_images_per_product INTEGER;
  v_signup_date TIMESTAMP;
  v_days_since_signup INTEGER;
BEGIN
  -- Get tier information
  SELECT
    tier,
    product_limit,
    images_per_product,
    created_at
  INTO
    v_tier,
    v_product_limit,
    v_images_per_product,
    v_signup_date
  FROM subscription_tiers
  WHERE user_id = p_user_id;

  -- Calculate days since signup
  v_days_since_signup := EXTRACT(DAY FROM AGE(NOW(), COALESCE(v_signup_date, NOW())));

  -- Build context object
  -- Note: Product count, sales count etc. are stored in Firebase
  -- We'll pass what we have from Supabase and let the app layer add Firebase data
  v_context := jsonb_build_object(
    'tier', COALESCE(v_tier, 'free'),
    'product_limit', COALESCE(v_product_limit, 50),
    'images_per_product', COALESCE(v_images_per_product, 1),
    'days_since_signup', v_days_since_signup,
    'signup_date', v_signup_date
  );

  RETURN v_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_context TO authenticated, service_role;

COMMENT ON FUNCTION get_user_context IS 'Returns user context for AI personalization including tier, limits, and signup date';
