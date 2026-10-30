-- ========================================================
-- AGENT TAKEOVER - QUICK RESTORE SCRIPT
-- Run this in Supabase SQL Editor to fix the agent takeover
-- ========================================================

-- Step 1: Reset any stuck takeovers
UPDATE ai_chat_conversations
SET is_agent_active = false
WHERE is_agent_active = true;

-- Step 2: Drop problematic policies (if causing issues)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('ai_chat_messages', 'ai_chat_conversations')
    AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 3: Create super permissive policies (temporary fix)
CREATE POLICY "temp_allow_all_messages" ON ai_chat_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "temp_allow_all_conversations" ON ai_chat_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Ensure real-time is working
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_messages;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_conversations;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;

-- Step 5: Recreate critical functions
CREATE OR REPLACE FUNCTION public.fetch_conversation_messages_unrestricted(
  p_session_id TEXT
)
RETURNS TABLE(
  id UUID,
  conversation_id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_agent_message BOOLEAN,
  agent_id UUID,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.role,
    m.content,
    m.created_at,
    m.is_agent_message,
    m.agent_id,
    m.user_id
  FROM ai_chat_messages m
  INNER JOIN ai_chat_conversations c ON c.id = m.conversation_id
  WHERE c.session_id = p_session_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fetch_conversation_messages_unrestricted(TEXT) TO anon, authenticated, service_role;
GRANT ALL ON ai_chat_messages TO anon, authenticated, service_role;
GRANT ALL ON ai_chat_conversations TO anon, authenticated, service_role;

-- Step 6: Test the fix
SELECT
  'Quick restore completed!' as status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('ai_chat_messages', 'ai_chat_conversations')) as policy_count,
  (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename LIKE 'ai_chat%') as realtime_tables;