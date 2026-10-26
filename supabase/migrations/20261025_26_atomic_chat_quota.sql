-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- Live subscription_tiers is the plan catalogue. It has id and
-- max_ai_chats_monthly. It does not have user_id, monthly_chat_limit, or
-- chats_used_this_month. Per-user chat usage lives on user_subscriptions
-- as ai_chats_used_this_month. The limit is the catalogue value for that
-- row's tier_id.
--
-- increment_chat_usage adds one chat in a single UPDATE while the count is
-- still under that limit. A new month starts the count at 1 in the same
-- statement. A grandfathered row, an unlimited catalogue limit, or a user
-- with no subscription row is allowed, so an existing customer is not told
-- they have hit a limit this counter does not show. release_chat_usage gives
-- the unit back when the WhatsApp reply fails.
--
-- Both functions are SECURITY DEFINER with search_path = ''.
--
-- Run this only if whatsapp-webhook is ever deployed, and run it before that
-- function takes traffic. The function stays DO NOT DEPLOY in this pull request.
--
-- UNDO:
--   DROP FUNCTION IF EXISTS public.increment_chat_usage(uuid);
--   DROP FUNCTION IF EXISTS public.release_chat_usage(uuid);
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.increment_chat_usage(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_grandfathered boolean;
  v_found boolean;
  reserved integer;
BEGIN
  SELECT st.max_ai_chats_monthly, COALESCE(us.grandfathered, false)
    INTO v_limit, v_grandfathered
  FROM public.user_subscriptions us
  JOIN public.subscription_tiers st ON st.id = us.tier_id
  WHERE us.user_id = p_user_id;

  v_found := FOUND;

  -- No plan row: allow. Do not invent a subscription row.
  IF NOT v_found THEN
    RETURN true;
  END IF;

  UPDATE public.user_subscriptions us
  SET ai_chats_used_this_month = CASE
        WHEN us.ai_chats_reset_at IS NULL
          OR us.ai_chats_reset_at < pg_catalog.date_trunc('month', pg_catalog.now())
          THEN 1
        ELSE COALESCE(us.ai_chats_used_this_month, 0) + 1
      END,
      ai_chats_reset_at = CASE
        WHEN us.ai_chats_reset_at IS NULL
          OR us.ai_chats_reset_at < pg_catalog.date_trunc('month', pg_catalog.now())
          THEN pg_catalog.now()
        ELSE us.ai_chats_reset_at
      END,
      updated_at = pg_catalog.now()
  WHERE us.user_id = p_user_id
    AND (
      v_grandfathered
      OR v_limit < 0
      OR us.ai_chats_reset_at IS NULL
      OR us.ai_chats_reset_at < pg_catalog.date_trunc('month', pg_catalog.now())
      OR COALESCE(us.ai_chats_used_this_month, 0) < v_limit
    );

  GET DIAGNOSTICS reserved = ROW_COUNT;
  RETURN reserved > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_chat_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET ai_chats_used_this_month = ai_chats_used_this_month - 1,
      updated_at = pg_catalog.now()
  WHERE user_id = p_user_id
    AND ai_chats_used_this_month > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_chat_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_chat_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_chat_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_chat_usage(uuid) TO service_role;

COMMIT;
