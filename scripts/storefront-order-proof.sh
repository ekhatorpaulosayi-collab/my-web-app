#!/usr/bin/env bash
# Local proof for a storefront order with no variant. Not for the live database.
# A product with quantity 10 and one line of quantity 2 ends at 8, the
# customer row is written once, and a second apply does not move stock.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)
db="storehouse_sf_$$"
sudo -u postgres createdb "$db"
cleanup() { sudo -u postgres dropdb --if-exists "$db" >/dev/null 2>&1 || true; }
trap cleanup EXIT

"${PSQL[@]}" -d "$db" <<SQL
DO \$\$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END \$\$;
DO \$\$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END \$\$;
DO \$\$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END \$\$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY,
  quantity integer NOT NULL
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference text UNIQUE,
  notes text
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid,
  quantity integer NOT NULL
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  customer_name text,
  customer_phone text,
  customer_email text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent bigint NOT NULL DEFAULT 0,
  last_order_date date,
  UNIQUE (user_id, customer_phone)
);

-- Live signature is text, text, text, text, bigint, date. This stub
-- stands in for the function that already exists on live.
CREATE FUNCTION public.upsert_customer(
  p_user_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_order_amount bigint,
  p_order_date date
) RETURNS uuid
LANGUAGE plpgsql
AS \$\$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.customers (
    user_id, customer_name, customer_phone, customer_email,
    total_orders, total_spent, last_order_date
  ) VALUES (
    p_user_id, p_customer_name, p_customer_phone, p_customer_email,
    1, p_order_amount, p_order_date
  )
  ON CONFLICT (user_id, customer_phone) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    total_orders = public.customers.total_orders + 1,
    total_spent = public.customers.total_spent + EXCLUDED.total_spent,
    last_order_date = EXCLUDED.last_order_date
  RETURNING id INTO v_id;
  RETURN v_id;
END;
\$\$;

INSERT INTO public.products (id, quantity) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10);

INSERT INTO public.orders (id, paystack_reference) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TEST-ord-no-variant');

INSERT INTO public.order_items (order_id, product_id, quantity) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2);
SQL

"${PSQL[@]}" -d "$db" -f "${ROOT}/supabase/migrations/20261025_06_storefront_inventory.sql"

"${PSQL[@]}" -d "$db" <<'SQL'
-- The order path: stock first, then the customer. No variant on the line.
SELECT public.apply_storefront_inventory('TEST-ord-no-variant');
SELECT public.upsert_customer(
  '11111111-1111-1111-1111-111111111111',
  'Ada Okonkwo',
  '08030000000',
  'ada@example.com',
  5000,
  CURRENT_DATE
);

DO $$
DECLARE
  v_qty integer;
  v_orders integer;
  v_name text;
BEGIN
  SELECT quantity INTO v_qty FROM public.products
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF v_qty IS DISTINCT FROM 8 THEN
    RAISE EXCEPTION 'stock is %, expected 8', v_qty;
  END IF;
  SELECT total_orders, customer_name INTO v_orders, v_name
    FROM public.customers
   WHERE user_id = '11111111-1111-1111-1111-111111111111'
     AND customer_phone = '08030000000';
  IF v_orders IS DISTINCT FROM 1 OR v_name IS DISTINCT FROM 'Ada Okonkwo' THEN
    RAISE EXCEPTION 'customer was not upserted (orders=%, name=%)', v_orders, v_name;
  END IF;
END $$;

-- Replay is idempotent: the fulfillment row blocks a second decrement.
SELECT public.apply_storefront_inventory('TEST-ord-no-variant');

DO $$
DECLARE v_qty integer;
BEGIN
  SELECT quantity INTO v_qty FROM public.products
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF v_qty IS DISTINCT FROM 8 THEN
    RAISE EXCEPTION 'replay moved stock to %', v_qty;
  END IF;
END $$;

-- A shortfall raises and does not write a fulfillment row.
INSERT INTO public.products (id, quantity) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 1);
INSERT INTO public.orders (id, paystack_reference) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'TEST-ord-short');
INSERT INTO public.order_items (order_id, product_id, quantity) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2);

DO $$
BEGIN
  PERFORM public.apply_storefront_inventory('TEST-ord-short');
  RAISE EXCEPTION 'expected insufficient_stock';
EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE '%insufficient_stock%' THEN
    RAISE;
  END IF;
END $$;

