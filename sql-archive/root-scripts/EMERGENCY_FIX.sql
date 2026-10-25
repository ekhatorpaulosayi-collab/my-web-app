-- EMERGENCY FIX: Run this in Supabase SQL Editor NOW
-- This removes ALL versions and creates ONE clean function

-- Step 1: Drop ALL existing versions (be thorough)
DROP FUNCTION IF EXISTS public.initiate_agent_takeover CASCADE;
DROP FUNCTION IF EXISTS initiate_agent_takeover CASCADE;

-- Step 2: Create the ONE correct version
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
    -- Simple update
    UPDATE ai_chat_conversations
    SET
        takeover_status = 'agent',
        is_agent_active = true,
        agent_id = p_agent_id,
        updated_at = NOW()
    WHERE id = p_conversation_id;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'agent_id', p_agent_id,
        'takeover_session_id', 'session_' || gen_random_uuid()
    );
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO anon;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO service_role;

-- Step 4: Verify only ONE function exists
SELECT
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'initiate_agent_takeover';