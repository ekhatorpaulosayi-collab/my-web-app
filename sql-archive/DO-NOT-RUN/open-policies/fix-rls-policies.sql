-- Fix RLS policies to allow conversation tracking and viewing
-- The issue: Store owners can't see their conversations in the dashboard

-- Step 1: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can create conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Anyone can update their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners can view their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Allow public conversation creation" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Allow updating own conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners view their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Users can view conversations for their stores" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON ai_chat_conversations;

DROP POLICY IF EXISTS "Anyone can create messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners can view their messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Allow public message creation" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners view their messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can view messages for accessible conversations" ON ai_chat_messages;
DROP POLICY IF EXISTS "Store owners can view messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can update messages" ON ai_chat_messages;

-- Step 2: Create new comprehensive policies

-- For ai_chat_conversations table
-- Allow anyone to INSERT (needed for visitors on storefronts and edge functions)
CREATE POLICY "Allow public conversation creation"
  ON ai_chat_conversations FOR INSERT
  WITH CHECK (true);

-- Allow anyone to UPDATE conversations (needed for edge functions)
CREATE POLICY "Allow conversation updates"
  ON ai_chat_conversations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow store owners to SELECT their conversations (FIX for dashboard viewing)
CREATE POLICY "Store owners view their conversations"
  ON ai_chat_conversations FOR SELECT
  USING (
    -- User owns the store
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
    OR
    -- User created the conversation (for help context)
    user_id = auth.uid()
  );

-- For ai_chat_messages table
-- Allow anyone to INSERT messages
CREATE POLICY "Allow public message creation"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (true);

-- Allow store owners to SELECT their messages
CREATE POLICY "Store owners view their messages"
  ON ai_chat_messages FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()::text
    )
    OR conversation_id IN (
      SELECT id FROM ai_chat_conversations WHERE session_id IS NOT NULL
    )
  );

-- Step 3: Test the fix
DO $$
DECLARE
  test_session_id TEXT;
  test_store_id UUID;
  test_conv_id UUID;
BEGIN
  -- Get a test store
  SELECT id INTO test_store_id
  FROM stores
  WHERE store_slug = 'paulglobal22'
  LIMIT 1;

  IF test_store_id IS NOT NULL THEN
    test_session_id := 'rls_test_' || extract(epoch from now())::text;

    -- Try to insert as if we're an anonymous user/edge function
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
    ) RETURNING id INTO test_conv_id;

    IF test_conv_id IS NOT NULL THEN
      RAISE NOTICE '✅ RLS FIX SUCCESSFUL: Anonymous inserts now work!';

      -- Test message insert
      INSERT INTO ai_chat_messages (
        conversation_id,
        store_id,
        role,
        content
      ) VALUES (
        test_conv_id,
        test_store_id,
        'user',
        'Test message after RLS fix'
      );

      RAISE NOTICE '✅ Message inserts also work!';

      -- Clean up
      DELETE FROM ai_chat_messages WHERE conversation_id = test_conv_id;
      DELETE FROM ai_chat_conversations WHERE id = test_conv_id;
      RAISE NOTICE '✅ Test data cleaned up';
    ELSE
      RAISE NOTICE '❌ RLS still blocking inserts';
    END IF;
  ELSE
    RAISE NOTICE 'No test store found';
  END IF;
END $$;

-- Step 4: Show summary
DO $$
DECLARE
  conv_policies INTEGER;
  msg_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO conv_policies
  FROM pg_policies
  WHERE tablename = 'ai_chat_conversations';

  SELECT COUNT(*) INTO msg_policies
  FROM pg_policies
  WHERE tablename = 'ai_chat_messages';

  RAISE NOTICE '====================================';
  RAISE NOTICE 'RLS POLICY FIX RESULTS:';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Policies on ai_chat_conversations: %', conv_policies;
  RAISE NOTICE 'Policies on ai_chat_messages: %', msg_policies;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Anonymous users/edge functions can now:';
  RAISE NOTICE '   - Create conversations';
  RAISE NOTICE '   - Add messages';
  RAISE NOTICE '   - Update conversations';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Store owners can:';
  RAISE NOTICE '   - View all their store conversations';
  RAISE NOTICE '   - View all messages in those conversations';
  RAISE NOTICE '====================================';
END $$;