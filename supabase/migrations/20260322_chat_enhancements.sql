-- Migration for Chat Enhancements: Takeover, WhatsApp, Visitor ID, Analytics
-- Run this in Supabase SQL Editor

-- 1. Add columns for chat takeover feature
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS is_agent_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS agent_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agent_left_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS takeover_reason TEXT;

-- 2. Add columns for visitor identification
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS visitor_identified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visitor_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS visitor_telegram TEXT,
ADD COLUMN IF NOT EXISTS visitor_ip TEXT,
ADD COLUMN IF NOT EXISTS visitor_country TEXT,
ADD COLUMN IF NOT EXISTS visitor_device TEXT,
ADD COLUMN IF NOT EXISTS visitor_browser TEXT;

-- 3. Create table for WhatsApp customer mapping
CREATE TABLE IF NOT EXISTS whatsapp_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_id UUID REFERENCES customers(id),
  conversation_ids UUID[] DEFAULT '{}',
  first_contact TIMESTAMPTZ DEFAULT now(),
  last_contact TIMESTAMPTZ DEFAULT now(),
  total_messages INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, phone_number)
);

-- 4. Create table for conversation analytics
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Message metrics
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_messages_per_conversation DECIMAL(10,2) DEFAULT 0,

  -- Response metrics
  avg_response_time_seconds INTEGER DEFAULT 0,
  total_ai_responses INTEGER DEFAULT 0,
  total_human_responses INTEGER DEFAULT 0,

  -- Visitor metrics
  unique_visitors INTEGER DEFAULT 0,
  identified_visitors INTEGER DEFAULT 0,
  anonymous_visitors INTEGER DEFAULT 0,

  -- Channel metrics
  storefront_conversations INTEGER DEFAULT 0,
  dashboard_conversations INTEGER DEFAULT 0,
  whatsapp_conversations INTEGER DEFAULT 0,

  -- Takeover metrics
  takeover_count INTEGER DEFAULT 0,
  avg_takeover_duration_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, date)
);

-- 5. Create table for common questions/topics
CREATE TABLE IF NOT EXISTS conversation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  category TEXT,
  frequency INTEGER DEFAULT 1,
  sample_questions TEXT[],
  last_asked TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, topic)
);

-- 6. Create table for agent takeover sessions
CREATE TABLE IF NOT EXISTS agent_takeover_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  reason TEXT,
  notes TEXT,
  messages_sent INTEGER DEFAULT 0,
  customer_satisfied BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Add message metadata for agent messages
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}';

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_agent_active ON ai_chat_conversations(is_agent_active) WHERE is_agent_active = true;
CREATE INDEX IF NOT EXISTS idx_conversations_visitor_identified ON ai_chat_conversations(visitor_identified);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_analytics_store_date ON conversation_analytics(store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_topics_store_frequency ON conversation_topics(store_id, frequency DESC);
CREATE INDEX IF NOT EXISTS idx_takeover_conversation ON agent_takeover_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent ON ai_chat_messages(agent_id) WHERE agent_id IS NOT NULL;

-- 9. Create function to track analytics
CREATE OR REPLACE FUNCTION update_conversation_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when a conversation is updated
  INSERT INTO conversation_analytics (
    store_id,
    date,
    total_conversations,
    storefront_conversations,
    dashboard_conversations
  )
  VALUES (
    NEW.store_id,
    CURRENT_DATE,
    1,
    CASE WHEN NEW.context_type = 'storefront' THEN 1 ELSE 0 END,
    CASE WHEN NEW.context_type = 'help' THEN 1 ELSE 0 END
  )
  ON CONFLICT (store_id, date) DO UPDATE SET
    total_conversations = conversation_analytics.total_conversations + 1,
    storefront_conversations = conversation_analytics.storefront_conversations +
      CASE WHEN NEW.context_type = 'storefront' THEN 1 ELSE 0 END,
    dashboard_conversations = conversation_analytics.dashboard_conversations +
      CASE WHEN NEW.context_type = 'help' THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for analytics
DROP TRIGGER IF EXISTS conversation_analytics_trigger ON ai_chat_conversations;
CREATE TRIGGER conversation_analytics_trigger
  AFTER INSERT ON ai_chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_analytics();

-- 11. RLS policies for new tables
ALTER TABLE whatsapp_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_takeover_sessions ENABLE ROW LEVEL SECURITY;

-- WhatsApp customers policies
CREATE POLICY "Store owners can manage WhatsApp customers"
  ON whatsapp_customers
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Analytics policies
CREATE POLICY "Store owners can view analytics"
  ON conversation_analytics
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Topics policies
CREATE POLICY "Store owners can view topics"
  ON conversation_topics
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Takeover sessions policies
CREATE POLICY "Agents can manage takeover sessions"
  ON agent_takeover_sessions
  FOR ALL
  USING (
    agent_id = auth.uid()
    OR
    conversation_id IN (
      SELECT id FROM ai_chat_conversations
      WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
      )
    )
  );

-- 12. Create function for agent takeover
CREATE OR REPLACE FUNCTION initiate_agent_takeover(
  p_conversation_id UUID,
  p_agent_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Update conversation
  UPDATE ai_chat_conversations
  SET
    is_agent_active = true,
    agent_id = p_agent_id,
    agent_joined_at = now(),
    takeover_reason = p_reason
  WHERE id = p_conversation_id;

  -- Create takeover session
  INSERT INTO agent_takeover_sessions (
    conversation_id,
    agent_id,
    reason
  )
  VALUES (
    p_conversation_id,
    p_agent_id,
    p_reason
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to end agent takeover
CREATE OR REPLACE FUNCTION end_agent_takeover(
  p_conversation_id UUID,
  p_session_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update conversation
  UPDATE ai_chat_conversations
  SET
    is_agent_active = false,
    agent_left_at = now()
  WHERE id = p_conversation_id;

  -- Update takeover session
  UPDATE agent_takeover_sessions
  SET ended_at = now()
  WHERE id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Chat enhancement migration completed successfully!';
  RAISE NOTICE '   - Chat takeover columns added';
  RAISE NOTICE '   - Visitor identification columns added';
  RAISE NOTICE '   - WhatsApp customers table created';
  RAISE NOTICE '   - Analytics tables created';
  RAISE NOTICE '   - Takeover functions created';
  RAISE NOTICE '   - RLS policies configured';
END $$;