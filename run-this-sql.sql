-- CUSTOMER CHAT VISIBILITY SQL
-- Run this entire script in Supabase SQL Editor
-- It will enable you to see all customer conversations

-- Step 1: Add tracking fields to conversations table
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id),
ADD COLUMN IF NOT EXISTS visitor_name TEXT,
ADD COLUMN IF NOT EXISTS visitor_email TEXT,
ADD COLUMN IF NOT EXISTS visitor_phone TEXT,
ADD COLUMN IF NOT EXISTS source_page TEXT,
ADD COLUMN IF NOT EXISTS is_storefront BOOLEAN DEFAULT FALSE;

-- Step 2: Add tracking to messages
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_store_id
ON ai_chat_conversations(store_id)
WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_store_id
ON ai_chat_messages(store_id)
WHERE store_id IS NOT NULL;

-- Step 4: Create the view that shows conversations
DROP VIEW IF EXISTS store_conversations CASCADE;
CREATE VIEW store_conversations AS
SELECT
  c.id,
  c.store_id,
  c.session_id,
  c.visitor_name,
  c.visitor_email,
  c.visitor_phone,
  c.created_at,
  c.updated_at,
  c.context_type,
  c.source_page,
  s.business_name,
  s.store_slug,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at,
  CASE
    WHEN MAX(m.created_at) > NOW() - INTERVAL '5 minutes' THEN 'active'
    WHEN MAX(m.created_at) > NOW() - INTERVAL '1 hour' THEN 'recent'
    ELSE 'inactive'
  END as status
FROM ai_chat_conversations c
JOIN stores s ON c.store_id = s.id
LEFT JOIN ai_chat_messages m ON c.id = m.conversation_id
WHERE c.is_storefront = TRUE
GROUP BY c.id, s.business_name, s.store_slug;

-- Step 5: Create notifications table
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  conversation_id UUID REFERENCES ai_chat_conversations(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Set permissions
GRANT SELECT ON store_conversations TO authenticated;
GRANT ALL ON chat_notifications TO authenticated;

-- Step 7: Enable security
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- Step 8: Create security policies
DROP POLICY IF EXISTS "Store owners can view their conversations" ON ai_chat_conversations;
CREATE POLICY "Store owners can view their conversations"
ON ai_chat_conversations FOR SELECT
USING (
  store_id IN (
    SELECT id FROM stores
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners can view their messages" ON ai_chat_messages;
CREATE POLICY "Store owners can view their messages"
ON ai_chat_messages FOR SELECT
USING (
  store_id IN (
    SELECT id FROM stores
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their notifications" ON chat_notifications;
CREATE POLICY "Users can view their notifications"
ON chat_notifications FOR ALL
USING (user_id = auth.uid());

-- Done! You should now be able to see customer conversations
-- Test by sending a chat message from your storefront