#!/usr/bin/env bash
# Local proof that step 21b does not lock the owner out of their store,
# that a second run keeps a newer bank row, and that 21a and 21b can run
# in either order. Not for the live database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="storehouse_owner_$$"
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
LANGUAGE sql STABLE AS $$ SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $$;

CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text,
  business_name text
);
CREATE TABLE public.stores (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  business_name text,
  store_slug text,
  subdomain text,
  is_public boolean NOT NULL DEFAULT true,
  whatsapp_number text,
  bank_name text,
  account_number text,
  account_name text,
  payment_methods jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_owner_all ON public.stores
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
GRANT SELECT, INSERT, UPDATE ON public.stores TO anon, authenticated;

INSERT INTO public.stores (id, user_id, business_name, store_slug, is_public, bank_name, account_number, account_name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ada Fabrics', 'ada', true, 'Old Bank', '1111111111', 'Ada Old'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Second Shop', 'second', true, 'Second Bank', '2222222222', 'Second');
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_21_store_bank_details.sql" >/dev/null

# select * includes the revoked columns and must fail for a signed-in user.
set +e
"${PSQL[@]}" -d "$DB" -c "SET ROLE authenticated; SELECT * FROM public.stores;" >/tmp/owner-star.out 2>/tmp/owner-star.err
star_status=$?
set -e
if [[ "$star_status" -eq 0 ]]; then
  echo "OWNER_STAR_SHOULD_FAIL"
  exit 1
fi
if ! grep -q 'permission denied' /tmp/owner-star.err; then
  echo "OWNER_STAR_UNEXPECTED"
  cat /tmp/owner-star.err
  exit 1
fi

"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE authenticated;
SELECT business_name FROM public.stores WHERE store_slug = 'ada';
INSERT INTO public.stores (id, user_id, business_name, store_slug, is_public)
VALUES ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Shop', 'new-shop', true);
SELECT business_name FROM public.stores WHERE store_slug = 'new-shop';
RESET ROLE;
SQL

"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE public.store_bank_details
   SET bank_name = 'Newer Bank', account_number = '9999999999', account_name = 'Ada New'
 WHERE store_id = '11111111-1111-1111-1111-111111111111';
UPDATE public.stores
   SET bank_name = 'Stale Bank', account_number = '1111111111', account_name = 'Ada Old',
       updated_at = timestamptz '2020-01-01+00'
 WHERE id = '11111111-1111-1111-1111-111111111111';
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_21_store_bank_details.sql" >/dev/null

"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=1 -c \
"SELECT bank_name, account_number FROM public.store_bank_details WHERE store_id = '11111111-1111-1111-1111-111111111111';" \
| grep -q '9999999999'

"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=1 -c \
"SELECT count(*) FROM public.stores WHERE bank_name IS NOT NULL OR account_number IS NOT NULL OR account_name IS NOT NULL;" \
| grep -q ' 0'

"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=1 -c \
"SELECT count(*) FROM public.stores s WHERE jsonb_typeof(s.payment_methods) = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.payment_methods) m WHERE m->>'type' = 'bank');" \
| grep -q ' 2'

# Stale stores columns must not rewrite the transfer method customers already see.
"${PSQL[@]}" -d "$DB" -tA -c "SELECT payment_methods->0->>'account_number' FROM public.stores WHERE id = '11111111-1111-1111-1111-111111111111';" \
| grep -q '1111111111'

# A bank edit saved on the stores columns while 21b was undone is kept.
"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE public.stores
   SET bank_name = 'Edited Bank', account_number = '8888888888', account_name = 'Ada Edit',
       updated_at = clock_timestamp()
 WHERE id = '11111111-1111-1111-1111-111111111111';
SQL
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_21_store_bank_details.sql" >/dev/null
"${PSQL[@]}" -d "$DB" -tA -c "SELECT account_number FROM public.store_bank_details WHERE store_id = '11111111-1111-1111-1111-111111111111';" | grep -q '8888888888'
"${PSQL[@]}" -d "$DB" -tA -c "SELECT payment_methods->0->>'account_number' FROM public.stores WHERE id = '11111111-1111-1111-1111-111111111111';" | grep -q '8888888888'
"${PSQL[@]}" -d "$DB" -tA -c "SELECT bank_name IS NULL AND account_number IS NULL FROM public.stores WHERE id = '11111111-1111-1111-1111-111111111111';" | grep -q t
kept=$("${PSQL[@]}" -d "$DB" -tA -c "SELECT jsonb_array_length(payment_methods) FROM public.stores WHERE id = '11111111-1111-1111-1111-111111111111';")
if [[ "$kept" != "1" ]]; then
  echo "OWNER_EDIT_METHOD_COUNT:$kept"
  exit 1
fi

# 21a after 21b must not add a second transfer method.
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_20_legacy_bank_to_payment_methods.sql" >/dev/null
methods=$("${PSQL[@]}" -d "$DB" -tA -c "SELECT jsonb_array_length(payment_methods) FROM public.stores WHERE id = '11111111-1111-1111-1111-111111111111';")
if [[ "$methods" != "1" ]]; then
  echo "OWNER_METHOD_COUNT:$methods"
  exit 1
fi

# Fresh database path: 21a first, then 21b.
sudo -u postgres dropdb --if-exists "$DB" >/dev/null
sudo -u postgres createdb "$DB"
"${PSQL[@]}" -d "$DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $$;
CREATE TABLE public.users (id uuid PRIMARY KEY, email text);
CREATE TABLE public.stores (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  business_name text,
  store_slug text,
  is_public boolean NOT NULL DEFAULT true,
  bank_name text,
  account_number text,
  account_name text,
  payment_methods jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.stores TO anon, authenticated;
INSERT INTO public.stores (id, user_id, business_name, store_slug, bank_name, account_number, account_name)
VALUES ('44444444-4444-4444-4444-444444444444', 'owner', 'First Order', 'first', 'First Bank', '4444444444', 'First');
SQL
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_20_legacy_bank_to_payment_methods.sql" >/dev/null
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_21_store_bank_details.sql" >/dev/null
"${PSQL[@]}" -d "$DB" -tA -c "SELECT account_number FROM public.store_bank_details WHERE store_id = '44444444-4444-4444-4444-444444444444';" | grep -q '4444444444'
"${PSQL[@]}" -d "$DB" -tA -c "SELECT payment_methods->0->>'account_number' FROM public.stores WHERE id = '44444444-4444-4444-4444-444444444444';" | grep -q '4444444444'
"${PSQL[@]}" -d "$DB" -tA -c "SELECT bank_name IS NULL AND account_number IS NULL FROM public.stores WHERE id = '44444444-4444-4444-4444-444444444444';" | grep -q t

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_22_users_store_type.sql" >/dev/null
"${PSQL[@]}" -d "$DB" -c "INSERT INTO public.users (id) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); UPDATE public.users SET store_type = 'fashion' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';" >/dev/null
"${PSQL[@]}" -d "$DB" -tA -c "SELECT store_type FROM public.users;" | grep -q fashion

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_23_users_business_type_prompt.sql" >/dev/null
"${PSQL[@]}" -d "$DB" -c "UPDATE public.users SET business_type_prompt_dismissed = true WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';" >/dev/null
"${PSQL[@]}" -d "$DB" -tA -c "SELECT business_type_prompt_dismissed FROM public.users;" | grep -q t

echo "OWNER_COLUMN_READ:ok"
