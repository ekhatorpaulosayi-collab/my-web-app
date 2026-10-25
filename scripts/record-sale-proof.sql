-- Local proof for record_sale. Not for the live database.
-- Creates a throwaway schema, installs the function body from
-- 20261025_12_record_sale.sql's expectations, and checks:
--   * a valid sale writes timetz + uuid (no 42804)
--   * a bad client id is invalid_client_sale_id (23514), not 22P02
--   * an unknown product is rejected
--   * a price that is not the catalogue price or its discount is rejected
--   * stock is not taken below zero
--   * a repeat client_sale_id does not drop stock twice
-- The migration file itself is executed after these stubs exist.
BEGIN;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql AS $$ SELECT '11111111-1111-1111-1111-111111111111'::uuid $$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  quantity integer,
  selling_price bigint,
  discount_price bigint
);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  product_id text,
  product_name text,
  quantity integer,
  unit_price bigint,
  total_amount bigint,
  discount_amount bigint,
  final_amount bigint,
  customer_name text,
  customer_phone text,
  customer_email text,
  payment_method text,
  payment_status text,
  amount_paid bigint,
  amount_due bigint,
  sale_date date,
  sale_time timetz,
  sale_channel text,
  notes text,
  client_sale_id uuid
);
CREATE UNIQUE INDEX sales_client_sale_id_uniq ON public.sales (client_sale_id);

CREATE OR REPLACE FUNCTION public.acting_staff_role() RETURNS text
LANGUAGE sql AS $$ SELECT NULL::text $$;

COMMIT;
