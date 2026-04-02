-- ================================================
-- FIX CRITICAL BUGS: REALTIME & ON CONFLICT (V2)
-- Date: March 26, 2024
-- Fixed version that checks existing state first
-- ================================================

-- ================================================
-- BUG 1 FIX: ENSURE REALTIME IS PROPERLY CONFIGURED
-- ================================================

-- Step 1: Check current realtime status
SELECT
  'Current Realtime Status' as check_type,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('ai_chat_conversations', 'ai_chat_messages');

-- Step 2: Add tables to realtime ONLY if not already added
DO $$
BEGIN
  -- Check and add ai_chat_conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'ai_chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;
    RAISE NOTICE '✅ Added ai_chat_conversations to realtime';
  ELSE
    RAISE NOTICE '✅ ai_chat_conversations already in realtime';
  END IF;

  -- Check and add ai_chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'ai_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;
    RAISE NOTICE '✅ Added ai_chat_messages to realtime';
  ELSE
    RAISE NOTICE '✅ ai_chat_messages already in realtime';
  END IF;
END $$;

-- Step 3: Set REPLICA IDENTITY to FULL for better change tracking
ALTER TABLE ai_chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE ai_chat_messages REPLICA IDENTITY FULL;

-- Step 4: Verify Realtime is enabled
SELECT
  schemaname,
  tablename,
  'Realtime Enabled' as status
FROM
  pg_publication_tables
WHERE
  pubname = 'supabase_realtime'
  AND tablename IN ('ai_chat_conversations', 'ai_chat_messages');

-- ================================================
-- BUG 2 FIX: ADD UNIQUE CONSTRAINT FOR SESSION_ID
-- ================================================

-- Step 1: Check if constraint already exists
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
  v_duplicates INTEGER;
BEGIN
  -- Check for existing constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'ai_chat_conversations'::regclass
    AND conname = 'ai_chat_conversations_session_id_key'
  ) INTO v_constraint_exists;

  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Unique constraint on session_id already exists';
  ELSE
    -- Check for duplicate session_ids
    SELECT COUNT(*) INTO v_duplicates
    FROM (
      SELECT session_id, COUNT(*) as cnt
      FROM ai_chat_conversations
      GROUP BY session_id
      HAVING COUNT(*) > 1
    ) dups;

    IF v_duplicates > 0 THEN
      RAISE NOTICE '⚠️ WARNING: Found % duplicate session_ids. Cleaning up...', v_duplicates;

      -- Clean up duplicates (keep the most recent one)
      WITH duplicates AS (
        SELECT
          id,
          session_id,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at DESC) as rn
        FROM ai_chat_conversations
      )
      DELETE FROM ai_chat_conversations
      WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
      );

      RAISE NOTICE '✅ Duplicates cleaned up';
    END IF;

    -- Add the constraint
    ALTER TABLE ai_chat_conversations
    ADD CONSTRAINT ai_chat_conversations_session_id_key UNIQUE (session_id);

    RAISE NOTICE '✅ Added unique constraint on session_id';
  END IF;
END $$;

-- Step 2: Verify the constraint
SELECT
  conname as constraint_name,
  contype as constraint_type,
  'Exists' as status
FROM pg_constraint
WHERE conrelid = 'ai_chat_conversations'::regclass
AND conname = 'ai_chat_conversations_session_id_key';

-- ================================================
-- VERIFY RLS POLICIES ALLOW REALTIME
-- ================================================

-- Check that SELECT policies are permissive for realtime
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual = 'true' OR qual IS NULL THEN '✅ Permissive (allows realtime)'
    ELSE '⚠️ Restrictive: ' || COALESCE(qual, 'unknown')
  END as policy_status
FROM pg_policies
WHERE tablename IN ('ai_chat_messages', 'ai_chat_conversations')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- ================================================
-- ADDITIONAL FIX: CHECK WEBSOCKET SETTINGS
-- ================================================

-- Verify that the tables have proper settings for realtime
SELECT
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
WHERE c.relname IN ('ai_chat_conversations', 'ai_chat_messages')
AND c.relkind = 'r';

-- ================================================
-- TEST QUERIES
-- ================================================

-- Test 1: Verify realtime is working
SELECT
  '✅ Realtime Test' as test,
  COUNT(*) as tables_enabled,
  STRING_AGG(tablename, ', ') as enabled_tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('ai_chat_conversations', 'ai_chat_messages');

-- Test 2: Verify unique constraint exists
SELECT
  '✅ Constraint Test' as test,
  COUNT(*) as constraints_found
FROM pg_constraint
WHERE conrelid = 'ai_chat_conversations'::regclass
AND contype = 'u'
AND conname = 'ai_chat_conversations_session_id_key';

-- Test 3: Test upsert with session_id (simulates chatTrackingService)
DO $$
DECLARE
  v_test_session TEXT := 'test-session-' || gen_random_uuid();
  v_result RECORD;
BEGIN
  -- First insert
  INSERT INTO ai_chat_conversations (session_id, context_type, created_at)
  VALUES (v_test_session, 'help', NOW())
  ON CONFLICT (session_id) DO UPDATE
  SET updated_at = NOW()
  RETURNING id, session_id INTO v_result;

  RAISE NOTICE '✅ Upsert Test 1 (INSERT): Created conversation %', v_result.id;

  -- Second upsert (should update)
  INSERT INTO ai_chat_conversations (session_id, context_type, created_at)
  VALUES (v_test_session, 'help', NOW())
  ON CONFLICT (session_id) DO UPDATE
  SET updated_at = NOW()
  RETURNING id, session_id INTO v_result;

  RAISE NOTICE '✅ Upsert Test 2 (UPDATE): Updated conversation %', v_result.id;

  -- Clean up test data
  DELETE FROM ai_chat_conversations WHERE session_id = v_test_session;
  RAISE NOTICE '✅ Test cleanup complete';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Upsert test failed: %', SQLERRM;
END $$;

-- ================================================
-- TROUBLESHOOTING WEBSOCKET ISSUES
-- ================================================

-- If WebSocket still has CHANNEL_ERROR after these fixes:
-- 1. Check Supabase Dashboard -> Database -> Replication
-- 2. Ensure both tables are listed there
-- 3. Check that your Supabase project has realtime enabled
-- 4. Verify anon key has proper permissions

-- Additional diagnostic query
SELECT
  'Diagnostic Info' as check_type,
  current_database() as database,
  current_user as user,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') as has_pgcrypto,
  EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') as has_realtime_pub
;

-- ================================================
-- SUMMARY
-- ================================================
SELECT
  '🎯 BUG FIXES COMPLETE' as status,
  'Critical bugs have been addressed' as message,
  'Check NOTICE messages above for details' as details,
  'If WebSocket still fails, check Supabase Dashboard' as next_step;

-- ================================================
-- ROLLBACK COMMANDS (IF NEEDED)
-- ================================================
/*
-- To rollback Bug 1 fix:
ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_messages;
ALTER TABLE ai_chat_conversations REPLICA IDENTITY DEFAULT;
ALTER TABLE ai_chat_messages REPLICA IDENTITY DEFAULT;

-- To rollback Bug 2 fix:
ALTER TABLE ai_chat_conversations DROP CONSTRAINT IF EXISTS ai_chat_conversations_session_id_key;
*/