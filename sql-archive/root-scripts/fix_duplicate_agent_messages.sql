-- FIX: Stop duplicate "agent has joined" messages
-- The issue: The RPC function adds a system message, AND the JavaScript also adds one as fallback
-- Solution: Remove the message insertion from the RPC function

-- Drop and recreate the function WITHOUT the system message insertion
CREATE OR REPLACE FUNCTION initiate_agent_takeover(
  p_conversation_id UUID,
  p_agent_id TEXT,
  p_agent_name TEXT DEFAULT 'Agent'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id TEXT;
  v_store_name TEXT;
  v_session_id TEXT;
  v_result JSON;
BEGIN
  -- Generate a unique session ID
  v_session_id := 'takeover_' || gen_random_uuid()::TEXT;

  -- Get store_id from conversation
  SELECT store_id INTO v_store_id
  FROM ai_chat_conversations
  WHERE id = p_conversation_id
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Conversation not found'
    );
  END IF;

  -- Get store name with type casting
  SELECT name INTO v_store_name
  FROM stores
  WHERE id::TEXT = v_store_id
  LIMIT 1;

  -- Update conversation to mark agent as active
  UPDATE ai_chat_conversations
  SET
    is_agent_active = true,
    agent_id = p_agent_id,
    takeover_status = 'agent',
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- REMOVED: The system message insertion that was causing duplicates
  -- The JavaScript code will handle adding the "agent has joined" message

  -- Return success response
  v_result := json_build_object(
    'success', true,
    'takeover_session_id', v_session_id,
    'store_name', COALESCE(v_store_name, 'Unknown Store'),
    'message', 'Agent takeover initiated successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Also update the end_agent_takeover function to not add duplicate messages
CREATE OR REPLACE FUNCTION end_agent_takeover(
  p_conversation_id UUID,
  p_agent_id TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update conversation to mark agent as inactive
  UPDATE ai_chat_conversations
  SET
    is_agent_active = false,
    agent_id = NULL,
    takeover_status = 'ai',
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND agent_id = p_agent_id;

  -- REMOVED: System message insertion
  -- JavaScript will handle the "agent has left" message if needed

  RETURN json_build_object(
    'success', true,
    'message', 'Agent takeover ended successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Verify the functions were updated
SELECT
  'Functions updated successfully' as status,
  NOW() as updated_at;