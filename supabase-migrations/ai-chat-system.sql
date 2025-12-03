-- ================================================================
-- AI Chat System - Intelligent Onboarding
-- ================================================================

-- 1. Chat conversations
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  context_type TEXT DEFAULT 'onboarding' CHECK (context_type IN ('onboarding', 'help', 'storefront')),
  user_type TEXT CHECK (user_type IN ('retail', 'ecommerce', 'wholesale', 'multilocation', 'service', 'unknown')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- 2. Individual chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. User onboarding preferences
CREATE TABLE IF NOT EXISTS user_onboarding_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT,
  primary_goal TEXT,
  business_name TEXT,
  products_sell TEXT[], -- Array of product types they mentioned
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  features_shown TEXT[] DEFAULT '{}', -- Features we've introduced
  current_step TEXT DEFAULT 'welcome', -- welcome, add_product, first_sale, explore
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Chat usage tracking (for pricing tiers with quota splits)
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,

  -- Onboarding quota
  onboarding_used INTEGER DEFAULT 0,
  onboarding_limit INTEGER NOT NULL DEFAULT 20,

  -- Daily tips/help quota
  help_used INTEGER DEFAULT 0,
  help_limit INTEGER NOT NULL DEFAULT 10,

  -- Storefront quota (customers asking about products)
  storefront_used INTEGER DEFAULT 0,
  storefront_limit INTEGER NOT NULL DEFAULT 0, -- Free tier gets 0 storefront

  last_chat_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- 5. Rate limiting (prevent abuse)
CREATE TABLE IF NOT EXISTS ai_chat_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  hour_bucket TIMESTAMP NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(identifier, hour_bucket)
);

-- 6. Function to check and increment chat usage (with context type support)
CREATE OR REPLACE FUNCTION check_chat_quota(p_user_id UUID, p_context_type TEXT DEFAULT 'help')
RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_current_month DATE;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  v_current_month := DATE_TRUNC('month', CURRENT_DATE);

  -- Get or create usage record
  SELECT * INTO v_usage
  FROM ai_chat_usage
  WHERE user_id = p_user_id AND month = v_current_month;

  IF NOT FOUND THEN
    -- Create new usage record (free tier defaults)
    INSERT INTO ai_chat_usage (
      user_id, month,
      onboarding_used, onboarding_limit,
      help_used, help_limit,
      storefront_used, storefront_limit
    )
    VALUES (
      p_user_id, v_current_month,
      0, 20,   -- Free: 20 onboarding
      0, 10,   -- Free: 10 daily tips
      0, 0     -- Free: 0 storefront (paid feature only)
    )
    RETURNING * INTO v_usage;
  END IF;

  -- Get the appropriate used/limit based on context type
  IF p_context_type = 'onboarding' THEN
    v_used := v_usage.onboarding_used;
    v_limit := v_usage.onboarding_limit;
  ELSIF p_context_type = 'storefront' THEN
    v_used := v_usage.storefront_used;
    v_limit := v_usage.storefront_limit;
  ELSE -- 'help' or default
    v_used := v_usage.help_used;
    v_limit := v_usage.help_limit;
  END IF;

  -- Check if quota exceeded
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'context_type', p_context_type,
      'chats_used', v_used,
      'chat_limit', v_limit,
      'remaining', 0,
      'message', CASE
        WHEN p_context_type = 'storefront' AND v_limit = 0 THEN 'Storefront AI is only available on paid plans. Upgrade to unlock!'
        ELSE 'You have reached your ' || p_context_type || ' chat limit. Upgrade to get more!'
      END
    );
  END IF;

  -- Increment usage for the specific context type
  IF p_context_type = 'onboarding' THEN
    UPDATE ai_chat_usage
    SET onboarding_used = onboarding_used + 1, last_chat_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND month = v_current_month;
    v_used := v_used + 1;
  ELSIF p_context_type = 'storefront' THEN
    UPDATE ai_chat_usage
    SET storefront_used = storefront_used + 1, last_chat_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND month = v_current_month;
    v_used := v_used + 1;
  ELSE -- 'help'
    UPDATE ai_chat_usage
    SET help_used = help_used + 1, last_chat_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND month = v_current_month;
    v_used := v_used + 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'context_type', p_context_type,
    'chats_used', v_used,
    'chat_limit', v_limit,
    'remaining', v_limit - v_used
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_identifier TEXT, p_max_per_hour INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
DECLARE
  v_hour_bucket TIMESTAMP;
  v_count INTEGER;
