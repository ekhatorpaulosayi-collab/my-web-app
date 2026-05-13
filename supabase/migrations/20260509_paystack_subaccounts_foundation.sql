-- =============================================================================
-- Paystack Subaccounts Foundation — Session 1
-- Date: 2026-05-09
-- Branch: feat/paystack-subaccounts (NOT main, NOT deployed)
-- Design doc: docs/PAYSTACK-SUBACCOUNTS-DESIGN.md
-- =============================================================================
--
-- This migration is ADDITIVE-ONLY. It:
--   * Creates 9 NEW tables.
--   * Adds nullable columns to the existing `stores` table (no ALTER COLUMN, no
--     DROP COLUMN, no RENAME).
--   * Enables RLS only on NEW tables.
--   * Creates indexes only on NEW tables.
--
-- It MUST NOT:
--   * Drop or rename any existing table or column.
--   * Change RLS on existing tables.
--   * Create indexes on existing tables (Session 1 guardrail; later sessions can).
--   * Run any DML against existing user data.
--
-- =============================================================================
-- PRE-DEPLOY CHECKLIST (run these BEFORE applying)
-- =============================================================================
--
-- 1. Vault key precondition (§3.5 of design doc) — run in Supabase SQL Editor
--    as a privileged user, BEFORE this migration:
--
--      CREATE EXTENSION IF NOT EXISTS pgcrypto;
--      CREATE EXTENSION IF NOT EXISTS supabase_vault;
--
--      SELECT vault.create_secret(
--        '<RANDOM_32_CHAR_KEY>',
--        'vendor_kyc_key',
--        'AES-256 key for vendor_kyc.bvn_encrypted and nin_encrypted'
--      );
--
--    Verify with:
--      SELECT name FROM vault.secrets WHERE name = 'vendor_kyc_key';
--
--    If this returns no rows, STOP. Do not run this migration. The encryption
--    insert pattern in the edge functions will fail silently otherwise.
--
-- 2. Naming conflict check — run in Supabase SQL Editor before applying:
--
--      SELECT table_name FROM information_schema.tables
--      WHERE table_schema = 'public'
--        AND table_name IN (
--          'orders', 'order_items', 'paystack_subaccounts', 'vendor_kyc',
--          'bank_accounts', 'paystack_split_transactions',
--          'paystack_webhook_events', 'platform_fee_config',
--          'vendor_velocity_limits'
--        );
--
--    Expected: zero rows. If any table already exists, STOP and reconcile —
--    `CREATE TABLE IF NOT EXISTS` would silently leave the existing table in
--    place with potentially wrong columns.
--
-- 3. Reviewer UUID substitution — replace every occurrence of the literal
--    `00000000-0000-0000-0000-000000000000` below with Paul's actual
--    auth.users.id BEFORE running the migration. Find it with:
--
--      SELECT id FROM auth.users WHERE email = 'ekhatorpaulosayi@gmail.com';
--
--    There are THREE occurrences in SQL code (all in the reviewer RLS
--    policies on paystack_split_transactions: one in split_tx_reviewer_select,
--    two in split_tx_reviewer_update for USING + WITH CHECK). Plus three more
--    in this comment block describing the placeholder. After substitution,
--    only the SQL-code occurrences should change.
--
--    To verify, run sed on a copy first:
--      sed 's/00000000-0000-0000-0000-000000000000/<paul-uuid>/g' \
--        supabase/migrations/20260509_paystack_subaccounts_foundation.sql \
--        | diff - supabase/migrations/20260509_paystack_subaccounts_foundation.sql
--    Expect exactly 3 line changes (the policies). If you see 6, you also
--    edited the comment block — back out and try again.
--
-- 4. Dry run — set `set local statement_timeout = '30s'` and run inside a
--    transaction with ROLLBACK at the end to confirm everything compiles
--    without side effects. The migration is wrapped in BEGIN/COMMIT but
--    you can replace COMMIT with ROLLBACK for the dry run.
--
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Required extensions
-- -----------------------------------------------------------------------------
-- pgcrypto: encryption for vendor_kyc.bvn_encrypted / nin_encrypted
-- gen_random_uuid: default for UUID PK columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 3.1.1  orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email           TEXT NOT NULL,
  customer_phone           TEXT NOT NULL,
  customer_name            TEXT,
  customer_access_token    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  total_amount_kobo        BIGINT NOT NULL CHECK (total_amount_kobo > 0),
  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded','partially_refunded')),
  paystack_reference       TEXT NOT NULL UNIQUE,
  order_type               TEXT NOT NULL DEFAULT 'storefront'
    CHECK (order_type IN ('storefront','marketplace')),
  primary_store_id         UUID REFERENCES public.stores(id) ON DELETE NO ACTION,
  delivery_address         JSONB,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                  TIMESTAMPTZ,
  fulfilled_at             TIMESTAMPTZ,

  CONSTRAINT orders_storefront_requires_store CHECK (
    (order_type = 'storefront' AND primary_store_id IS NOT NULL)
    OR (order_type = 'marketplace')
  )
);

