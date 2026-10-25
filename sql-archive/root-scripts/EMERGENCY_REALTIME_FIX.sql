-- EMERGENCY FIX: Realtime Message Sync
-- This fixes message sync between dashboard and store slug

-- Step 1: Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;

-- Step 2: Enable realtime for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;

-- Step 3: Fix the initiate_agent_takeover function (remove duplicates)
DROP FUNCTION IF EXISTS public.initiate_agent_takeover CASCADE;

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
    -- Update conversation status
    UPDATE ai_chat_conversations
    SET
        takeover_status = 'agent',
        is_agent_active = true,
        agent_id = p_agent_id,
        updated_at = NOW()
    WHERE id = p_conversation_id;

    -- Return success without inserting message (handled in frontend)
    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'agent_id', p_agent_id,
        'takeover_session_id', 'session_' || gen_random_uuid()
    );
END;
$$;

-- Step 4: Grant proper permissions
GRANT ALL ON ai_chat_messages TO authenticated;
GRANT ALL ON ai_chat_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover TO anon;

-- Step 5: Create a helper function to send agent messages
CREATE OR REPLACE FUNCTION public.send_agent_message(
    p_conversation_id uuid,
    p_message text,
    p_agent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id uuid;
BEGIN
    -- Insert the message
    INSERT INTO ai_chat_messages (
        conversation_id,
        role,
        content,
        is_agent_message,
        agent_id,
        created_at
    ) VALUES (
        p_conversation_id,
        'assistant',
        p_message,
        true,
        p_agent_id,
        NOW()
    ) RETURNING id INTO v_message_id;

    -- Return the message details
    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_message_id,
        'conversation_id', p_conversation_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_agent_message TO authenticated;

-- Step 6: Verify realtime is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';