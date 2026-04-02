-- ================================================
-- FIX CRITICAL BUGS: REALTIME & ON CONFLICT
-- Date: March 26, 2024
-- ================================================

-- ================================================
-- BUG 1 FIX: ENABLE REALTIME FOR CHAT TABLES
-- ================================================

-- Step 1: Enable Realtime on the tables
-- This allows WebSocket subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;

-- Step 2: Set REPLICA IDENTITY to FULL for better change tracking
-- This ensures all column changes are broadcast
ALTER TABLE ai_chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE ai_chat_messages REPLICA IDENTITY FULL;

-- Step 3: Verify Realtime is enabled
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

-- The upsert in chatTrackingService.ts uses onConflict: 'session_id'
-- but there's no unique constraint on session_id column

-- Step 1: Check for duplicate session_ids first
DO $$
DECLARE
  v_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT session_id, COUNT(*) as cnt
    FROM ai_chat_conversations
    GROUP BY session_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_duplicates > 0 THEN
    RAISE NOTICE '⚠️ WARNING: Found % duplicate session_ids. These need to be cleaned up first!', v_duplicates;

    -- Show the duplicates
    FOR r IN (
      SELECT session_id, COUNT(*) as cnt
      FROM ai_chat_conversations
      GROUP BY session_id
      HAVING COUNT(*) > 1
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Duplicate session_id: % (% occurrences)', r.session_id, r.cnt;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No duplicate session_ids found. Safe to add constraint.';
  END IF;
END $$;

-- Step 2: Clean up duplicates (keep the most recent one)
-- UNCOMMENT AND RUN ONLY IF DUPLICATES EXIST
/*
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
*/

-- Step 3: Add the unique constraint that the upsert expects
-- This will fix the ON CONFLICT error
ALTER TABLE ai_chat_conversations
ADD CONSTRAINT ai_chat_conversations_session_id_key UNIQUE (session_id);

-- Step 4: Verify the constraint was added
SELECT
  conname as constraint_name,
  contype as constraint_type,
  'Created Successfully' as status
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
-- TEST QUERIES
-- ================================================

-- Test 1: Verify realtime is working
SELECT
  '✅ Realtime Test' as test,
  COUNT(*) as tables_enabled
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('ai_chat_conversations', 'ai_chat_messages');

-- Test 2: Verify unique constraint exists
SELECT
  '✅ Constraint Test' as test,
  COUNT(*) as constraints_found
FROM pg_constraint
WHERE conrelid = 'ai_chat_conversations'::regclass
AND contype = 'u'  -- unique constraint
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
-- SUMMARY
-- ================================================
SELECT
  '🎯 BUG FIXES COMPLETE' as status,
  'Both critical bugs have been addressed' as message,
  'Deploy and test the application' as next_step;

-- ================================================
-- ROLLBACK COMMANDS (IF NEEDED)
-- ================================================
/*
-- To rollback Bug 1 fix:
ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_messages;

-- To rollback Bug 2 fix:
ALTER TABLE ai_chat_conversations DROP CONSTRAINT ai_chat_conversations_session_id_key;
*/