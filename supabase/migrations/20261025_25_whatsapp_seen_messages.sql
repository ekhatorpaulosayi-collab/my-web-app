-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- whatsapp-webhook claims a provider message id with
-- INSERT ... ON CONFLICT DO NOTHING and status 'pending' before it does any
-- work. After the reply is sent, status becomes 'sent'. A failed send deletes
-- the pending row. A pending row older than 2 minutes can be claimed again.
-- Sent rows older than 7 days are deleted about every 50 requests, or once
-- an hour. A message with no id is stored under a hash that includes a
-- 2-minute time bucket. Rows that already existed, including rows the R21
-- draft marked pending, were written after a reply and are set to 'sent'.
-- The function is still DO NOT DEPLOY. Run this file only if that function
-- is ever deployed, and run it before the function takes traffic.
--
-- UNDO: DROP TABLE public.whatsapp_seen_messages;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_seen_messages (
  provider_message_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',
  seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_seen_messages_status_check CHECK (status IN ('pending', 'sent'))
);

ALTER TABLE public.whatsapp_seen_messages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

-- The R21 draft of this file added status with default 'pending', so an
-- already-answered row looked in progress. Correct those rows before traffic.
UPDATE public.whatsapp_seen_messages
SET status = 'sent'
WHERE status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_seen_messages_status_check'
      AND conrelid = 'public.whatsapp_seen_messages'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_seen_messages
      ADD CONSTRAINT whatsapp_seen_messages_status_check
      CHECK (status IN ('pending', 'sent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS whatsapp_seen_messages_seen_at_idx
  ON public.whatsapp_seen_messages (seen_at);

ALTER TABLE public.whatsapp_seen_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_seen_messages FROM PUBLIC, anon, authenticated;

COMMIT;