COMMENT ON COLUMN public.orders.customer_access_token IS
  'Server-generated UUID returned to the storefront customer in the initiate response. '
  'Customer presents this token (URL param) to read their own order; replaces email-based '
  'JWT auth which would have required customer login. Never log this value.';

-- -----------------------------------------------------------------------------
-- 3.1.2  order_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 UUID NOT NULL REFERENCES public.orders(id) ON DELETE NO ACTION,
  store_id                 UUID NOT NULL REFERENCES public.stores(id) ON DELETE NO ACTION,
  product_id               UUID REFERENCES public.products(id) ON DELETE NO ACTION,
  product_name             TEXT NOT NULL,
  quantity                 INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo          BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  total_price_kobo         BIGINT NOT NULL CHECK (total_price_kobo >= 0),
  vendor_can_fulfill       BOOLEAN NOT NULL DEFAULT TRUE,
  fulfilled_at             TIMESTAMPTZ,
  fulfilled_by             UUID REFERENCES auth.users(id) ON DELETE NO ACTION,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3.1.3  paystack_subaccounts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paystack_subaccounts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                 UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE NO ACTION,
  paystack_subaccount_code TEXT NOT NULL UNIQUE,
  settlement_bank          TEXT NOT NULL,
  account_number           TEXT NOT NULL,
  account_name             TEXT NOT NULL,
  active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3.1.4  vendor_kyc
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_kyc (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                 UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE NO ACTION,
  bvn_encrypted            BYTEA,
  nin_encrypted            BYTEA,
  id_photo_url             TEXT,
  id_back_url              TEXT,
  selfie_url               TEXT,
  business_name            TEXT,
  business_address         TEXT,
  lga                      TEXT,
  state                    TEXT,
  market_area              TEXT,
  phone                    TEXT,
  whatsapp                 TEXT,
  referral_source          TEXT,
  status                   TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','submitted','approved','rejected','frozen')),
  reviewer_notes           TEXT,
  reviewed_by              UUID REFERENCES auth.users(id) ON DELETE NO ACTION,
  reviewed_at              TIMESTAMPTZ,
  rejection_reason         TEXT,
  submitted_at             TIMESTAMPTZ,
  signup_ip                TEXT,
  signup_device_fingerprint TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Decryption function for vendor_kyc.bvn_encrypted / nin_encrypted.
-- SECURITY DEFINER so it runs with the function-owner's privileges; only callable
-- by service_role per the GRANT below.
CREATE OR REPLACE FUNCTION public.decrypt_vendor_kyc_field(encrypted_data BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value TEXT;
BEGIN
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'vendor_kyc_key';

  IF key_value IS NULL THEN
    RAISE EXCEPTION 'vendor_kyc_key not configured in vault';
  END IF;

  RETURN pgp_sym_decrypt(encrypted_data, key_value);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_vendor_kyc_field(BYTEA) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrypt_vendor_kyc_field(BYTEA) TO service_role;

-- -----------------------------------------------------------------------------
-- 3.1.5  bank_accounts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                 UUID NOT NULL REFERENCES public.stores(id) ON DELETE NO ACTION,
  bank_code                TEXT NOT NULL,
  account_number           TEXT NOT NULL,
  resolved_account_name    TEXT NOT NULL,
  verified_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bank_accounts_uniq UNIQUE (store_id, bank_code, account_number)
);

-- -----------------------------------------------------------------------------
-- 3.1.6  paystack_split_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paystack_split_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 UUID NOT NULL REFERENCES public.orders(id) ON DELETE NO ACTION,
  order_item_id            UUID REFERENCES public.order_items(id) ON DELETE NO ACTION,
  store_id                 UUID NOT NULL REFERENCES public.stores(id) ON DELETE NO ACTION,
  paystack_reference       TEXT NOT NULL,
  amount_total_kobo        BIGINT NOT NULL,
  amount_paystack_kobo     BIGINT NOT NULL,
  amount_storehouse_kobo   BIGINT NOT NULL,
  amount_vendor_kobo       BIGINT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','disputed','refunded')),
  requires_review          BOOLEAN NOT NULL DEFAULT FALSE,
  review_status            TEXT NOT NULL DEFAULT 'not_required'
    CHECK (review_status IN ('not_required','pending','approved','rejected')),
  reviewer_id              UUID REFERENCES auth.users(id) ON DELETE NO ACTION,
  reviewed_at              TIMESTAMPTZ,
  review_notes             TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at               TIMESTAMPTZ,

  -- Belt-and-braces guard. The edge function (§4.2 step 5) asserts this same
  -- invariant before INSERT; this CHECK ensures the table cannot end up in a
  -- bad state via direct SQL or a future code path that forgets the assert.
  CONSTRAINT split_tx_amount_invariant CHECK (
    amount_total_kobo = amount_paystack_kobo + amount_storehouse_kobo + amount_vendor_kobo
  )
);