BEGIN
  v_hour_bucket := DATE_TRUNC('hour', NOW());

  -- Get current count
  SELECT message_count INTO v_count
  FROM ai_chat_rate_limits
  WHERE identifier = p_identifier AND hour_bucket = v_hour_bucket;

  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO ai_chat_rate_limits (identifier, hour_bucket, message_count)
    VALUES (p_identifier, v_hour_bucket, 1);
    RETURN TRUE;
  END IF;

  -- Check if exceeded
  IF v_count >= p_max_per_hour THEN
    RETURN FALSE;
  END IF;

  -- Increment count
  UPDATE ai_chat_rate_limits
  SET message_count = message_count + 1
  WHERE identifier = p_identifier AND hour_bucket = v_hour_bucket;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to get user context (for AI)
CREATE OR REPLACE FUNCTION get_user_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_product_count INTEGER;
  v_sales_count INTEGER;
  v_customer_count INTEGER;
  v_has_store BOOLEAN;
  v_preferences RECORD;
BEGIN
  -- Count products
  SELECT COUNT(*) INTO v_product_count
  FROM products
  WHERE user_id = p_user_id;

  -- Count sales (assuming sales table exists)
  SELECT COUNT(*) INTO v_sales_count
  FROM sales
  WHERE user_id = p_user_id;

  -- Count customers
  SELECT COUNT(*) INTO v_customer_count
  FROM customers
  WHERE user_id = p_user_id;

  -- Check if store is set up (assuming store_settings table)
  SELECT EXISTS(
    SELECT 1 FROM store_settings WHERE user_id = p_user_id AND slug IS NOT NULL
  ) INTO v_has_store;

  -- Get preferences
  SELECT * INTO v_preferences
  FROM user_onboarding_preferences
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'product_count', v_product_count,
    'sales_count', v_sales_count,
    'customer_count', v_customer_count,
    'has_store', v_has_store,
    'business_type', COALESCE(v_preferences.business_type, 'unknown'),
    'current_step', COALESCE(v_preferences.current_step, 'welcome'),
    'features_shown', COALESCE(v_preferences.features_shown, '{}')
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_id ON ai_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_session ON ai_chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_id ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_preferences_user_id ON user_onboarding_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_month ON ai_chat_usage(user_id, month);
CREATE INDEX IF NOT EXISTS idx_ai_chat_rate_limits_identifier_hour ON ai_chat_rate_limits(identifier, hour_bucket);

-- 10. Row Level Security (RLS)
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_chat_conversations;
CREATE POLICY "Users can view own conversations" ON ai_chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON ai_chat_conversations;
CREATE POLICY "Users can insert own conversations" ON ai_chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view own messages" ON ai_chat_messages;
CREATE POLICY "Users can view own messages" ON ai_chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM ai_chat_conversations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages" ON ai_chat_messages;
CREATE POLICY "Users can insert messages" ON ai_chat_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_chat_conversations WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_onboarding_preferences;
CREATE POLICY "Users can manage own preferences" ON user_onboarding_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for usage
DROP POLICY IF EXISTS "Users can view own usage" ON ai_chat_usage;
CREATE POLICY "Users can view own usage" ON ai_chat_usage
  FOR SELECT USING (auth.uid() = user_id);

-- 11. Clean up old rate limit records (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_chat_rate_limits
  WHERE hour_bucket < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- DONE! ✅
-- ================================================================

-- Verify tables
SELECT 'ai_chat_conversations' as table_name, COUNT(*) as row_count FROM ai_chat_conversations
UNION ALL
SELECT 'ai_chat_messages', COUNT(*) FROM ai_chat_messages
UNION ALL
SELECT 'user_onboarding_preferences', COUNT(*) FROM user_onboarding_preferences
UNION ALL
SELECT 'ai_chat_usage', COUNT(*) FROM ai_chat_usage
UNION ALL
SELECT 'ai_chat_rate_limits', COUNT(*) FROM ai_chat_rate_limits;
