-- Fix for initiate_agent_takeover function overloading issue
-- This script will clean up duplicate functions and create a single version

-- Step 1: Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.initiate_agent_takeover(uuid, uuid) CASCADE;

-- Step 2: Create a single, clean version of the function
CREATE OR REPLACE FUNCTION public.initiate_agent_takeover(
    p_conversation_id uuid,
    p_agent_id uuid,
    p_agent_name text DEFAULT 'Store Owner'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_conversation record;
    v_takeover_session_id text;
BEGIN
    -- Generate takeover session ID
    v_takeover_session_id := 'takeover_' || gen_random_uuid()::text;

    -- Get conversation details
    SELECT * INTO v_conversation
    FROM ai_chat_conversations
    WHERE id = p_conversation_id;

    -- Check if conversation exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conversation not found'
        );
    END IF;

    -- Check if already taken over
    IF v_conversation.takeover_status = 'agent' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conversation already taken over',
            'current_agent', v_conversation.agent_id
        );
    END IF;

    -- Update conversation status
    UPDATE ai_chat_conversations
    SET
        takeover_status = 'agent',
        is_agent_active = true,
        agent_id = p_agent_id,
        requested_at = COALESCE(requested_at, NOW()),
        updated_at = NOW()
    WHERE id = p_conversation_id;

    -- Note: We removed the duplicate "agent joined" message insertion here
    -- It's handled in ConversationsPageFixed.tsx instead

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'agent_id', p_agent_id,
        'takeover_session_id', v_takeover_session_id,
        'message', 'Takeover initiated successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover(uuid, uuid, text) TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.initiate_agent_takeover(uuid, uuid, text) IS
'Initiates agent takeover of a conversation. Returns success status and takeover session ID.';

-- Optional: Create an end_agent_takeover function if it doesn't exist
CREATE OR REPLACE FUNCTION public.end_agent_takeover(
    p_conversation_id uuid,
    p_agent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update conversation status
    UPDATE ai_chat_conversations
    SET
        takeover_status = 'ended',
        is_agent_active = false,
        updated_at = NOW()
    WHERE id = p_conversation_id
    AND agent_id = p_agent_id;

    -- Check if update was successful
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conversation not found or you are not the active agent'
        );
    END IF;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Takeover ended successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions for end function
GRANT EXECUTE ON FUNCTION public.end_agent_takeover(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_agent_takeover(uuid, uuid) TO service_role;