DO $$
DECLARE v_qty integer; v_claim int;
BEGIN
  SELECT quantity INTO v_qty FROM public.products
   WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  IF v_qty IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'short order changed stock to %', v_qty;
  END IF;
  SELECT count(*) INTO v_claim FROM public.storefront_fulfillments
   WHERE paystack_reference = 'TEST-ord-short';
  IF v_claim <> 0 THEN
    RAISE EXCEPTION 'short order left a fulfillment row';
  END IF;
END $$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.decrement_product_quantity(uuid,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute decrement_product_quantity';
  END IF;
  IF has_function_privilege('authenticated', 'public.decrement_product_quantity(uuid,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute decrement_product_quantity';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.decrement_product_quantity(uuid,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute decrement_product_quantity';
  END IF;
  IF has_function_privilege('anon', 'public.decrement_storefront_lines(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute decrement_storefront_lines';
  END IF;
  IF has_function_privilege('authenticated', 'public.decrement_storefront_lines(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute decrement_storefront_lines';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.decrement_storefront_lines(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute decrement_storefront_lines';
  END IF;
END $$;

-- Two lines, one call. The second line is short. A retry of that same
-- call must not keep the first line's decrement. Then one successful
-- call moves both lines once.
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY,
  quantity integer NOT NULL
);

INSERT INTO public.products (id, quantity) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 1),
  ('99999999-9999-9999-9999-999999999999', 9);
INSERT INTO public.product_variants (id, quantity) VALUES
  ('88888888-8888-8888-8888-888888888888', 1);

DO $$
DECLARE
  v_a integer;
  v_b integer;
BEGIN
  BEGIN
    PERFORM public.decrement_storefront_lines($lines$[
      {"product_id":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","variant_id":null,"quantity":2},
      {"product_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","variant_id":null,"quantity":2}
    ]$lines$::jsonb);
    RAISE EXCEPTION 'expected insufficient_stock on the first multi-item call';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM NOT LIKE '%insufficient_stock%' THEN
      RAISE;
    END IF;
  END;

  SELECT quantity INTO v_a FROM public.products
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  SELECT quantity INTO v_b FROM public.products
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  IF v_a IS DISTINCT FROM 5 OR v_b IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'first shortfall left stock at % and %', v_a, v_b;
  END IF;

  BEGIN
    PERFORM public.decrement_storefront_lines($lines$[
      {"product_id":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","variant_id":null,"quantity":2},
      {"product_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","variant_id":null,"quantity":2}
    ]$lines$::jsonb);
    RAISE EXCEPTION 'expected insufficient_stock on the retry';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM NOT LIKE '%insufficient_stock%' THEN
      RAISE;
    END IF;
  END;

  SELECT quantity INTO v_a FROM public.products
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  SELECT quantity INTO v_b FROM public.products
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  IF v_a IS DISTINCT FROM 5 OR v_b IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'retry left stock at % and %', v_a, v_b;
  END IF;

  UPDATE public.products SET quantity = 4
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  PERFORM public.decrement_storefront_lines($lines$[
    {"product_id":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","variant_id":null,"quantity":2},
    {"product_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","variant_id":null,"quantity":2}
  ]$lines$::jsonb);

  SELECT quantity INTO v_a FROM public.products
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  SELECT quantity INTO v_b FROM public.products
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  IF v_a IS DISTINCT FROM 3 OR v_b IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'successful multi-item call left stock at % and %', v_a, v_b;
  END IF;
END $$;

-- A later variant shortfall undoes the earlier product line.
DO $$
DECLARE
  v_product integer;
  v_variant integer;
BEGIN
  BEGIN
    PERFORM public.decrement_storefront_lines($lines$[
      {"product_id":"99999999-9999-9999-9999-999999999999","quantity":2},
      {"product_id":"99999999-9999-9999-9999-999999999999","variant_id":"88888888-8888-8888-8888-888888888888","quantity":4}
    ]$lines$::jsonb);
    RAISE EXCEPTION 'expected insufficient_stock for the variant line';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM NOT LIKE '%insufficient_stock%' THEN
      RAISE;
    END IF;
  END;

  SELECT quantity INTO v_product FROM public.products
   WHERE id = '99999999-9999-9999-9999-999999999999';
  SELECT quantity INTO v_variant FROM public.product_variants
   WHERE id = '88888888-8888-8888-8888-888888888888';
  IF v_product IS DISTINCT FROM 9 OR v_variant IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'variant shortfall left stock at % and %', v_product, v_variant;
  END IF;
END $$;
SQL

echo "STOREFRONT_ORDER:0"
