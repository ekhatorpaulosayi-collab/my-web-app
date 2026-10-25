-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run BEFORE the website that saves a custom domain, and BEFORE deploying
-- verify-custom-domain and the ai-chat build that reads custom_domain_verified.
--
-- Live stores.custom_domain_verified already exists (boolean). This file adds
-- it only if a fresh database does not have it, then:
--   * one store per custom domain
--   * owners cannot set the domain, the token, or the verified flag
--   * an INSERT (including delete-and-reinsert) by anyone except the
--     service role forces custom_domain and the token to NULL and
--     custom_domain_verified to false
--   * an UPDATE of those three columns by anyone except the service role
--     is rejected (custom_domain_locked)
--   * set_store_custom_domain is how an owner changes the domain
--     (it always sets verified = false and rotates the token)
--   * only the verify-custom-domain edge function (service role), after a
--     DNS TXT match, sets verified = true
--
-- Pre-check (must return no rows). If it returns rows, clear the extra
-- domain before running this file:
--   SELECT lower(btrim(custom_domain)) AS domain, count(*)
--     FROM public.stores
--    WHERE custom_domain IS NOT NULL AND btrim(custom_domain) <> ''
--    GROUP BY 1 HAVING count(*) > 1;
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS stores_protect_custom_domain ON public.stores;
--   DROP FUNCTION IF EXISTS public.protect_custom_domain_columns();
--   DROP FUNCTION IF EXISTS public.set_store_custom_domain(text);
--   DROP FUNCTION IF EXISTS public.confirm_custom_domain_verified(uuid, text, text);
--   DROP INDEX IF EXISTS public.stores_custom_domain_uniq;
--   GRANT UPDATE ON public.stores TO authenticated;
-- =============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain_verified boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.stores
     WHERE custom_domain IS NOT NULL AND btrim(custom_domain) <> ''
     GROUP BY lower(btrim(custom_domain))
     HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate custom_domain values; clear the extra rows before this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS stores_custom_domain_uniq
  ON public.stores (lower(btrim(custom_domain)))
  WHERE custom_domain IS NOT NULL AND btrim(custom_domain) <> '';

-- A table-level UPDATE grant ignores a later column REVOKE. Take the table
-- grant away, then give authenticated every column except the three domain
-- columns. The trigger below is the second lock.
REVOKE UPDATE ON public.stores FROM authenticated, anon;

DO $$
DECLARE
  col text;
BEGIN
  FOR col IN
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'stores'
       AND column_name NOT IN ('custom_domain', 'domain_verification_token', 'custom_domain_verified')
  LOOP
    EXECUTE format('GRANT UPDATE (%I) ON public.stores TO authenticated', col);
  END LOOP;
END $$;

REVOKE UPDATE (custom_domain, domain_verification_token, custom_domain_verified)
  ON public.stores FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.protect_custom_domain_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- INSERT has no OLD row. stores_owner_all lets the owner insert, or
  -- delete and insert again, so forcing the three columns is the lock.
  IF TG_OP = 'INSERT' THEN
    NEW.custom_domain := NULL;
    NEW.domain_verification_token := NULL;
    NEW.custom_domain_verified := false;
    RETURN NEW;
  END IF;
  IF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain
     OR NEW.domain_verification_token IS DISTINCT FROM OLD.domain_verification_token
     OR NEW.custom_domain_verified IS DISTINCT FROM OLD.custom_domain_verified THEN
    RAISE EXCEPTION 'custom_domain_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_protect_custom_domain ON public.stores;
CREATE TRIGGER stores_protect_custom_domain
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_custom_domain_columns();

CREATE OR REPLACE FUNCTION public.set_store_custom_domain(p_domain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_domain text;
  v_token text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '42501';
  END IF;

  v_domain := NULLIF(lower(btrim(COALESCE(p_domain, ''))), '');
  IF v_domain IS NOT NULL THEN
    v_domain := regexp_replace(v_domain, '^https?://', '');
    v_domain := regexp_replace(v_domain, '/.*$', '');
    v_domain := regexp_replace(v_domain, '\.$', '');
    IF v_domain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
       OR v_domain = 'storehouse.ng'
       OR v_domain LIKE '%.storehouse.ng' THEN
      RAISE EXCEPTION 'invalid_domain' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_domain IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.stores
     WHERE lower(btrim(custom_domain)) = v_domain
       AND user_id IS DISTINCT FROM auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'domain_taken' USING ERRCODE = '23505';
  END IF;

  SELECT id INTO v_id
    FROM public.stores
   WHERE user_id = auth.uid()::text
   LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'store_not_found' USING ERRCODE = '23502';
  END IF;

  v_token := CASE
    WHEN v_domain IS NULL THEN NULL
    ELSE encode(extensions.gen_random_bytes(16), 'hex')
  END;

  UPDATE public.stores
     SET custom_domain = v_domain,
         domain_verification_token = v_token,
         custom_domain_verified = false
   WHERE id = v_id;

  RETURN jsonb_build_object(
    'custom_domain', v_domain,
    'domain_verification_token', v_token,
    'custom_domain_verified', false,
    'txt_name', CASE WHEN v_domain IS NULL THEN NULL ELSE '_storehouse.' || v_domain END,
    'txt_value', v_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_store_custom_domain(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_store_custom_domain(text) TO authenticated;

-- Called only by verify-custom-domain after the TXT record matches.
-- service_role is the only grant. The function owner passes the trigger.
CREATE OR REPLACE FUNCTION public.confirm_custom_domain_verified(
  p_store_id uuid,
  p_domain text,
  p_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- auth.role() is the JWT role, including inside a definer function.
  -- A direct psql session has no JWT; only postgres may confirm then.
  IF COALESCE(auth.role(), '') NOT IN ('service_role', '') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(auth.role(), '') = '' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.stores
     SET custom_domain_verified = true
   WHERE id = p_store_id
     AND lower(btrim(custom_domain)) = lower(btrim(p_domain))
     AND domain_verification_token = p_token
  RETURNING id INTO v_id;

  RETURN v_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_custom_domain_verified(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_custom_domain_verified(uuid, text, text) TO service_role;

COMMIT;
