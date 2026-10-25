#!/usr/bin/env bash
# Apply each DEPLOY_ORDER rollback block after its forward SQL, on a
# throwaway local database. Not for the live database.
# Fenced blocks: steps 7, 9, 11, 13, 14, and 15.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)

run_db() {
  local name="$1"
  local db="storehouse_rb_${name}_$$"
  shift
  sudo -u postgres createdb "$db"
  if ! "${PSQL[@]}" -d "$db" "$@"; then
    sudo -u postgres dropdb --if-exists "$db" >/dev/null 2>&1 || true
    echo "ROLLBACK ${name}: failed" >&2
    exit 1
  fi
  sudo -u postgres dropdb --if-exists "$db" >/dev/null 2>&1 || true
  echo "ROLLBACK ${name}:0"
}

roles_sql="
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth;
DO \$\$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END \$\$;
DO \$\$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END \$\$;
DO \$\$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END \$\$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS \$\$ SELECT '11111111-1111-1111-1111-111111111111'::uuid \$\$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS \$\$ SELECT 'authenticated'::text \$\$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS \$\$ SELECT '{}'::jsonb \$\$;
"

# Step 7 — storefront stock function
run_db step7 -v ON_ERROR_STOP=1 <<SQL
${roles_sql}
\i ${ROOT}/supabase/migrations/20261025_06_storefront_inventory.sql
DROP FUNCTION IF EXISTS public.apply_storefront_inventory(text);
DROP FUNCTION IF EXISTS public.decrement_product_quantity(uuid, integer);
DROP TABLE IF EXISTS public.storefront_fulfillments;
SQL

# Step 9 — stock queue
run_db step9 -v ON_ERROR_STOP=1 <<SQL
${roles_sql}
\i ${ROOT}/supabase/migrations/20261025_10_inventory_queue.sql
\i ${ROOT}/supabase/migrations/20261025_13_inventory_queue_processor.sql
DROP FUNCTION IF EXISTS public.process_storefront_inventory_queue(integer);
DROP TABLE IF EXISTS public.storefront_inventory_alerts;
DROP TABLE IF EXISTS public.storefront_inventory_queue;
SQL

# Step 11 — dashboard, staff, record_sale, custom domain
run_db step11 -v ON_ERROR_STOP=1 <<SQL
${roles_sql}
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_owner_uid uuid,
  name text,
  role text,
  pin text,
  is_active boolean
);
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  business_name text,
  store_slug text,
  subdomain text,
  is_public boolean,
  whatsapp_number text,
  bank_name text,
  account_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  custom_domain text,
  domain_verification_token text
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text,
  category text,
  quantity integer,
  selling_price bigint,
  cost_price bigint,
  discount_price bigint,
  image_url text,
  is_public boolean,
  is_active boolean,
  is_featured boolean,
  low_stock_threshold integer,
  barcode text
);
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  product_id text,
  product_name text,
  quantity integer,
  unit_price bigint,
  discount_amount bigint,
  final_amount bigint,
  payment_method text,
  customer_name text,
  customer_phone text,
  notes text,
  sale_date date,
  sale_time timetz,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
CREATE TABLE public.expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_owner_all ON public.sales FOR ALL USING (true) WITH CHECK (true);
\i ${ROOT}/supabase/migrations/20261025_08_dashboard_summary.sql
\i ${ROOT}/supabase/migrations/20261025_09_staff_sessions.sql
\i ${ROOT}/supabase/migrations/20261025_12_record_sale.sql
\i ${ROOT}/supabase/migrations/20261025_14_custom_domain_verification.sql
-- Active staff session cannot insert into sales. record_sale is the path.
CREATE OR REPLACE FUNCTION public.acting_staff_role() RETURNS text
LANGUAGE sql AS \$\$ SELECT 'cashier'::text \$\$;
GRANT INSERT ON public.sales TO authenticated;
SET ROLE authenticated;
DO \$\$
BEGIN
  INSERT INTO public.sales (user_id) VALUES ('11111111-1111-1111-1111-111111111111');
  RAISE EXCEPTION 'staff insert should have failed';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END \$\$;
RESET ROLE;
-- The old order fails while the trigger and the policies still exist.
DO \$\$
BEGIN
  DROP FUNCTION public.protect_custom_domain_columns();
  RAISE EXCEPTION 'function drop should have failed';
EXCEPTION WHEN dependent_objects_still_exist THEN
  NULL;
END \$\$;
DO \$\$
BEGIN
  DROP FUNCTION public.acting_staff_role();
  RAISE EXCEPTION 'function drop should have failed';
EXCEPTION WHEN dependent_objects_still_exist THEN
  NULL;
