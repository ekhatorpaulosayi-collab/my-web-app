-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- increment_chat_usage becomes one UPDATE that adds a chat only while
-- chats_used_this_month is still under monthly_chat_limit. Two callers cannot
-- both pass a separate read. release_chat_usage gives that unit back when the
-- WhatsApp reply fails, so a failed send is not counted.
--
-- Run this only if whatsapp-webhook is ever deployed, and run it before that
-- function takes traffic. The function stays DO NOT DEPLOY in this pull request.
--
-- UNDO: restore the previous increment_chat_usage body, then
--       DROP FUNCTION IF EXISTS public.release_chat_usage(uuid);
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.increment_chat_usage(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reserved integer;
BEGIN
  INSERT INTO public.subscription_tiers (user_id, tier, monthly_chat_limit, chats_used_this_month)
  VALUES (p_user_id, 'free', 10, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.subscription_tiers
  SET chats_used_this_month = COALESCE(chats_used_this_month, 0) + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND COALESCE(chats_used_this_month, 0) < monthly_chat_limit;

  GET DIAGNOSTICS reserved = ROW_COUNT;
  RETURN reserved > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_chat_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscription_tiers
  SET chats_used_this_month = chats_used_this_month - 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND chats_used_this_month > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_chat_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_chat_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_chat_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_chat_usage(uuid) TO service_role;

COMMIT;
