-- Fix Chat Agent Takeover: Customer Message Visibility (CORRECTED VERSION)
-- This SQL fixes the issue where customers cannot see agent messages after takeover
-- FIXED: Changed 'user_id' to 'id' in auth.users table references

-- 1. Fix RLS Policies for ai_chat_messages
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON ai_chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ai_chat_messages;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON ai_chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages in public conversations" ON ai_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Agents can update messages" ON ai_chat_messages;

-- Create comprehensive RLS policy for message visibility
CREATE POLICY "Anyone can view messages in public conversations"
ON ai_chat_messages FOR SELECT
USING (true);  -- Allow everyone to see all messages (customers need to see agent messages)

CREATE POLICY "Authenticated users can insert messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Agents can update messages"
ON ai_chat_messages FOR UPDATE
USING (
  agent_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- 2. Fix RLS Policies for ai_chat_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Enable read access for all users" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Agents can update conversations" ON ai_chat_conversations;

CREATE POLICY "Anyone can view conversations"
ON ai_chat_conversations FOR SELECT
USING (true);  -- Allow viewing all conversations

CREATE POLICY "Anyone can create conversations"
ON ai_chat_conversations FOR INSERT
WITH CHECK (true);  -- Allow creating conversations

CREATE POLICY "Agents can update conversations"
ON ai_chat_conversations FOR UPDATE
USING (
  agent_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- 3. Add missing columns if they don't exist
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT false;

ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id);

ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'customer';

ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS takeover_status TEXT DEFAULT 'ai';

ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS is_agent_active BOOLEAN DEFAULT false;

ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id);

-- 4. Create or replace the send_agent_message function
CREATE OR REPLACE FUNCTION send_agent_message(
  p_conversation_id UUID,
  p_message TEXT,
  p_agent_id UUID DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_message_id UUID;
  v_agent_id UUID;
BEGIN
  -- Get agent ID from auth context if not provided
  v_agent_id := COALESCE(p_agent_id, auth.uid());

  -- Insert the agent message
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
    v_agent_id,
    'agent',
    NOW()
  ) RETURNING id INTO v_message_id;

  -- Update conversation status
  UPDATE ai_chat_conversations
  SET
    takeover_status = 'agent',
    is_agent_active = true,
    agent_id = v_agent_id,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id,
    'conversation_id', p_conversation_id,
    'agent_id', v_agent_id,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ai_chat_messages TO anon, authenticated;
GRANT ALL ON ai_chat_conversations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION send_agent_message TO anon, authenticated;

-- 6. Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON ai_chat_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_agent ON ai_chat_messages(is_agent_message);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON ai_chat_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_takeover_status ON ai_chat_conversations(takeover_status);

-- Success message
SELECT 'Chat visibility fix applied successfully! Customers can now see agent messages.' as status;