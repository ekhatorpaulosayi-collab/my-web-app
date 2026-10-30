-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run after 20261025_04 and 20261025_21. Safe to re-run.
--
-- SEC-01: a merchant JWT cannot change kyc_status, frozen, the freeze audit
-- columns, paystack_subaccounts_enabled, or paystack_subaccount_id.
-- Service role and a local postgres session with no JWT still can.
--
-- SEC-02: takeover and agent-message functions require the caller to own the
-- conversation's store, and the agent id must be auth.uid().
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS stores_protect_platform_flags ON public.stores;
--   DROP FUNCTION IF EXISTS public.protect_store_platform_flags();
--   -- Do not restore the previous takeover bodies. They did not check the store.
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.owns_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.ai_chat_conversations AS c
      JOIN public.stores AS s ON s.id::text = c.store_id::text
     WHERE c.id = p_conversation_id
       AND s.user_id = auth.uid()::text
  );
$$;

REVOKE ALL ON FUNCTION public.owns_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_conversation(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_store_platform_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  privileged boolean := coalesce(auth.role(), '') = 'service_role'
    OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin'));
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT privileged THEN
      NEW.kyc_status := 'not_started';
      NEW.frozen := false;
      NEW.frozen_at := NULL;
      NEW.frozen_reason := NULL;
      NEW.frozen_by := NULL;
      NEW.paystack_subaccounts_enabled := false;
      NEW.paystack_subaccount_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.frozen IS DISTINCT FROM OLD.frozen
     OR NEW.frozen_at IS DISTINCT FROM OLD.frozen_at
     OR NEW.frozen_reason IS DISTINCT FROM OLD.frozen_reason
     OR NEW.frozen_by IS DISTINCT FROM OLD.frozen_by
     OR NEW.paystack_subaccounts_enabled IS DISTINCT FROM OLD.paystack_subaccounts_enabled
     OR NEW.paystack_subaccount_id IS DISTINCT FROM OLD.paystack_subaccount_id THEN
    RAISE EXCEPTION 'platform_field_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_protect_platform_flags ON public.stores;
CREATE TRIGGER stores_protect_platform_flags
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_platform_flags();

REVOKE UPDATE (
  kyc_status, frozen, frozen_at, frozen_reason, frozen_by,
  paystack_subaccounts_enabled, paystack_subaccount_id
) ON TABLE public.stores FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.initiate_agent_takeover(
  p_conversation_id uuid,
  p_agent_id uuid,
  p_agent_name text DEFAULT 'Store Owner'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_agent_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF NOT public.owns_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ai_chat_conversations
     SET takeover_status = 'agent',
         is_agent_active = true,
         agent_id = auth.uid(),
         requested_at = COALESCE(requested_at, now()),
         updated_at = now()
   WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object('success', true, 'conversation_id', p_conversation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_agent_takeover(
  p_conversation_id uuid,
  p_agent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_agent_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF NOT public.owns_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ai_chat_conversations
     SET takeover_status = 'ended',
         is_agent_active = false,
         updated_at = now()
   WHERE id = p_conversation_id
     AND agent_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('success', true, 'conversation_id', p_conversation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_agent_message(
  p_conversation_id uuid,
  p_message text,
  p_agent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_agent_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF NOT public.owns_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF p_message IS NULL OR btrim(p_message) = '' OR length(p_message) > 4000 THEN
    RAISE EXCEPTION 'bad_message' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.ai_chat_messages (
    conversation_id, role, content, is_agent_message, agent_id, created_at
  ) VALUES (
    p_conversation_id, 'assistant', left(btrim(p_message), 4000), true, auth.uid(), now()
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$;

REVOKE ALL ON FUNCTION public.initiate_agent_takeover(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_agent_takeover(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_agent_message(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initiate_agent_takeover(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_agent_takeover(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_agent_message(uuid, text, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Agents can update conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners can update their conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS conv_owner_update ON public.ai_chat_conversations;
CREATE POLICY conv_owner_update ON public.ai_chat_conversations
  FOR UPDATE TO authenticated
  USING (public.owns_conversation(id))
  WITH CHECK (public.owns_conversation(id));

COMMIT;
