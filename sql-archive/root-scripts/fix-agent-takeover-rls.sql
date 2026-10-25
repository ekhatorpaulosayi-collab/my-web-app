-- Fix RLS policies for agent takeover functionality
-- This allows users to create and manage takeover sessions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can manage takeover sessions" ON agent_takeover_sessions;

-- Create a more permissive policy for agent takeover sessions
CREATE POLICY "Users can create and view takeover sessions"
  ON agent_takeover_sessions
  FOR ALL
  USING (
    -- User can access their own takeover sessions
    agent_id = auth.uid()
    OR
    -- User can access takeover sessions for their store's conversations
    conversation_id IN (
      SELECT id FROM ai_chat_conversations
      WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- User can create takeover sessions for their store's conversations
    conversation_id IN (
      SELECT id FROM ai_chat_conversations
      WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
      )
    )
  );

-- Also ensure the ai_chat_conversations table allows updates for takeover
DROP POLICY IF EXISTS "Store owners can update their conversations" ON ai_chat_conversations;

CREATE POLICY "Store owners can update their conversations"
  ON ai_chat_conversations
  FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Ensure store owners can insert messages as agents
DROP POLICY IF EXISTS "Store owners can insert agent messages" ON ai_chat_messages;

CREATE POLICY "Store owners can insert agent messages"
  ON ai_chat_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_chat_conversations
      WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
      )
    )
  );

-- Grant execute permissions on the takeover functions
GRANT EXECUTE ON FUNCTION initiate_agent_takeover(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_agent_takeover(UUID, UUID) TO authenticated;

-- Verify the functions exist and are accessible
SELECT 'initiate_agent_takeover function exists' AS status
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'initiate_agent_takeover'
);

SELECT 'end_agent_takeover function exists' AS status
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'end_agent_takeover'
);