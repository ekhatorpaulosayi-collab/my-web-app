-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- whatsapp-webhook skips a message it has already answered. The provider
-- message id is inserted only after the reply is sent, so a failed send can
-- be retried. Rows older than 7 days are deleted by the function on the next
-- request. A message with no id is stored under a hash key. The function is
-- still DO NOT DEPLOY. Run this file only if that function is ever deployed.
--
-- UNDO: DROP TABLE public.whatsapp_seen_messages;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_seen_messages (
  provider_message_id text PRIMARY KEY,
  seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_seen_messages_seen_at_idx
  ON public.whatsapp_seen_messages (seen_at);

ALTER TABLE public.whatsapp_seen_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_seen_messages FROM PUBLIC, anon, authenticated;

COMMIT;
