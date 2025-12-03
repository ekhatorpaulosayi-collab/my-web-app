-- ================================================================
-- WhatsApp AI Integration - Database Setup
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Subscription tiers table (track AI usage limits)
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'business')),
  monthly_chat_limit INTEGER NOT NULL,
  chats_used_this_month INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. WhatsApp chat logs (conversation history)
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_message TEXT NOT NULL,
  bot_response TEXT,
  products_mentioned UUID[], -- Array of product IDs
  response_time_ms INTEGER, -- How long AI took to respond
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. WhatsApp settings per user
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_whatsapp_number TEXT, -- Format: whatsapp:+14155238886
  business_phone TEXT, -- Their actual WhatsApp Business number
  greeting_message TEXT DEFAULT 'Hello! 👋 I''m your 24/7 AI assistant. Ask me about product prices and availability!',
  out_of_stock_message TEXT DEFAULT 'Sorry, this item is currently out of stock. 😔 Would you like to be notified when it''s back?',
  business_hours_message TEXT DEFAULT 'We''re currently closed. But I can still help you with product information! 🌙',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Function to automatically reset monthly quota
CREATE OR REPLACE FUNCTION reset_monthly_chat_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if it's been more than 30 days since last reset
  IF NEW.last_reset_date < CURRENT_DATE - INTERVAL '30 days' THEN
    NEW.chats_used_this_month := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to reset quota on update
DROP TRIGGER IF EXISTS reset_quota_trigger ON subscription_tiers;
CREATE TRIGGER reset_quota_trigger
  BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION reset_monthly_chat_quota();

-- 6. Function to increment chat usage
CREATE OR REPLACE FUNCTION increment_chat_usage(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier RECORD;
BEGIN
  -- Get current tier info
  SELECT * INTO v_tier
  FROM subscription_tiers
  WHERE user_id = p_user_id;

  -- If no tier exists, create free tier
  IF NOT FOUND THEN
    INSERT INTO subscription_tiers (user_id, tier, monthly_chat_limit, chats_used_this_month)
    VALUES (p_user_id, 'free', 10, 1);
    RETURN TRUE;
  END IF;

  -- Check if quota exceeded
  IF v_tier.chats_used_this_month >= v_tier.monthly_chat_limit THEN
    RETURN FALSE; -- Quota exceeded
  END IF;

  -- Increment usage
  UPDATE subscription_tiers
  SET chats_used_this_month = chats_used_this_month + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. Row Level Security (RLS)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_tiers
DROP POLICY IF EXISTS "Users can view own subscription" ON subscription_tiers;
CREATE POLICY "Users can view own subscription"
  ON subscription_tiers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON subscription_tiers;
CREATE POLICY "Users can update own subscription"
  ON subscription_tiers FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscription" ON subscription_tiers;
CREATE POLICY "Users can insert own subscription"
  ON subscription_tiers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for whatsapp_chats
DROP POLICY IF EXISTS "Users can view own chats" ON whatsapp_chats;
CREATE POLICY "Users can view own chats"
  ON whatsapp_chats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert chats" ON whatsapp_chats;
CREATE POLICY "Service role can insert chats"
  ON whatsapp_chats FOR INSERT
  WITH CHECK (true); -- Webhook uses service role

-- RLS Policies for whatsapp_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON whatsapp_settings;
CREATE POLICY "Users can manage own settings"
  ON whatsapp_settings FOR ALL
  USING (auth.uid() = user_id);

-- 8. Create default free tier for existing users
INSERT INTO subscription_tiers (user_id, tier, monthly_chat_limit)
SELECT id, 'free', 10
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscription_tiers);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_user_id ON subscription_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_created_at ON whatsapp_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_user_id ON whatsapp_settings(user_id);

-- ================================================================
-- DONE! ✅
-- ================================================================

-- Verify tables were created
SELECT
  'subscription_tiers' as table_name,
  COUNT(*) as row_count
FROM subscription_tiers
UNION ALL
SELECT
  'whatsapp_chats',
  COUNT(*)
FROM whatsapp_chats
UNION ALL
SELECT
  'whatsapp_settings',
  COUNT(*)
FROM whatsapp_settings;
