-- Minimum objects so the October migrations can apply on an empty database.
-- This is not production. It exists so CI can prove the SQL files run.
CREATE SCHEMA IF NOT EXISTS vault;
CREATE TABLE IF NOT EXISTS vault.decrypted_secrets (
  name text PRIMARY KEY,
  decrypted_secret text
);
INSERT INTO vault.decrypted_secrets (name, decrypted_secret)
VALUES ('service_role_key', repeat('k', 40)), ('cron_secret', repeat('c', 24))
ON CONFLICT (name) DO NOTHING;
CREATE SCHEMA IF NOT EXISTS cron;
CREATE TABLE IF NOT EXISTS cron.job (
  jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jobname text,
  schedule text,
  command text
);
INSERT INTO cron.job (jobname, schedule)
SELECT 'send-daily-whatsapp-reports', '0 6 * * *'
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-whatsapp-reports');
CREATE OR REPLACE FUNCTION cron.unschedule(p_jobname text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM cron.job WHERE jobname = p_jobname;
END $$;
CREATE OR REPLACE FUNCTION cron.schedule(p_jobname text, p_schedule text, p_command text) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
  v_id bigint;
BEGIN
  DELETE FROM cron.job WHERE jobname = p_jobname;
  INSERT INTO cron.job (jobname, schedule, command) VALUES (p_jobname, p_schedule, p_command)
  RETURNING jobid INTO v_id;
  RETURN v_id;
END $$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text,
  business_name text,
  store_type text,
  business_type_prompt_dismissed boolean
);

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  business_name text,
  store_slug text,
  subdomain text,
  is_public boolean DEFAULT true,
  custom_domain text,
  custom_domain_verified boolean DEFAULT false,
  domain_verification_token text,
  payment_methods jsonb DEFAULT '[]'::jsonb,
  bank_name text,
  account_number text,
  account_name text,
  kyc_status text DEFAULT 'not_started',
  frozen boolean DEFAULT false,
  frozen_at timestamptz,
  frozen_reason text,
  frozen_by uuid,
  paystack_subaccounts_enabled boolean DEFAULT false,
  paystack_subaccount_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text,
  selling_price bigint,
  discount_price bigint,
  cost_price bigint,
  quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true,
  image_url text
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  user_id text,
  quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  price_override bigint
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference text,
  primary_store_id uuid,
  notes text,
  status text,
  total_amount_kobo bigint
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  store_id uuid,
  product_id uuid,
  quantity integer,
  product_name text
);

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  discount_amount bigint DEFAULT 0,
  client_sale_id uuid
);

CREATE TABLE IF NOT EXISTS public.ai_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  store_id uuid,
  session_id text,
  takeover_status text,
  is_agent_active boolean,
  agent_id uuid,
  chat_status text,
  waiting_for_owner_since timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  role text,
  content text,
  is_agent_message boolean,
  agent_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Old signature returns uuid, so 20261030_01 must DROP it before CREATE.
CREATE OR REPLACE FUNCTION public.send_agent_message(uuid, text, uuid)
RETURNS uuid
LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;

CREATE TABLE IF NOT EXISTS public.contribution_groups (id uuid PRIMARY KEY, user_id text, share_code text);
CREATE TABLE IF NOT EXISTS public.contribution_members (id uuid PRIMARY KEY, group_id uuid, phone text);
CREATE TABLE IF NOT EXISTS public.contribution_payments (id uuid PRIMARY KEY, group_id uuid);
CREATE TABLE IF NOT EXISTS public.contribution_payouts (
  id uuid PRIMARY KEY,
  group_id uuid,
  member_id uuid
);
CREATE TABLE IF NOT EXISTS public.payment_transactions (id uuid PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY,
  user_id text,
  invoice_number text,
  status text DEFAULT 'draft',
  viewed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY,
  invoice_id uuid,
  line_order integer DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  code text,
  used_count integer DEFAULT 0
);
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY,
  user_id uuid,
  affiliate_code text,
  bank_account_number text,
  bank_name text,
  account_name text,
  total_earnings_kobo bigint NOT NULL DEFAULT 0,
  pending_earnings_kobo bigint NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  payouts_unlocked boolean NOT NULL DEFAULT false
);
ALTER TABLE public.affiliates ALTER COLUMN bank_account_number SET NOT NULL;
ALTER TABLE public.affiliates ALTER COLUMN bank_name SET NOT NULL;
ALTER TABLE public.affiliates ALTER COLUMN account_name SET NOT NULL;
ALTER TABLE public.affiliates ALTER COLUMN affiliate_code SET NOT NULL;
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id uuid PRIMARY KEY,
  tier_id text,
  ai_chats_used_this_month integer DEFAULT 0,
  ai_chats_reset_at timestamptz,
  grandfathered boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  store_owner_uid text,
  pin text
);

CREATE TABLE IF NOT EXISTS public.green_api_pool (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

CREATE TABLE IF NOT EXISTS public.ai_chat_rate_limits (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

CREATE TABLE IF NOT EXISTS public.whatsapp_debug_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  store_user_id text,
  customer_name text,
  rating integer,
  review_title text,
  review_text text,
  is_verified_purchase boolean,
  status text,
  store_response text,
  store_response_date timestamptz,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE VIEW public.product_variants_view AS SELECT 1 AS id;
CREATE OR REPLACE VIEW public.invoice_summary AS SELECT 1 AS id;
CREATE OR REPLACE VIEW public.product_review_stats AS SELECT 1 AS id;
CREATE OR REPLACE VIEW public.store_conversations AS SELECT 1 AS id;
CREATE OR REPLACE VIEW public.member_payment_status AS SELECT 1 AS id;

CREATE TABLE IF NOT EXISTS public.low_stock_products (id uuid);

CREATE TABLE IF NOT EXISTS public.daily_sales_summary (id uuid);

CREATE TABLE IF NOT EXISTS public.agent_takeover_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid
);
CREATE TABLE IF NOT EXISTS public.chat_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text
);
CREATE TABLE IF NOT EXISTS public.login_attempts (id uuid);

-- Live-shaped checks. The October repair files widen these; the tests run
-- after that widening and must still satisfy every constraint that remains.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_access_token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'storefront';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));
ALTER TABLE public.orders ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_phone SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN total_amount_kobo SET NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_total_amount_positive;
ALTER TABLE public.orders ADD CONSTRAINT orders_total_amount_positive CHECK (total_amount_kobo > 0);

CREATE TABLE IF NOT EXISTS public.paystack_split_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  paystack_reference text NOT NULL,
  amount_total_kobo bigint NOT NULL,
  amount_paystack_kobo bigint NOT NULL,
  amount_storehouse_kobo bigint NOT NULL,
  amount_vendor_kobo bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  CONSTRAINT paystack_split_transactions_status_check
    CHECK (status IN ('pending', 'success', 'failed', 'disputed', 'refunded')),
  CONSTRAINT split_tx_amount_invariant
    CHECK (amount_total_kobo = amount_paystack_kobo + amount_storehouse_kobo + amount_vendor_kobo)
);
