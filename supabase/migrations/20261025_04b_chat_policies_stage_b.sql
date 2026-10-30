-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Auditor script 04 v2, STAGE B only (section 7b).
--
-- DO NOT RUN until:
--   * 20261023_01, 02, 03 and 20261025_04 (Stage A) have been run, and
--   * the frontend from this PR is deployed (AIChatWidget uses
--     visitor_get_conversation / visitor_get_messages / visitor_request_owner
--     and crypto.randomUUID() session ids — Builder note B3).
-- Running this first removes the open chat policies the old widget needs.
-- =============================================================================

-- 7b. STAGE B — ONLY after AIChatWidget.tsx uses the section-6 RPCs (Builder note B3).
--     Drops the 6 open SELECT/ALL policies, the 2 open INSERTs, and the loose
--     "auth.uid() IS NOT NULL" and user-metadata "admin" policies (raw_user_meta_data
--     is editable by the user via auth.updateUser -> anyone can make themselves admin).
--     Edge functions (ai-chat, send-agent-message) use the service role: unaffected.
BEGIN;
-- ai_chat_conversations
DROP POLICY IF EXISTS "temp_allow_all_conversations"                 ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Anyone can view conversations"                ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Everyone can view conversations"              ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Anyone can create conversations"              ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Agents can update conversations"              ON public.ai_chat_conversations;
-- keep: "Store owners can update their conversations"
CREATE POLICY conv_owner_select ON public.ai_chat_conversations
  FOR SELECT TO authenticated
  USING (store_id::text = auth.uid()::text
         OR store_id::text IN (SELECT s.id::text FROM public.stores s WHERE s.user_id = auth.uid()::text)
         OR agent_id = auth.uid());
CREATE POLICY conv_owner_delete ON public.ai_chat_conversations
  FOR DELETE TO authenticated
  USING (store_id::text IN (SELECT s.id::text FROM public.stores s WHERE s.user_id = auth.uid()::text));

-- ai_chat_messages
DROP POLICY IF EXISTS "temp_allow_all_messages"                  ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Allow all to view messages"               ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Everyone can view all messages"           ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Allow all message inserts"                ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages"  ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Only authenticated can insert messages"   ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Agents can update messages"               ON public.ai_chat_messages;
CREATE POLICY msg_owner_select ON public.ai_chat_messages
  FOR SELECT TO authenticated USING (public.owns_conversation(conversation_id));
CREATE POLICY msg_owner_insert ON public.ai_chat_messages
  FOR INSERT TO authenticated WITH CHECK (public.owns_conversation(conversation_id));
CREATE POLICY msg_owner_update ON public.ai_chat_messages
  FOR UPDATE TO authenticated USING (public.owns_conversation(conversation_id))
  WITH CHECK (public.owns_conversation(conversation_id));
CREATE POLICY msg_owner_delete ON public.ai_chat_messages
  FOR DELETE TO authenticated USING (public.owns_conversation(conversation_id));
COMMIT;