END \$\$;
DROP TRIGGER IF EXISTS stores_protect_custom_domain ON public.stores;
DROP TRIGGER IF EXISTS stores_protect_staff_price_setting ON public.stores;
DROP POLICY IF EXISTS sales_cashier_no_read ON public.sales;
DROP POLICY IF EXISTS sales_cashier_no_write ON public.sales;
DROP POLICY IF EXISTS sales_cashier_no_delete ON public.sales;
DROP POLICY IF EXISTS sales_staff_no_direct_insert ON public.sales;
DROP POLICY IF EXISTS customers_cashier_no_read ON public.customers;
DROP POLICY IF EXISTS expenses_cashier_no_read ON public.expenses;
DROP POLICY IF EXISTS invoices_cashier_no_read ON public.invoices;
DROP POLICY IF EXISTS products_staff_no_edit ON public.products;
DROP POLICY IF EXISTS products_staff_no_delete ON public.products;
DROP POLICY IF EXISTS products_cashier_no_insert ON public.products;
DROP FUNCTION IF EXISTS public.record_sale(text, text, integer, bigint, bigint, text, text, text, text, text, text, text, date, text, text, bigint, bigint);
DROP FUNCTION IF EXISTS public.confirm_custom_domain_verified(uuid, text, text);
DROP FUNCTION IF EXISTS public.set_store_custom_domain(text);
DROP FUNCTION IF EXISTS public.get_sales_summary(uuid, date, date);
DROP FUNCTION IF EXISTS public.dashboard_bootstrap();
DROP FUNCTION IF EXISTS public.begin_staff_session(text);
DROP FUNCTION IF EXISTS public.end_staff_session(text);
DROP FUNCTION IF EXISTS public.get_acting_staff();
DROP FUNCTION IF EXISTS public.protect_staff_price_setting();
DROP FUNCTION IF EXISTS public.acting_staff_role();
DROP FUNCTION IF EXISTS public.protect_custom_domain_columns();
DROP INDEX IF EXISTS public.stores_custom_domain_uniq;
DROP TABLE IF EXISTS public.staff_pin_attempts;
DROP TABLE IF EXISTS public.staff_active_sessions;
GRANT UPDATE ON public.stores TO authenticated;
SQL

# Step 13 — restore browser stock-write grants
run_db step13 -v ON_ERROR_STOP=1 <<SQL
${roles_sql}
CREATE TABLE public.promo_code_usage (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE FUNCTION public.decrement_variant_quantity(uuid, integer) RETURNS void
LANGUAGE sql AS \$\$ SELECT NULL::void \$\$;
CREATE FUNCTION public.upsert_customer(text, text, text, text, bigint, date) RETURNS void
LANGUAGE sql AS \$\$ SELECT NULL::void \$\$;
\i ${ROOT}/supabase/migrations/20261025_07_revoke_storefront_client_writes.sql
GRANT EXECUTE ON FUNCTION public.decrement_variant_quantity(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer(text, text, text, text, bigint, date) TO anon, authenticated;
SQL

# Step 14 — chat policies
run_db step14 -v ON_ERROR_STOP=1 <<SQL
${roles_sql}
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text
);
CREATE TABLE public.ai_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text,
  agent_id uuid
);
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid
);
CREATE FUNCTION public.owns_conversation(uuid) RETURNS boolean
LANGUAGE sql AS \$\$ SELECT true \$\$;
\i ${ROOT}/supabase/migrations/20261025_04b_chat_policies_stage_b.sql
DROP POLICY IF EXISTS conv_owner_select ON public.ai_chat_conversations;
DROP POLICY IF EXISTS conv_owner_delete ON public.ai_chat_conversations;
DROP POLICY IF EXISTS msg_owner_select ON public.ai_chat_messages;
DROP POLICY IF EXISTS msg_owner_insert ON public.ai_chat_messages;
DROP POLICY IF EXISTS msg_owner_update ON public.ai_chat_messages;
DROP POLICY IF EXISTS msg_owner_delete ON public.ai_chat_messages;
CREATE POLICY temp_allow_all_conversations ON public.ai_chat_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY temp_allow_all_messages ON public.ai_chat_messages FOR ALL USING (true) WITH CHECK (true);
SQL

# Step 15 — affiliate signup and AI cap
run_db step15 -v ON_ERROR_STOP=1 <<SQL
${roles_sql}
\i ${ROOT}/supabase/migrations/20261025_11_affiliate_signup_and_ai_cap.sql
DROP FUNCTION IF EXISTS public.attribute_affiliate_signup(uuid, uuid);
DROP TABLE IF EXISTS public.affiliate_attributions;
DROP FUNCTION IF EXISTS public.reserve_ai_chat_spend(numeric, numeric);
DROP TABLE IF EXISTS public.ai_chat_daily_spend;
SQL

echo "ROLLBACK_ALL:0"