COMMENT ON TABLE public.paystack_split_transactions IS
  'Per-transaction fee ledger. The four amount columns are computed by '
  'initiate-storefront-payment (§4.2 step 5) using CAPPED storehouse take, '
  'and MUST satisfy: amount_total_kobo = amount_paystack_kobo + '
  'amount_storehouse_kobo + amount_vendor_kobo. Edge function asserts this.';

-- -----------------------------------------------------------------------------
-- 3.1.7  paystack_webhook_events
-- -----------------------------------------------------------------------------
-- Idempotency. processed_at NULL means "claim placed but not finished" — the
-- webhook handler uses claim-then-check on this column, see §4.3.
CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference       TEXT NOT NULL,
  event_type               TEXT NOT NULL,
  payload                  JSONB NOT NULL,
  processed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT paystack_webhook_events_uniq UNIQUE (paystack_reference, event_type)
);

-- -----------------------------------------------------------------------------
-- 3.1.8  platform_fee_config
-- -----------------------------------------------------------------------------
-- Single source of truth for fee math. No hard-coded rates in edge functions —
-- they all read from this table.
CREATE TABLE IF NOT EXISTS public.platform_fee_config (
  tier                                    TEXT PRIMARY KEY
    CHECK (tier IN ('free','starter','pro')),
  basis_points                            INTEGER NOT NULL,
  fixed_fee_kobo                          BIGINT NOT NULL DEFAULT 0,
  cap_kobo                                BIGINT NOT NULL,
  monthly_volume_cap_kobo                 BIGINT,
  paystack_wholesale_bps                  INTEGER NOT NULL DEFAULT 150,
  large_transaction_review_threshold_kobo BIGINT NOT NULL,
  active                                  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed pricing per §2 worked examples.
-- WARNING: §13.1 of the design doc flags that paystack_wholesale_bps may need
-- to be applied against `amount` rather than `subtotal` — verify in Session 4
-- before live transactions.
INSERT INTO public.platform_fee_config (
  tier, basis_points, cap_kobo, monthly_volume_cap_kobo,
  paystack_wholesale_bps, large_transaction_review_threshold_kobo
) VALUES
  -- Free monthly cap: ₦500,000 (50,000,000 kobo) — bumped from ₦300K during review.
  ('free',    100, 1000000, 50000000, 150, 50000000),
  ('starter',  50, 1000000, NULL,     150, 50000000),
  ('pro',       0, 1000000, NULL,     150, 50000000)
ON CONFLICT (tier) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3.1.9  vendor_velocity_limits
-- -----------------------------------------------------------------------------
-- Rows are NOT auto-created by this migration. They're inserted by the
-- `create-paystack-subaccount` edge function during vendor onboarding (after
-- KYC approval + cooling period clears), with daily_cap_kobo defaulted to
-- ₦200,000 (days 1-7 cap) and current_*_resets_at set to next-WAT-midnight /
-- next-WAT-month-start.
--
-- A nightly cron (Session 5+) advances days_since_approval and bumps
-- daily_cap_kobo according to the schedule in §2 of the design doc:
--   - Days 1-7:  ₦200,000/day
--   - Days 8-30: ₦500,000/day
--   - Day 31+:   no daily cap
--
-- If `initiate-storefront-payment` finds no row for a store, it skips the
-- velocity check (the absence of a row means "not yet onboarded for splits"
-- and the surrounding paystack_subaccounts_enabled check would have already
-- rejected the request).
CREATE TABLE IF NOT EXISTS public.vendor_velocity_limits (
  store_id                  UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE NO ACTION,
  days_since_approval       INTEGER,
  daily_cap_kobo            BIGINT NOT NULL,
  monthly_cap_kobo          BIGINT,
  current_day_volume_kobo   BIGINT NOT NULL DEFAULT 0,
  current_day_resets_at     TIMESTAMPTZ NOT NULL,
  current_month_volume_kobo BIGINT NOT NULL DEFAULT 0,
  current_month_resets_at   TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3.2  Additive nullable columns on existing `stores` table
-- =============================================================================
-- ALL nullable, ALL with safe defaults. No ALTER COLUMN, no DROP COLUMN.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS paystack_subaccount_id      UUID REFERENCES public.paystack_subaccounts(id) ON DELETE NO ACTION,
  ADD COLUMN IF NOT EXISTS kyc_status                  TEXT DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started','submitted','approved','rejected','frozen')),
  ADD COLUMN IF NOT EXISTS kyc_submitted_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_approved_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejected_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason        TEXT,
  ADD COLUMN IF NOT EXISTS frozen                      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frozen_at                   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frozen_reason               TEXT,
  ADD COLUMN IF NOT EXISTS frozen_by                   UUID REFERENCES auth.users(id) ON DELETE NO ACTION,
  ADD COLUMN IF NOT EXISTS paystack_subaccounts_enabled BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- 3.3  Indexes (NEW tables only — guardrail #4)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_primary_store_id        ON public.orders(primary_store_id);
CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference      ON public.orders(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status_created          ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email          ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_access_token            ON public.orders(customer_access_token);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id           ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id           ON public.order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id         ON public.order_items(product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paystack_subaccounts_store_id  ON public.paystack_subaccounts(store_id);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_store_id            ON public.vendor_kyc(store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_status              ON public.vendor_kyc(status);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_store_id         ON public.bank_accounts(store_id);

CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_order_id     ON public.paystack_split_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_store_id     ON public.paystack_split_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_reference    ON public.paystack_split_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_review       ON public.paystack_split_transactions(review_status, requires_review)
  WHERE requires_review = TRUE;

CREATE INDEX IF NOT EXISTS idx_paystack_webhook_events_lookup ON public.paystack_webhook_events(paystack_reference, event_type);

CREATE INDEX IF NOT EXISTS idx_vendor_velocity_resets         ON public.vendor_velocity_limits(current_day_resets_at);

-- =============================================================================
-- 3.4  RLS policies (NEW tables only — guardrail #3)
-- =============================================================================

-- ---- orders ----
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Vendor branch: store owner sees orders for their primary_store_id.
CREATE POLICY orders_vendor_select ON public.orders
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.primary_store_id
      AND stores.user_id = auth.uid()::text
  ));

-- Customer branch: presenter of customer_access_token via app.access_token GUC.
-- The current_setting(..., true) form returns NULL if not set (vs. throwing),
-- so unauthenticated requests with no GUC simply don't match this policy.
-- Storefront customers are anonymous in Session 1, so there is no JWT path.
-- If a future session introduces authenticated customers, add a parallel
-- policy reading customer_access_token from a JWT claim.
CREATE POLICY orders_token_select ON public.orders
  FOR SELECT
  USING (
    customer_access_token::text = current_setting('app.access_token', true)
  );

-- INSERT/UPDATE/DELETE: deny all. Service role bypasses RLS, so edge functions
-- still write. We don't need explicit deny policies — absence of policy = deny.

-- ---- order_items ----
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_vendor_select ON public.order_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = order_items.store_id
      AND stores.user_id = auth.uid()::text
  ));

CREATE POLICY order_items_token_select ON public.order_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.customer_access_token::text = current_setting('app.access_token', true)
  ));

-- ---- paystack_subaccounts ----
ALTER TABLE public.paystack_subaccounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY paystack_subaccounts_vendor_select ON public.paystack_subaccounts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = paystack_subaccounts.store_id
      AND stores.user_id = auth.uid()::text
  ));

