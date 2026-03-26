-- EMERGENCY FIX: Enable Realtime & Clean Functions (CORRECTED VERSION)
-- Run this entire block in Supabase SQL Editor

-- Step 1: Drop duplicate function
DROP FUNCTION IF EXISTS public.initiate_agent_takeover CASCADE;

-- Step 2: Fix realtime (remove first, then add)
DO $$
BEGIN
    -- Try to drop tables from publication if they exist
    ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_messages;
EXCEPTION WHEN OTHERS THEN
    -- Table wasn't in publication, continue
    NULL;
END $$;

DO $$
BEGIN
    -- Try to drop tables from publication if they exist
    ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_conversations;
EXCEPTION WHEN OTHERS THEN
    -- Table wasn't in publication, continue
    NULL;
END $$;

-- Now add the tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;

-- Step 3: Create clean function
CREATE OR REPLACE FUNCTION public.initiate_agent_takeover(
    p_conversation_id uuid,
    p_agent_id uuid,
    p_agent_name text DEFAULT 'Store Owner'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE ai_chat_conversations
    SET
        takeover_status = 'agent',
        is_agent_active = true,
        agent_id = p_agent_id,
        updated_at = NOW()
    WHERE id = p_conversation_id;

    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'agent_id', p_agent_id
    );
END;
$$;

-- Step 4: Grant permissions
GRANT ALL ON ai_chat_messages TO authenticated;
GRANT ALL ON ai_chat_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO anon;

-- Step 5: Verify realtime is enabled
SELECT
    schemaname,
    tablename,
    'Realtime Enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('ai_chat_messages', 'ai_chat_conversations');