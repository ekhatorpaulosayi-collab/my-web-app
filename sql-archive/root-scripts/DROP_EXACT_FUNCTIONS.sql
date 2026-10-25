-- DROP THE EXACT FUNCTIONS THAT EXIST
-- We found 2 versions with different parameter types for p_agent_id

-- Drop version 1: p_agent_id as TEXT
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(p_conversation_id uuid, p_agent_id text, p_agent_name text) CASCADE;

-- Drop version 2: p_agent_id as UUID
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(p_conversation_id uuid, p_agent_id uuid, p_agent_name text) CASCADE;

-- Verify they're gone
SELECT count(*) as remaining_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'initiate_agent_takeover';

-- Now enable realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_messages;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE ai_chat_conversations;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;

-- Create ONE clean function (with UUID for agent_id)
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
        'agent_id', p_agent_id,
        'takeover_session_id', 'session_' || gen_random_uuid()
    );
END;
$$;

-- Grant permissions
GRANT ALL ON ai_chat_messages TO authenticated;
GRANT ALL ON ai_chat_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover(p_conversation_id uuid, p_agent_id uuid, p_agent_name text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover(p_conversation_id uuid, p_agent_id uuid, p_agent_name text) TO anon;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover(p_conversation_id uuid, p_agent_id uuid, p_agent_name text) TO service_role;

-- Final verification
SELECT
    'Function Status' as check_type,
    CASE
        WHEN count(*) = 1 THEN '✅ SUCCESS: Exactly 1 function exists'
        WHEN count(*) = 0 THEN '❌ ERROR: No function exists'
        ELSE '❌ ERROR: ' || count(*) || ' functions still exist'
    END as status
FROM pg_proc
WHERE proname = 'initiate_agent_takeover'
UNION ALL
SELECT
    'Realtime Status' as check_type,
    CASE
        WHEN count(*) = 2 THEN '✅ SUCCESS: Both tables have realtime'
        ELSE '❌ ERROR: Only ' || count(*) || ' tables have realtime'
    END as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('ai_chat_messages', 'ai_chat_conversations');