-- ---- vendor_kyc ----
ALTER TABLE public.vendor_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_kyc_vendor_select ON public.vendor_kyc
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = vendor_kyc.store_id
      AND stores.user_id = auth.uid()::text
  ));

-- ---- bank_accounts ----
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_vendor_select ON public.bank_accounts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = bank_accounts.store_id
      AND stores.user_id = auth.uid()::text
  ));

-- ---- paystack_split_transactions ----
ALTER TABLE public.paystack_split_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY split_tx_vendor_select ON public.paystack_split_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = paystack_split_transactions.store_id
      AND stores.user_id = auth.uid()::text
  ));

-- TECH DEBT (Session 3): hard-coded reviewer UUID — see §3.4 of the design doc.
-- Replace this with a `reviewers` table lookup in Session 3 before opening
-- review access to anyone besides Paul.
-- BEFORE APPLYING: replace 00000000-0000-0000-0000-000000000000 with the
-- result of: SELECT id FROM auth.users WHERE email = 'ekhatorpaulosayi@gmail.com';
--
-- Reviewer needs SELECT (to see the row before deciding) and UPDATE (to
-- approve/reject). They MUST NOT be able to INSERT new split rows or DELETE
-- existing ones — those would let a reviewer fabricate or hide payments.
-- Splitting into two policies makes the intent explicit and resilient to
-- future "FOR ALL" copy-paste mistakes.
CREATE POLICY split_tx_reviewer_select ON public.paystack_split_transactions
  FOR SELECT
  USING (auth.uid()::text = 'dffba89b-869d-422a-a542-2e2494850b44');

CREATE POLICY split_tx_reviewer_update ON public.paystack_split_transactions
  FOR UPDATE
  USING (auth.uid()::text = 'dffba89b-869d-422a-a542-2e2494850b44')
  WITH CHECK (auth.uid()::text = 'dffba89b-869d-422a-a542-2e2494850b44');

-- ---- operational tables: deny all to authenticated/anon ----
-- paystack_webhook_events, platform_fee_config, vendor_velocity_limits.
-- Service role bypasses RLS so edge functions still work.
ALTER TABLE public.paystack_webhook_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_velocity_limits   ENABLE ROW LEVEL SECURITY;
-- No policies created → all SELECT/INSERT/UPDATE/DELETE denied for non-service roles.

-- =============================================================================
-- Done.
-- =============================================================================
COMMIT;
