#!/usr/bin/env bash
# Local proof for migrations 16 and 17. Not for the live database.
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
  store_slug text,
  subdomain text,
  is_public boolean NOT NULL DEFAULT false
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_public_read ON public.stores
  FOR SELECT TO anon
  USING (is_public = true);

INSERT INTO public.users (id, store_slug)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'taken-on-users-only');
SQL

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_16_stores_public_read.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/20261025_17_store_slug_redirects.sql"

"${PSQL[@]}" -d "$DB" <<'SQL'
DO $$
DECLARE
  roles text;
  generated text;
BEGIN
  SELECT string_agg(r.rolname, ',' ORDER BY r.rolname)
    INTO roles
    FROM pg_policy p
    JOIN pg_roles r ON r.oid = ANY (p.polroles)
   WHERE p.polname = 'stores_public_read';
  IF roles IS DISTINCT FROM 'anon,authenticated' THEN
    RAISE EXCEPTION 'public read roles are %', roles;
  END IF;

  IF (SELECT pg_get_functiondef('public.generate_store_slug(text)'::regprocedure) LIKE '%public.users%') THEN
    RAISE EXCEPTION 'generate_store_slug still checks users';
  END IF;

  generated := public.generate_store_slug('taken-on-users-only');
  IF generated IS DISTINCT FROM 'taken-on-users-only' THEN
    RAISE EXCEPTION 'users-only slug was changed to %', generated;
  END IF;

  INSERT INTO public.stores (user_id, store_slug, subdomain, is_public)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'osayi-fabrics', 'osayi-fabrics', true);

  generated := public.generate_store_slug('Osayi Fabrics');
  IF generated IS DISTINCT FROM 'osayi-fabrics-1' THEN
    RAISE EXCEPTION 'store collision became %', generated;
  END IF;

  generated := public.generate_store_slug('A Very Long Fabric Shop Name');
  IF length(generated) > 20 THEN
    RAISE EXCEPTION 'slug too long: %', generated;
  END IF;

  PERFORM public.remember_store_slug(
    (SELECT id FROM public.stores WHERE store_slug = 'osayi-fabrics'),
    'old-osayi-fabrics',
    'osayi-fabrics'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.store_slug_redirects WHERE old_slug = 'old-osayi-fabrics'
  ) THEN
    RAISE EXCEPTION 'redirect was not stored';
  END IF;
END $$;

DROP POLICY IF EXISTS stores_public_read ON public.stores;
CREATE POLICY stores_public_read ON public.stores
  FOR SELECT TO anon
  USING (is_public = true);

DO $$
DECLARE
  roles text;
BEGIN
  SELECT string_agg(r.rolname, ',' ORDER BY r.rolname)
    INTO roles
    FROM pg_policy p
    JOIN pg_roles r ON r.oid = ANY (p.polroles)
   WHERE p.polname = 'stores_public_read';
  IF roles IS DISTINCT FROM 'anon' THEN
    RAISE EXCEPTION 'rollback left roles %', roles;
  END IF;
END $$;
SQL

echo "SLUG_PUBLIC_READ:0"
