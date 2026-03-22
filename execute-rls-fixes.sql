-- Combined RLS fixes execution
BEGIN;

-- Drop existing message policies
DROP POLICY IF EXISTS "Allow message reads" ON ai_chat_messages;
DROP POLICY IF EXISTS "Allow message inserts" ON ai_chat_messages;
DROP POLICY IF EXISTS "Allow all message inserts" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners can insert agent messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Allow message updates" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners can read all messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners can insert messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners can update messages" ON ai_chat_messages;

-- Create comprehensive message policy for store owners
CREATE POLICY "Store owners can read all messages"
  ON ai_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM ai_chat_conversations c
      INNER JOIN stores s ON s.id = c.store_id
      WHERE c.id = ai_chat_messages.conversation_id
        AND s.user_id::text = auth.uid()::text
    )
  );

-- Allow message inserts from store owners (for agent messages)
CREATE POLICY "Store owners can insert messages"
  ON ai_chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM ai_chat_conversations c
      INNER JOIN stores s ON s.id = c.store_id
      WHERE c.id = ai_chat_messages.conversation_id
        AND s.user_id::text = auth.uid()::text
    )
  );

-- Allow updates for message metadata
CREATE POLICY "Store owners can update messages"
  ON ai_chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM ai_chat_conversations c
      INNER JOIN stores s ON s.id = c.store_id
      WHERE c.id = ai_chat_messages.conversation_id
        AND s.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM ai_chat_conversations c
      INNER JOIN stores s ON s.id = c.store_id
      WHERE c.id = ai_chat_messages.conversation_id
        AND s.user_id::text = auth.uid()::text
    )
  );

-- Ensure conversations are visible
DROP POLICY IF EXISTS "Store owners can view their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Allow conversation updates" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners can update their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners full access to conversations" ON ai_chat_conversations;

CREATE POLICY "Store owners full access to conversations"
  ON ai_chat_conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = ai_chat_conversations.store_id
        AND stores.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = ai_chat_conversations.store_id
        AND stores.user_id::text = auth.uid()::text
    )
  );

COMMIT;

-- Success message
SELECT 'RLS policies configured successfully!' AS status;