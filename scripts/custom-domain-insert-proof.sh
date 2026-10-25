#!/usr/bin/env bash
# Local proof that a non-service INSERT cannot set a verified custom domain.
# Not for the live database. Uses a throwaway Postgres database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="storehouse_domain_proof_$$"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)

cleanup() { sudo -u postgres dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

sudo -u postgres createdb "$DB"

"${PSQL[@]}" -d "$DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$;
ALTER ROLE service_role BYPASSRLS;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT '11111111-1111-1111-1111-111111111111'::uuid $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'authenticated')
$$;

GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO authenticated, service_role;

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  business_name text,
  custom_domain text,
  domain_verification_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_owner_all ON public.stores
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated, service_role;
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_14_custom_domain_verification.sql"

"${PSQL[@]}" -d "$DB" <<'SQL'
-- Owner insert with a verified domain is forced empty.
SET ROLE authenticated;
INSERT INTO public.stores (user_id, business_name, custom_domain, domain_verification_token, custom_domain_verified)
VALUES (auth.uid()::text, 'Shop', 'evil.example', 'tok', true);

DO $$
DECLARE r record;
BEGIN
  SELECT custom_domain, domain_verification_token, custom_domain_verified
    INTO r
    FROM public.stores
   WHERE user_id = auth.uid()::text;
  IF r.custom_domain IS NOT NULL
     OR r.domain_verification_token IS NOT NULL
     OR r.custom_domain_verified IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'insert kept a verified domain: %', r;
  END IF;
END $$;

-- Column privileges already block this update. Grant them so the trigger
-- itself is what rejects the change (custom_domain_locked).
RESET ROLE;
GRANT UPDATE (custom_domain, domain_verification_token, custom_domain_verified)
  ON public.stores TO authenticated;
SET ROLE authenticated;
DO $$
BEGIN
  UPDATE public.stores
     SET custom_domain = 'evil.example',
         domain_verification_token = 'tok',
         custom_domain_verified = true
   WHERE user_id = auth.uid()::text;
  RAISE EXCEPTION 'expected custom_domain_locked';
EXCEPTION WHEN insufficient_privilege THEN
  IF SQLERRM NOT LIKE '%custom_domain_locked%' THEN
    RAISE;
  END IF;
END $$;
RESET ROLE;
REVOKE UPDATE (custom_domain, domain_verification_token, custom_domain_verified)
  ON public.stores FROM authenticated;
SET ROLE authenticated;

-- Delete and insert again. The same force applies.
DELETE FROM public.stores WHERE user_id = auth.uid()::text;
INSERT INTO public.stores (user_id, business_name, custom_domain, domain_verification_token, custom_domain_verified)
VALUES (auth.uid()::text, 'Shop', 'evil.example', 'tok', true);

DO $$
DECLARE r record;
BEGIN
  SELECT custom_domain, domain_verification_token, custom_domain_verified
    INTO r
    FROM public.stores
   WHERE user_id = auth.uid()::text;
  IF r.custom_domain IS NOT NULL
     OR r.domain_verification_token IS NOT NULL
     OR r.custom_domain_verified IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'reinsert kept a verified domain: %', r;
  END IF;
END $$;

-- Other columns still save.
UPDATE public.stores SET business_name = 'Renamed' WHERE user_id = auth.uid()::text;

-- The owner RPC (security definer) may set the domain and leaves verified false.
SELECT public.set_store_custom_domain('shop.example.com');
DO $$
DECLARE r record;
BEGIN
  SELECT custom_domain, domain_verification_token, custom_domain_verified
    INTO r
    FROM public.stores
   WHERE user_id = auth.uid()::text;
  IF r.custom_domain IS DISTINCT FROM 'shop.example.com'
     OR r.domain_verification_token IS NULL
     OR r.custom_domain_verified IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'set_store_custom_domain did not reset verification: %', r;
  END IF;
END $$;
RESET ROLE;

-- service_role may insert a verified domain. The edge function confirms later.
SELECT set_config('request.jwt.claim.role', 'service_role', false);
SET ROLE service_role;
INSERT INTO public.stores (user_id, business_name, custom_domain, domain_verification_token, custom_domain_verified)
VALUES ('22222222-2222-2222-2222-222222222222', 'Other', 'ok.example', 'kept', true);
RESET ROLE;
DO $$
DECLARE r record;
BEGIN
  SELECT custom_domain, domain_verification_token, custom_domain_verified
    INTO r
    FROM public.stores
   WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF r.custom_domain IS DISTINCT FROM 'ok.example'
     OR r.domain_verification_token IS DISTINCT FROM 'kept'
     OR r.custom_domain_verified IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'service_role insert was rewritten: %', r;
  END IF;
END $$;
SQL

echo "DOMAIN_INSERT:0"
