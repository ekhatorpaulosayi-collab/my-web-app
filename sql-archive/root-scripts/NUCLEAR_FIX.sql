-- NUCLEAR FIX: Remove ALL versions of the function first
-- This will find and drop every version regardless of parameters

-- Step 1: Find all versions of the function (for visibility)
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    'DROP FUNCTION IF EXISTS ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_command
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'initiate_agent_takeover';

-- Step 2: Drop ALL versions manually (covers all possible signatures)
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(p_conversation_id uuid, p_agent_id uuid, p_agent_name text) CASCADE;
DROP FUNCTION IF EXISTS initiate_agent_takeover(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS initiate_agent_takeover(uuid, uuid) CASCADE;

-- Step 3: Enable realtime
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

-- Step 4: Create ONE clean function
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

-- Step 5: Grant permissions
GRANT ALL ON ai_chat_messages TO authenticated;
GRANT ALL ON ai_chat_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO anon;

-- Step 6: Verify only ONE function exists
SELECT
    'Functions after cleanup:' as status,
    count(*) as function_count
FROM pg_proc
WHERE proname = 'initiate_agent_takeover';

-- Step 7: Verify realtime is enabled
SELECT
    tablename,
    'Realtime Enabled ✓' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('ai_chat_messages', 'ai_chat_conversations');