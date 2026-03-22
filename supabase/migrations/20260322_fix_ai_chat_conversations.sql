-- Fix AI Chat Conversations Table
-- Ensure the table exists with all necessary columns

-- Create conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  context_type TEXT DEFAULT 'help' CHECK (context_type IN ('onboarding', 'help', 'storefront', 'business-advisory')),
  user_type TEXT,
  is_storefront BOOLEAN DEFAULT false,
  source_page TEXT,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  agent_id UUID REFERENCES auth.users(id),
  agent_takeover_at TIMESTAMPTZ,
  takeover_status TEXT DEFAULT 'ai' CHECK (takeover_status IN ('ai', 'requested', 'agent', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns if table already exists
DO $$
BEGIN
  -- Add store_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'store_id') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
  END IF;

  -- Add is_storefront column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'is_storefront') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN is_storefront BOOLEAN DEFAULT false;
  END IF;

  -- Add source_page column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'source_page') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN source_page TEXT;
  END IF;

  -- Add visitor fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'visitor_name') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN visitor_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'visitor_email') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN visitor_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'visitor_phone') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN visitor_phone TEXT;
  END IF;

  -- Add agent takeover fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'agent_id') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN agent_id UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'agent_takeover_at') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN agent_takeover_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_conversations'
                 AND column_name = 'takeover_status') THEN
    ALTER TABLE ai_chat_conversations ADD COLUMN takeover_status TEXT DEFAULT 'ai' CHECK (takeover_status IN ('ai', 'requested', 'agent', 'ended'));
  END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_session
ON ai_chat_conversations(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user
ON ai_chat_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_store
ON ai_chat_conversations(store_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_created
ON ai_chat_conversations(created_at DESC);

-- Update ai_chat_messages table to have conversation_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_chat_messages'
                 AND column_name = 'conversation_id') THEN
    ALTER TABLE ai_chat_messages ADD COLUMN conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Create index on conversation_id in messages table
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation
ON ai_chat_messages(conversation_id);

-- Enable Row Level Security (but allow service role full access)
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Service role has full access to messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON ai_chat_messages;

-- Create RLS policies
-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role has full access to conversations"
ON ai_chat_conversations
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to messages"
ON ai_chat_messages
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Users can view conversations linked to their stores
CREATE POLICY "Users can view their own conversations"
ON ai_chat_conversations
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  store_id IN (
    SELECT id FROM stores
    WHERE user_id = auth.uid()
    OR created_by = auth.uid()
  )
);

-- Users can view messages in conversations they have access to
CREATE POLICY "Users can view messages in their conversations"
ON ai_chat_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM ai_chat_conversations
    WHERE auth.uid() = user_id
    OR store_id IN (
      SELECT id FROM stores
      WHERE user_id = auth.uid()
      OR created_by = auth.uid()
    )
  )
);