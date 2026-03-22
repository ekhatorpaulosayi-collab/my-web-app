-- Fix for conversation tracking visibility in Customer Chats dashboard
-- This ensures storefront conversations are properly saved and visible

-- Step 1: Ensure ai_chat_conversations table has all needed columns
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id),
ADD COLUMN IF NOT EXISTS is_storefront BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS context_type TEXT,
ADD COLUMN IF NOT EXISTS source_page TEXT,
ADD COLUMN IF NOT EXISTS visitor_name TEXT,
ADD COLUMN IF NOT EXISTS visitor_email TEXT,
ADD COLUMN IF NOT EXISTS visitor_phone TEXT;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_store_id ON ai_chat_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON ai_chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_is_storefront ON ai_chat_conversations(is_storefront);

-- Step 3: Ensure ai_chat_messages table has store_id
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Step 4: Create index for messages
CREATE INDEX IF NOT EXISTS idx_messages_store_id ON ai_chat_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai_chat_messages(conversation_id);

-- Step 5: Drop existing view if it exists
DROP VIEW IF EXISTS store_conversations;

-- Step 6: Create the store_conversations view for the Customer Chats dashboard
CREATE VIEW store_conversations AS
SELECT
  c.id,
  c.session_id,
  c.store_id,
  c.user_id,
  c.context_type,
  c.is_storefront,
  c.source_page,
  c.visitor_name,
  c.visitor_email,
  c.visitor_phone,
  c.created_at,
  c.updated_at,
  s.business_name as store_name,
  s.store_slug,
  -- Get message count
  (SELECT COUNT(*) FROM ai_chat_messages m WHERE m.conversation_id = c.id) as message_count,
  -- Get last message time
  (SELECT MAX(created_at) FROM ai_chat_messages m WHERE m.conversation_id = c.id) as last_message_at,
  -- Get last message preview
  (SELECT content FROM ai_chat_messages m
   WHERE m.conversation_id = c.id
   ORDER BY created_at DESC
   LIMIT 1) as last_message,
  -- Get first user message (for context)
  (SELECT content FROM ai_chat_messages m
   WHERE m.conversation_id = c.id AND m.role = 'user'
   ORDER BY created_at ASC
   LIMIT 1) as first_message
FROM ai_chat_conversations c
INNER JOIN stores s ON c.store_id = s.id
WHERE c.is_storefront = true
  AND c.store_id IS NOT NULL;

-- Step 7: Grant permissions
GRANT SELECT ON store_conversations TO authenticated;

-- Step 8: Create RLS policies for ai_chat_conversations
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Store owners can see their store's conversations
CREATE POLICY "Store owners can view their conversations"
  ON ai_chat_conversations FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()::text
    )
  );

-- Policy: Anyone can insert conversations (for visitors)
CREATE POLICY "Anyone can create conversations"
  ON ai_chat_conversations FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update their own conversations
CREATE POLICY "Anyone can update their conversations"
  ON ai_chat_conversations FOR UPDATE
  USING (session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);

-- Step 9: Create RLS policies for ai_chat_messages
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Store owners can see their store's messages
CREATE POLICY "Store owners can view their messages"
  ON ai_chat_messages FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()::text
    )
    OR
    conversation_id IN (
      SELECT id FROM ai_chat_conversations WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()::text
      )
    )
  );

-- Policy: Anyone can insert messages
CREATE POLICY "Anyone can create messages"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (true);

-- Step 10: Test data to verify the fix works
DO $$
DECLARE
  test_store_id UUID;
  test_conversation_id UUID;
  test_session_id TEXT;
BEGIN
  -- Get a test store
  SELECT id INTO test_store_id
  FROM stores
  LIMIT 1;

  IF test_store_id IS NOT NULL THEN
    test_session_id := 'test_session_' || extract(epoch from now())::text;

    -- Create a test conversation
    INSERT INTO ai_chat_conversations (
      session_id,
      store_id,
      context_type,
      is_storefront,
      source_page
    ) VALUES (
      test_session_id,
      test_store_id,
      'storefront',
      true,
      '/store/test'
    ) RETURNING id INTO test_conversation_id;

    -- Add test messages
    INSERT INTO ai_chat_messages (conversation_id, store_id, role, content)
    VALUES
      (test_conversation_id, test_store_id, 'user', 'Test: How much is shipping?'),
      (test_conversation_id, test_store_id, 'assistant', 'Test: Shipping is ₦1,000 within Lagos');

    RAISE NOTICE 'Test conversation created with session_id: %', test_session_id;

    -- Verify it appears in the view
    IF EXISTS (SELECT 1 FROM store_conversations WHERE session_id = test_session_id) THEN
      RAISE NOTICE '✅ SUCCESS: Test conversation IS visible in store_conversations view!';
    ELSE
      RAISE WARNING '❌ ERROR: Test conversation NOT visible in view';
    END IF;

    -- Clean up test data
    DELETE FROM ai_chat_messages WHERE conversation_id = test_conversation_id;
    DELETE FROM ai_chat_conversations WHERE id = test_conversation_id;
    RAISE NOTICE 'Test data cleaned up';
  ELSE
    RAISE NOTICE 'No stores found for testing';
  END IF;
END $$;

-- Step 11: Show summary
DO $$
DECLARE
  conv_count INTEGER;
  msg_count INTEGER;
  view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conv_count
  FROM ai_chat_conversations
  WHERE is_storefront = true;

  SELECT COUNT(*) INTO msg_count
  FROM ai_chat_messages
  WHERE store_id IS NOT NULL;

  SELECT COUNT(*) INTO view_count
  FROM store_conversations;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'CONVERSATION TRACKING FIX RESULTS:';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Storefront conversations: %', conv_count;
  RAISE NOTICE 'Store messages: %', msg_count;
  RAISE NOTICE 'Visible in view: %', view_count;
  RAISE NOTICE '';

  IF view_count > 0 THEN
    RAISE NOTICE '✅ Customer Chats should now show conversations!';
  ELSE
    RAISE NOTICE '⚠️ No conversations in view yet. New chats will appear.';
  END IF;
  RAISE NOTICE '====================================';
END $$;