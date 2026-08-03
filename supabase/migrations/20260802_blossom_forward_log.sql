-- =============================================================================
-- blossom_forward_log — observability for the TEMPORARY Storehouse → Blossom
-- Paystack webhook forward bridge.
-- Date: 2026-08-02
-- =============================================================================
--
-- TEMPORARY — delete this table together with the bridge when Blossom moves to
-- its own Paystack business. Trigger: the first third-party (non-Paul) school
-- completes CARD-PAYMENTS onboarding (a Paystack subaccount is created for it).
-- Cash/claims-only schools and mere Blossom signups do NOT trigger removal.
-- See docs/follow-ups.md and CLAUDE.md.
--
-- WHY A SEPARATE TABLE (not paystack_webhook_events):
--   Blossom's references (BLS_<client_payment_id>) are foreign to Storehouse.
--   Writing them into paystack_webhook_events could collide with Storehouse's
--   replay-protection UNIQUE(paystack_reference, event_type) and pollute the
--   idempotency table. This table answers only one question — "did a given
--   Blossom event forward, and what did Blossom say?" — and owns no money logic.
--
-- ADDITIVE-ONLY: creates one NEW table + its index + RLS. Touches nothing else.
--
-- Apply via psql (migration drift makes `db push` unsafe — see CLAUDE.md):
--   psql "$(cat ~/.supabase-paystack-dburl)" -v ON_ERROR_STOP=1 \
--     -f supabase/migrations/20260802_blossom_forward_log.sql
--   psql "$(cat ~/.supabase-paystack-dburl)" -c \
--     "INSERT INTO supabase_migrations.schema_migrations (version, name, statements) \
--      VALUES ('20260802', 'blossom_forward_log', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING;"
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.blossom_forward_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- The Paystack reference of the forwarded event (BLS_...). Nullable because a
  -- disagreement/malformed event may lack a usable reference.
  reference     TEXT,
  event_type    TEXT NOT NULL,
  -- 'forwarded'      — Blossom returned 2xx (delivered).
  -- 'blossom_error'  — Blossom returned non-2xx (we returned 502; Paystack retries).
  -- 'network_error'  — fetch threw/timed out (we returned 502; Paystack retries).
  -- 'disagreement'   — marker/prefix conflict; NOT forwarded (we returned 409).
  outcome       TEXT NOT NULL CHECK (outcome IN ('forwarded','blossom_error','network_error','disagreement')),
  response_code INTEGER,                 -- Blossom's HTTP status when we got one; NULL otherwise.
  detail        TEXT,                    -- error message / note when applicable.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Did this reference forward, and when?" — the operational lookup.
CREATE INDEX IF NOT EXISTS idx_blossom_forward_log_ref_created
  ON public.blossom_forward_log (reference, created_at DESC);

-- Written only by the service-role edge function; no client ever reads/writes it.
-- Enable RLS with NO policies → locked to service-role (which bypasses RLS).
ALTER TABLE public.blossom_forward_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.blossom_forward_log FROM anon, authenticated;

COMMIT;
