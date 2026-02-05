-- Fix check_chat_quota to handle stale sessions gracefully
-- Created: January 14, 2025
-- Purpose: Prevent stale localStorage sessions from triggering quota errors

-- Drop existing function
DROP FUNCTION IF EXISTS check_chat_quota(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_chat_quota(
  p_user_id UUID,
  p_context_type TEXT DEFAULT 'help'
)
RETURNS TABLE (
  allowed BOOLEAN,
  chats_used INTEGER,
  chat_limit INTEGER,
  remaining INTEGER,
  message TEXT,
  is_grandfathered BOOLEAN
) AS $$
DECLARE
  v_subscription RECORD;
  v_tier RECORD;
  v_chat_count INTEGER;
  v_user_exists BOOLEAN;
BEGIN
  -- ✅ FIRST: Check if this is a valid, active user
  -- This prevents stale localStorage sessions from triggering quota checks
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
  ) INTO v_user_exists;

  -- If user doesn't exist in auth.users, treat as visitor (no quota check)
  -- This handles stale sessions gracefully
  IF NOT v_user_exists THEN
    RETURN QUERY SELECT
      true::boolean AS allowed,
      0::integer AS chats_used,
      -1::integer AS chat_limit,
      999999::integer AS remaining,
      'Guest access - no limits applied'::text AS message,
      false::boolean AS is_grandfathered;
    RETURN;
  END IF;

  -- Get user's subscription
  SELECT
    us.*,
    st.max_ai_chats_monthly,
    st.name as tier_name
  INTO v_subscription
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id
  LIMIT 1;

  -- If no subscription found, allow with warning (fail open)
  -- This should trigger subscription creation in the app
  IF v_subscription IS NULL THEN
    RETURN QUERY SELECT
      true::boolean AS allowed,
      0::integer AS chats_used,
      0::integer AS chat_limit,
      0::integer AS remaining,
      'Setting up your account... Please refresh if this persists.'::text AS message,
      false::boolean AS is_grandfathered;
    RETURN;
  END IF;

  -- ✅ GRANDFATHERED USERS (Beta testers) - UNLIMITED AI FOREVER!
  IF v_subscription.grandfathered = true THEN
    -- Count their chats just for stats (not for limiting)
    SELECT COUNT(*) INTO v_chat_count
    FROM ai_chat_messages acm
    JOIN ai_chat_conversations acc ON acm.conversation_id = acc.id
    WHERE acc.user_id = p_user_id
      AND acm.created_at >= date_trunc('month', NOW());

    RETURN QUERY SELECT
      true::boolean AS allowed,
      v_chat_count::integer AS chats_used,
      -1::integer AS chat_limit,  -- -1 indicates unlimited
      999999::integer AS remaining,  -- Effectively unlimited
      '🎉 Beta Tester - Unlimited AI Chats Forever!'::text AS message,
      true::boolean AS is_grandfathered;
    RETURN;
  END IF;

  -- Count chats this month for regular users
  SELECT COUNT(*) INTO v_chat_count
  FROM ai_chat_messages acm
  JOIN ai_chat_conversations acc ON acm.conversation_id = acc.id
  WHERE acc.user_id = p_user_id
    AND acm.created_at >= date_trunc('month', NOW())
    AND acm.role = 'user';  -- Only count user messages, not AI responses

  -- Check if tier has unlimited chats (-1)
  IF v_subscription.max_ai_chats_monthly = -1 THEN
    RETURN QUERY SELECT
      true::boolean AS allowed,
      v_chat_count::integer AS chats_used,
      -1::integer AS chat_limit,
      999999::integer AS remaining,
      'Unlimited AI chats included in your plan!'::text AS message,
      false::boolean AS is_grandfathered;
    RETURN;
  END IF;

  -- Check if under limit
  IF v_chat_count < v_subscription.max_ai_chats_monthly THEN
    RETURN QUERY SELECT
      true::boolean AS allowed,
      v_chat_count::integer AS chats_used,
      v_subscription.max_ai_chats_monthly::integer AS chat_limit,
      (v_subscription.max_ai_chats_monthly - v_chat_count)::integer AS remaining,
      ''::text AS message,
      false::boolean AS is_grandfathered;
  ELSE
    -- Limit exceeded - show upgrade message
    RETURN QUERY SELECT
      false::boolean AS allowed,
      v_chat_count::integer AS chats_used,
      v_subscription.max_ai_chats_monthly::integer AS chat_limit,
      0::integer AS remaining,
      format('You''ve used all %s AI chats this month. Upgrade to get more! ✨',
        v_subscription.max_ai_chats_monthly)::text AS message,
      false::boolean AS is_grandfathered;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_chat_quota(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_chat_quota(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_chat_quota(UUID, TEXT) TO anon;  -- Allow anonymous for visitor mode

-- Add helpful comment
COMMENT ON FUNCTION check_chat_quota IS 'Checks if user can send more AI chats this month. Gracefully handles stale sessions. Beta users (grandfathered) get unlimited.';
