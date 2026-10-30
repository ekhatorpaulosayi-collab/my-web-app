#!/usr/bin/env bash
# Local proof for migrations 16, 17, and 18. Not for the live database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="storehouse_slug_$$"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)

sudo -u postgres createdb "$DB"
cleanup() { sudo -u postgres dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

"${PSQL[@]}" -d "$DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql AS $$ SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $$;

CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  store_slug text
);
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  business_name text,
  store_slug text,
  subdomain text,
  is_public boolean NOT NULL DEFAULT false,
  bank_name text,
  account_number text,
  account_name text,
  payment_methods jsonb
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  name text
);
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id text NOT NULL,
  is_active boolean DEFAULT true,
  variant_name text
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_public_read ON public.stores
  FOR SELECT TO anon
  USING (is_public = true);
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_public = true);
CREATE POLICY variants_select_own ON public.product_variants
  FOR SELECT USING (user_id = auth.uid()::text);
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;

INSERT INTO public.users (id, store_slug)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'taken-on-users-only');

-- A long slug saved before the guard. Later saves must keep it.
INSERT INTO public.stores (id, user_id, business_name, store_slug, is_public)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'owner-long',
  'Long',
  repeat('a', 38),
  true
);

-- Existing hosts. The guard must leave them alone until the column changes.
INSERT INTO public.stores (id, user_id, business_name, store_slug, subdomain, is_public)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'owner-234',
  'Numeric host',
  'path-shop',
  '234',
  true
);
INSERT INTO public.stores (id, user_id, business_name, store_slug, is_public)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'owner-case',
  'Case',
  'OldShop',
  true
);

-- Already has a bank-transfer method. Step 21a must not add a second one.
INSERT INTO public.stores (
  id, user_id, business_name, store_slug, is_public,
  bank_name, account_number, account_name, payment_methods
)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'owner-already',
  'Already',
  'already-bank',
  true,
  'GTBank',
  '1111111111',
  'Already Owner',
  '[{"id":"keep-me","type":"bank","enabled":true,"account_number":"1111111111","account_name":"Already Owner","bank_name":"GTBank"}]'::jsonb
);
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_16_stores_public_read.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_17_store_slug_redirects.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_18_slug_guard.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_19_public_store_columns.sql"

"${PSQL[@]}" -d "$DB" <<'SQL'
DO $$
DECLARE
  roles text;
  generated text;
  osayi uuid;
  resolved uuid;
  seen integer;
