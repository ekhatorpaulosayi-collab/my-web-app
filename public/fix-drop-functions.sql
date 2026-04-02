-- STEP 1: First drop ALL versions of send_agent_message function
-- Run this FIRST to clear all existing functions

DROP FUNCTION IF EXISTS public.send_agent_message() CASCADE;
DROP FUNCTION IF EXISTS public.send_agent_message(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.send_agent_message(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.send_agent_message(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.send_agent_message(p_conversation_id UUID) CASCADE;
DROP FUNCTION IF EXISTS public.send_agent_message(p_conversation_id UUID, p_message TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.send_agent_message(p_conversation_id UUID, p_message TEXT, p_agent_id UUID) CASCADE;

-- Also drop with different schemas just in case
DROP FUNCTION IF EXISTS send_agent_message() CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(UUID) CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(UUID, TEXT, UUID) CASCADE;

-- Check if functions are dropped
SELECT 'All send_agent_message functions dropped successfully!' as status;