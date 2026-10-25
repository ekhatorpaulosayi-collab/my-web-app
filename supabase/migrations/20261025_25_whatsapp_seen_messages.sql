-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- whatsapp-webhook skips a message it has already seen. The provider message
-- id is stored here so a second server instance sees it too. The function is
-- still DO NOT DEPLOY. Run this file only if that function is ever deployed.
--
-- UNDO: DROP TABLE public.whatsapp_seen_messages;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_seen_messages (
  provider_message_id text PRIMARY KEY,
  seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_seen_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_seen_messages FROM PUBLIC, anon, authenticated;

COMMIT;