BEGIN
  SELECT string_agg(r.rolname, ',' ORDER BY r.rolname)
    INTO roles
    FROM pg_policy p
    JOIN pg_roles r ON r.oid = ANY (p.polroles)
   WHERE p.polname = 'stores_public_read';
  IF roles IS DISTINCT FROM 'anon,authenticated' THEN
    RAISE EXCEPTION 'public read roles are %', roles;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'remember_store_slug') THEN
    RAISE EXCEPTION 'remember_store_slug is still callable';
  END IF;

  IF (SELECT pg_get_functiondef('public.generate_store_slug(text)'::regprocedure) NOT LIKE '%SECURITY DEFINER%') THEN
    RAISE EXCEPTION 'generate_store_slug cannot see private stores';
  END IF;

  generated := public.generate_store_slug('taken-on-users-only');
  IF generated IS DISTINCT FROM 'taken-on-users-only' THEN
    RAISE EXCEPTION 'users-only slug was changed to %', generated;
  END IF;

  INSERT INTO public.stores (id, user_id, store_slug, subdomain, is_public)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'osayi-fabrics',
    'osayi-fabrics',
    true
  );
  osayi := '11111111-1111-1111-1111-111111111111';

  generated := public.generate_store_slug('Osayi Fabrics');
  IF generated IS DISTINCT FROM 'osayi-fabrics-1' THEN
    RAISE EXCEPTION 'store collision became %', generated;
  END IF;

  generated := public.generate_store_slug('A Very Long Fabric Shop Name');
  IF length(generated) > 20 THEN
    RAISE EXCEPTION 'slug too long: %', generated;
  END IF;

  generated := public.generate_store_slug('admin');
  IF generated = 'admin' OR generated ~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'reserved slug handed out: %', generated;
  END IF;

  generated := public.generate_store_slug('234');
  IF generated = '234' OR generated ~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'number slug handed out: %', generated;
  END IF;

  INSERT INTO public.stores (user_id, store_slug, is_public)
  VALUES ('owner-hidden', 'test-hidden', false);

  generated := public.generate_store_slug('test-hidden');
  IF generated = 'test-hidden' THEN
    RAISE EXCEPTION 'private slug was handed out';
  END IF;

  UPDATE public.stores
     SET business_name = 'kept'
   WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
     WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
       AND store_slug = repeat('a', 38)
       AND business_name = 'kept'
  ) THEN
    RAISE EXCEPTION 'grandfather slug was rewritten';
  END IF;

  BEGIN
    UPDATE public.stores
       SET store_slug = repeat('b', 38)
     WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    RAISE EXCEPTION '38 character slug was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.stores (user_id, store_slug, is_public)
    VALUES ('owner-admin', 'admin', true);
    RAISE EXCEPTION 'admin slug was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;

  INSERT INTO public.stores (id, user_id, store_slug, subdomain, is_public)
  VALUES (
    '22222222-2222-2222-2222-222222222222',
    'owner-b',
    'shop-bee',
    'shop-bee',
    true
  );

  BEGIN
    UPDATE public.stores
       SET store_slug = 'test-hidden'
     WHERE id = '22222222-2222-2222-2222-222222222222';
    RAISE EXCEPTION 'another store claimed test-hidden';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;

  UPDATE public.stores
     SET store_slug = 'osayi-new',
         subdomain = 'osayi-new'
   WHERE id = osayi;

  IF NOT EXISTS (
    SELECT 1 FROM public.store_slug_redirects
     WHERE old_slug = 'osayi-fabrics' AND store_id = osayi
  ) THEN
    RAISE EXCEPTION 'own previous slug was not recorded';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_slug_redirects
     WHERE old_slug = 'test-hidden'
  ) THEN
    RAISE EXCEPTION 'test-hidden was stolen';
  END IF;

  SELECT public.resolve_store_redirect('osayi-fabrics') INTO resolved;
  IF resolved IS DISTINCT FROM osayi THEN
    RAISE EXCEPTION 'redirect resolved to %', resolved;
  END IF;

  SELECT public.resolve_store_redirect('OSAYI-FABRICS') INTO resolved;
  IF resolved IS DISTINCT FROM osayi THEN
    RAISE EXCEPTION 'uppercase redirect resolved to %', resolved;
  END IF;

  UPDATE public.stores
     SET store_slug = 'old-shop-new'
   WHERE id = '44444444-4444-4444-4444-444444444444';
  SELECT public.resolve_store_redirect('OLDSHOP') INTO resolved;
  IF resolved IS DISTINCT FROM '44444444-4444-4444-4444-444444444444'::uuid THEN
    RAISE EXCEPTION 'mixed-case old slug resolved to %', resolved;
  END IF;

  UPDATE public.stores
     SET business_name = 'kept numeric host'
   WHERE id = '33333333-3333-3333-3333-333333333333';
  IF NOT EXISTS (
    SELECT 1 FROM public.stores
     WHERE id = '33333333-3333-3333-3333-333333333333'
       AND subdomain = '234'
       AND business_name = 'kept numeric host'
  ) THEN
    RAISE EXCEPTION 'grandfather subdomain was rewritten';
  END IF;

  BEGIN
    UPDATE public.stores
       SET subdomain = 'admin'
     WHERE id = '22222222-2222-2222-2222-222222222222';
    RAISE EXCEPTION 'admin subdomain was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;

  BEGIN
    UPDATE public.stores
       SET subdomain = 'osayi-new'
     WHERE id = '22222222-2222-2222-2222-222222222222';
    RAISE EXCEPTION 'taken subdomain was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;

  UPDATE public.stores
     SET account_number = '0123456789',
         account_name = 'Preview',
         bank_name = 'Ecobank',
         payment_methods = '[{"enabled":true}]'::jsonb
   WHERE id = osayi;

  IF has_column_privilege('anon', 'public.stores', 'account_number', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read account_number';
  END IF;
  IF has_column_privilege('anon', 'public.stores', 'account_name', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read account_name';
  END IF;
  IF has_column_privilege('anon', 'public.stores', 'bank_name', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read bank_name';
  END IF;
  IF NOT has_column_privilege('anon', 'public.stores', 'payment_methods', 'SELECT') THEN
    RAISE EXCEPTION 'anon cannot read payment_methods';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.stores', 'account_number', 'SELECT') THEN
    RAISE EXCEPTION 'owner cannot read account_number';
  END IF;

  INSERT INTO public.products (id, user_id, is_public, name)
  VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner-public', true, 'Cloth');
  INSERT INTO public.stores (user_id, store_slug, is_public)
  VALUES ('owner-public', 'public-cloth', true);
  INSERT INTO public.product_variants (product_id, user_id, is_active, variant_name)
  VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner-public', true, 'Red');

  INSERT INTO public.products (id, user_id, is_public, name)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'owner-private', true, 'Secret');
  INSERT INTO public.stores (user_id, store_slug, is_public)
  VALUES ('owner-private', 'private-cloth', false);
  INSERT INTO public.product_variants (product_id, user_id, is_active, variant_name)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'owner-private', true, 'Hidden');
END $$;

DO $$
DECLARE
  seen integer;
  resolved uuid;
BEGIN
  EXECUTE 'SET ROLE anon';
  BEGIN
    PERFORM 1 FROM public.store_slug_redirects;
    RAISE EXCEPTION 'anon read the redirect list';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    PERFORM account_number FROM public.stores;
    RAISE EXCEPTION 'anon read account_number';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM business_name, payment_methods
    FROM public.stores
   WHERE id = '11111111-1111-1111-1111-111111111111'
     AND payment_methods IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'anon lost checkout columns';
  END IF;

  resolved := public.resolve_store_redirect('osayi-fabrics');
  IF resolved IS DISTINCT FROM '11111111-1111-1111-1111-111111111111'::uuid THEN
    RAISE EXCEPTION 'anon resolve returned %', resolved;
  END IF;

  SELECT count(*) INTO seen FROM public.product_variants;
  IF seen IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'anon saw % variants', seen;
  END IF;
  EXECUTE 'RESET ROLE';
END $$;
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_20_legacy_bank_to_payment_methods.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_20_legacy_bank_to_payment_methods.sql"

"${PSQL[@]}" -d "$DB" <<'SQL'
DO $$
DECLARE
  bank_methods integer;
  dry_run integer;
BEGIN
  SELECT COUNT(*) INTO bank_methods
    FROM public.stores AS s,
         jsonb_array_elements(s.payment_methods) AS method
   WHERE s.id = '11111111-1111-1111-1111-111111111111'
     AND lower(coalesce(method->>'type', '')) = 'bank';
  IF bank_methods IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'legacy bank copy count is %', bank_methods;
  END IF;

  SELECT COUNT(*) INTO bank_methods
    FROM public.stores AS s,
         jsonb_array_elements(s.payment_methods) AS method
   WHERE s.id = '66666666-6666-6666-6666-666666666666'
     AND lower(coalesce(method->>'type', '')) = 'bank';
  IF bank_methods IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'existing bank method was duplicated (% )', bank_methods;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.stores
     WHERE id = '11111111-1111-1111-1111-111111111111'
       AND payment_methods::text LIKE '%₦%' IS NOT TRUE
       AND payment_methods::text LIKE '%0123456789%'
  ) THEN
    RAISE EXCEPTION 'copied account number missing';
  END IF;

  SELECT COUNT(*) INTO dry_run
    FROM public.stores AS s
   WHERE (
           nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT NULL
        OR nullif(btrim(coalesce(s.account_number, '')), '') IS NOT NULL
        OR nullif(btrim(coalesce(s.account_name, '')), '') IS NOT NULL
         )
     AND (
           s.payment_methods IS NULL
        OR jsonb_typeof(s.payment_methods) = 'array'
         )
     AND NOT EXISTS (
           SELECT 1
             FROM jsonb_array_elements(s.payment_methods) AS method
            WHERE lower(coalesce(method->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
         );
  IF dry_run IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'dry run still lists % stores', dry_run;
  END IF;
END $$;
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_21_store_bank_details.sql"

"${PSQL[@]}" -d "$DB" <<'SQL'
DO $$
DECLARE
  seen integer;
  acct text;
BEGIN
  IF has_column_privilege('authenticated', 'public.stores', 'account_number', 'SELECT') THEN
    RAISE EXCEPTION 'signed-in user can still read stores.account_number';
  END IF;
  IF has_column_privilege('anon', 'public.stores', 'account_number', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read stores.account_number';
  END IF;
  IF NOT has_column_privilege('anon', 'public.stores', 'payment_methods', 'SELECT') THEN
    RAISE EXCEPTION 'anon lost payment_methods';
  END IF;
  IF has_table_privilege('anon', 'public.store_bank_details', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read store_bank_details';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stores
     WHERE id = '11111111-1111-1111-1111-111111111111'
       AND account_number IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'stores.account_number was not cleared';
  END IF;

  SELECT account_number INTO acct
    FROM public.store_bank_details
   WHERE store_id = '11111111-1111-1111-1111-111111111111';
  IF acct IS DISTINCT FROM '0123456789' THEN
    RAISE EXCEPTION 'owner table missing account, got %', acct;
  END IF;

  EXECUTE 'SET ROLE anon';
  BEGIN
    PERFORM 1 FROM public.store_bank_details;
    RAISE EXCEPTION 'anon read store_bank_details';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET ROLE authenticated';
  SELECT COUNT(*) INTO seen FROM public.store_bank_details;
  IF seen IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'owner saw % bank rows', seen;
  END IF;
  SELECT account_number INTO acct
    FROM public.store_bank_details
   WHERE store_id = '11111111-1111-1111-1111-111111111111';
  IF acct IS DISTINCT FROM '0123456789' THEN
    RAISE EXCEPTION 'owner read failed, got %', acct;
  END IF;
  BEGIN
    PERFORM account_number FROM public.stores;
    RAISE EXCEPTION 'authenticated read stores.account_number';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql AS $uid$ SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid $uid$;

  EXECUTE 'SET ROLE authenticated';
  SELECT COUNT(*) INTO seen FROM public.store_bank_details;
  IF seen IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'other user saw % bank rows', seen;
  END IF;
  EXECUTE 'RESET ROLE';

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql AS $uid$ SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $uid$;
END $$;

-- Step 20 rollback must not bring the client function back.
DROP TRIGGER IF EXISTS stores_guard_slug ON public.stores;
DROP FUNCTION IF EXISTS public.stores_guard_slug();
DROP INDEX IF EXISTS public.stores_store_slug_uniq;
DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'remember_store_slug') THEN
    RAISE EXCEPTION 'rollback restored remember_store_slug';
  END IF;
  IF has_table_privilege('anon', 'public.store_slug_redirects', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still list redirects';
  END IF;
END $$;
SQL

echo "SLUG_PUBLIC_READ:0"
