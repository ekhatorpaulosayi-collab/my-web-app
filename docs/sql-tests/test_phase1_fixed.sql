-- TEST PHASE 1: VERIFY DATABASE SETUP IS WORKING (FIXED)
-- Run this in Supabase SQL Editor to test the chat system
-- ================================================

-- CLEANUP OLD TEST DATA (if any)
DELETE FROM ai_chat_messages WHERE content LIKE 'TEST PHASE 1:%';
DELETE FROM ai_chat_conversations WHERE visitor_name = 'TEST CUSTOMER PHASE 1';

-- ================================================
-- TEST 1: CREATE A TEST CONVERSATION
-- ================================================
DO $$
DECLARE
  v_store_id UUID;
  v_conv_id UUID;
  v_customer_msg_id UUID;
  v_agent_msg_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Get a store ID and the actual auth user ID
  SELECT s.id, u.id INTO v_store_id, v_auth_user_id
  FROM stores s
  LEFT JOIN auth.users u ON u.id::text = s.user_id::text
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE NOTICE '❌ No stores found - please create a store first';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Using store ID: %', v_store_id;
  RAISE NOTICE '✅ Auth user ID: %', v_auth_user_id;

  -- Create a test conversation
  INSERT INTO ai_chat_conversations (
    session_id,
    store_id,
    visitor_name,
    created_at
  ) VALUES (
    'test-session-' || gen_random_uuid()::text,
    v_store_id,
    'TEST CUSTOMER PHASE 1',
    NOW()
  ) RETURNING id INTO v_conv_id;

  RAISE NOTICE '✅ Created conversation ID: %', v_conv_id;

  -- Add a customer message (no agent_id needed for customer)
  INSERT INTO ai_chat_messages (
    conversation_id,
    role,
    content,
    sender_type,
    is_agent_message,
    created_at
  ) VALUES (
    v_conv_id,
    'user',
    'TEST PHASE 1: Customer message - Hello, I need help!',
    'customer',
    false,
    NOW()
  ) RETURNING id INTO v_customer_msg_id;

  RAISE NOTICE '✅ Added customer message ID: %', v_customer_msg_id;

  -- Simulate agent takeover - use auth user ID if available
  IF v_auth_user_id IS NOT NULL THEN
    SELECT send_agent_message(
      v_conv_id,
      'TEST PHASE 1: Agent message - Hello! I am here to help you.',
      v_auth_user_id
    ) INTO v_agent_msg_id;
    RAISE NOTICE '✅ Agent sent message ID: %', v_agent_msg_id;
  ELSE
    -- If no auth user, insert agent message directly without agent_id
    INSERT INTO ai_chat_messages (
      conversation_id,
      role,
      content,
      sender_type,
      is_agent_message,
      created_at
    ) VALUES (
      v_conv_id,
      'assistant',
      'TEST PHASE 1: Agent message - Hello! I am here to help you.',
      'agent',
      true,
      NOW()
    ) RETURNING id INTO v_agent_msg_id;

    -- Update conversation status manually
    UPDATE ai_chat_conversations
    SET is_agent_active = true, updated_at = NOW()
    WHERE id = v_conv_id;

    RAISE NOTICE '✅ Agent message added directly (no auth user): %', v_agent_msg_id;
  END IF;

END $$;

-- ================================================
-- TEST 2: VERIFY MESSAGES ARE VISIBLE
-- ================================================

-- Check as authenticated user (should see all)
SELECT
  '✅ Messages visible to authenticated users' as test,
  COUNT(*) as message_count,
  STRING_AGG(
    role || ': ' || SUBSTRING(content, 1, 50),
    ' | ' ORDER BY created_at
  ) as messages
FROM ai_chat_messages
WHERE content LIKE 'TEST PHASE 1:%';

-- ================================================
-- TEST 3: CHECK ANONYMOUS ACCESS (CRITICAL!)
-- ================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Switch to anonymous role
  SET LOCAL ROLE anon;

  -- Try to count test messages
  SELECT COUNT(*) INTO v_count
  FROM ai_chat_messages
  WHERE content LIKE 'TEST PHASE 1:%';

  IF v_count > 0 THEN
    RAISE NOTICE '✅✅✅ SUCCESS: Anonymous users CAN see % test messages', v_count;
  ELSE
    RAISE NOTICE '❌❌❌ PROBLEM: Anonymous users CANNOT see messages!';
  END IF;

  -- Reset role
  RESET ROLE;
END $$;

-- ================================================
-- TEST 4: CHECK CONVERSATION STATUS
-- ================================================
SELECT
  id,
  visitor_name,
  is_agent_active,
  agent_id,
  chat_status,
  CASE
    WHEN is_agent_active = true THEN '✅ Agent is active'
    ELSE '❌ Agent not active'
  END as status_check
FROM ai_chat_conversations
WHERE visitor_name = 'TEST CUSTOMER PHASE 1';

-- ================================================
-- TEST 5: VERIFY ALL COLUMNS EXIST
-- ================================================
SELECT
  'Database Structure Check' as test_type,
  CASE
    WHEN COUNT(*) = 8 THEN '✅ All required columns exist'
    ELSE '❌ Missing columns: ' || (8 - COUNT(*))::text
  END as result
FROM (
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'stores'
  AND column_name IN ('whatsapp_number', 'wa_fallback_minutes')
  UNION ALL
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'ai_chat_conversations'
  AND column_name IN ('chat_status', 'is_agent_active', 'agent_id')
  UNION ALL
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'ai_chat_messages'
  AND column_name IN ('is_agent_message', 'agent_id', 'sender_type')
) as cols;

-- ================================================
-- TEST 6: VERIFY RPC FUNCTION
-- ================================================
SELECT
  'RPC Function Check' as test_type,
  CASE
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'send_agent_message')
    THEN '✅ send_agent_message function exists'
    ELSE '❌ send_agent_message function NOT FOUND'
  END as result;

-- ================================================
-- TEST 7: CHECK RLS POLICIES
-- ================================================
SELECT
  'RLS Policy Check' as test_type,
  policyname,
  cmd,
  CASE
    WHEN qual = 'true' THEN '✅ Permissive (allows all)'
    ELSE '⚠️ Restrictive: ' || COALESCE(qual, 'unknown')
  END as policy_status
FROM pg_policies
WHERE tablename IN ('ai_chat_messages', 'ai_chat_conversations')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- ================================================
-- FINAL SUMMARY
-- ================================================
SELECT
  '🎯 PHASE 1 TEST COMPLETE' as status,
  'Check the messages above for any ❌ marks' as action,
  'If all show ✅, Phase 1 is working correctly!' as next_step;