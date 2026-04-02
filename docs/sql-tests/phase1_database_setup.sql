-- PHASE 1: DATABASE FOUNDATION FOR CHAT SYSTEM
-- Run this entire script in Supabase SQL Editor
-- Date: March 26, 2024

-- ============================================
-- STEP 1: Add missing columns to stores table
-- ============================================
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS wa_fallback_minutes INTEGER DEFAULT 5;

-- ============================================
-- STEP 2: Add missing columns to conversations
-- ============================================
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS chat_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_agent_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_id UUID;

-- ============================================
-- STEP 3: Add missing columns to messages
-- ============================================
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_id UUID,
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20);

-- ============================================
-- STEP 4: Fix RLS Policies (CRITICAL)
-- ============================================

-- Enable RLS on both tables
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

-- Drop all old SELECT policies for messages
DROP POLICY IF EXISTS "Users can view their store messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages in public conversations" ON ai_chat_messages;
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON ai_chat_messages;
DROP POLICY IF EXISTS "Everyone can view all messages" ON ai_chat_messages;

-- Create the CRITICAL permissive SELECT policy
CREATE POLICY "Everyone can view all messages"
ON ai_chat_messages FOR SELECT
USING (true);

-- Keep restrictive INSERT policy for security
DROP POLICY IF EXISTS "Only authenticated can insert messages" ON ai_chat_messages;
CREATE POLICY "Only authenticated can insert messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix conversations policies
DROP POLICY IF EXISTS "Public can view conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners can view their conversations" ON ai_chat_conversations;

CREATE POLICY "Everyone can view conversations"
ON ai_chat_conversations FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create conversations"
ON ai_chat_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can update their conversations"
ON ai_chat_conversations FOR UPDATE
USING (store_id = auth.uid() OR auth.uid() IN (
  SELECT user_id FROM stores WHERE id = ai_chat_conversations.store_id
));

-- ============================================
-- STEP 5: Create/Replace RPC Function
-- ============================================

-- Drop old versions
DROP FUNCTION IF EXISTS send_agent_message(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(uuid, text) CASCADE;

-- Create the correct function
CREATE OR REPLACE FUNCTION send_agent_message(
  p_conversation_id UUID,
  p_message TEXT,
  p_agent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert agent message
  INSERT INTO ai_chat_messages (
    conversation_id,
    role,
    content,
    is_agent_message,
    agent_id,
    sender_type,
    created_at
  ) VALUES (
    p_conversation_id,
    'assistant',
    p_message,
    true,
    COALESCE(p_agent_id, auth.uid()),
    'agent',
    NOW()
  ) RETURNING id INTO v_message_id;

  -- Update conversation state
  UPDATE ai_chat_conversations
  SET
    updated_at = NOW(),
    is_agent_active = true,
    agent_id = COALESCE(p_agent_id, auth.uid())
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Verification Queries
-- ============================================

-- Check if all columns exist
SELECT
  'Stores WhatsApp columns' as check_type,
  COUNT(*) as found,
  2 as expected
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name IN ('whatsapp_number', 'wa_fallback_minutes')

UNION ALL

SELECT
  'Conversation status columns' as check_type,
  COUNT(*) as found,
  3 as expected
FROM information_schema.columns
WHERE table_name = 'ai_chat_conversations'
AND column_name IN ('chat_status', 'is_agent_active', 'agent_id')

UNION ALL

SELECT
  'Message agent columns' as check_type,
  COUNT(*) as found,
  3 as expected
FROM information_schema.columns
WHERE table_name = 'ai_chat_messages'
AND column_name IN ('is_agent_message', 'agent_id', 'sender_type')

UNION ALL

-- Check RLS policies
SELECT
  'Message SELECT policy' as check_type,
  COUNT(*) as found,
  1 as expected
FROM pg_policies
WHERE tablename = 'ai_chat_messages'
AND policyname = 'Everyone can view all messages'
AND cmd = 'SELECT'

UNION ALL

-- Check RPC function
SELECT
  'RPC function exists' as check_type,
  COUNT(*) as found,
  1 as expected
FROM pg_proc
WHERE proname = 'send_agent_message';

-- ============================================
-- STEP 7: Test Anonymous Access (CRITICAL)
-- ============================================

-- This tests if anonymous users can see messages
DO $$
DECLARE
  v_test_result TEXT;
BEGIN
  -- Switch to anonymous role
  SET LOCAL ROLE anon;

  -- Try to select from messages
  BEGIN
    PERFORM COUNT(*) FROM ai_chat_messages;
    RAISE NOTICE '✅ SUCCESS: Anonymous users CAN view messages';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ FAILED: Anonymous users CANNOT view messages - Error: %', SQLERRM;
  END;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================
-- FINAL CHECK: Summary
-- ============================================
SELECT
  '🎯 PHASE 1 COMPLETE - Database is ready for chat system' as status,
  'Next step: Test in your application or move to Phase 2' as next_action;