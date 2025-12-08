-- Create AI chat quota tracking function

-- Create table to track AI chat usage (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month (e.g., 2025-12-01)
  chats_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_month ON public.ai_chat_usage(user_id, month);

-- Enable RLS
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own chat usage"
  ON public.ai_chat_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat usage"
  ON public.ai_chat_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat usage"
  ON public.ai_chat_usage
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to check and increment chat quota
CREATE OR REPLACE FUNCTION public.check_chat_quota(
  p_user_id UUID,
  p_context_type TEXT DEFAULT 'help'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier_id TEXT;
  v_chat_limit INTEGER;
  v_current_month DATE;
  v_chats_used INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Get first day of current month
  v_current_month := DATE_TRUNC('month', NOW())::DATE;

  -- Get user's subscription tier and chat limit
  SELECT
    tier_id,
    st.max_ai_chats_monthly
  INTO
    v_tier_id,
    v_chat_limit
  FROM public.user_subscriptions us
  JOIN public.subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  LIMIT 1;

  -- If no active subscription, return not allowed
  IF v_tier_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'No active subscription found',
      'chats_used', 0,
      'chat_limit', 0
    );
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

  -- Return quota info
  RETURN json_build_object(
    'allowed', v_allowed,
    'message', CASE
      WHEN v_allowed THEN 'Chat allowed'
      ELSE 'Monthly chat limit reached. Upgrade your plan for more chats!'
    END,
    'chats_used', v_chats_used,
    'chat_limit', v_chat_limit,
    'remaining', GREATEST(0, v_chat_limit - v_chats_used),
    'tier_id', v_tier_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_chat_quota(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_chat_quota(UUID, TEXT) TO anon;
