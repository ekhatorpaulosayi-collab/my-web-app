-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Do not UPDATE or DELETE the two live TEST signup rows.
--
-- Migration 17 let any owner pass any old slug to remember_store_slug,
-- including another store's hidden slug. This file removes that function.
-- A trigger records only this store's previous slug when the slug changes.
--
-- generate_store_slug and store_slug_is_available are SECURITY DEFINER so
-- they can see private stores. Reserved and number-only labels are rejected.
-- An existing slug is not rewritten, so a long slug can still be saved when
-- the slug column itself does not change.
--
-- Shoppers can SELECT variants of a public product on a public store.
-- Anon cannot list store_slug_redirects. One slug in, one store id out.
--
-- If CREATE UNIQUE INDEX stops, two stores share a store_slug. Stop.
-- Do not delete either row.
--
-- ROLLBACK (does not restore remember_store_slug, and does not grant
-- SELECT on store_slug_redirects). The security-definer slug functions
-- stay, because generate_store_slug depends on them.
--   DROP TRIGGER IF EXISTS stores_guard_slug ON public.stores;
--   DROP FUNCTION IF EXISTS public.stores_guard_slug();
--   DROP INDEX IF EXISTS public.stores_store_slug_uniq;
--   DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
-- Re-run this file to put the guard back.
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.store_slug_label_allowed(p_slug text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  slug text := lower(btrim(coalesce(p_slug, '')));
  reserved text[] := ARRAY[
    'www', 'admin', 'api', 'app', 'dashboard', 'mail', 'ftp', 'accounts',
    'auth', 'login', 'signup', 'register', 'oauth', 'cart', 'checkout',
    'pay', 'paystack', 'order', 'orders', 'billing', 'payments', 'webhooks',
    'account', 'me', 'my', 'blog', 'support', 'help', 'docs', 'status',
    'news', 'about', 'dev', 'staging', 'test', 'demo', 'beta', 'preview',
    'local', 'cdn', 'assets', 'static', 'media', 'img', 'images',
    'storehouse', 'email', 'unsubscribe', 'notify', 'hello', 'info',
    'contact', 'new', 'edit', 'settings', 'search',
    '234'
  ];
BEGIN
  IF slug !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' THEN
    RETURN false;
  END IF;
  IF slug ~ '^[0-9]+$' THEN
    RETURN false;
  END IF;
  IF slug = ANY (reserved) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.store_slug_label_allowed(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.store_slug_is_available(
  p_slug text,
  p_store_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  slug text := lower(btrim(coalesce(p_slug, '')));
BEGIN
  IF NOT public.store_slug_label_allowed(slug) THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.stores
     WHERE (store_slug = slug OR subdomain = slug)
       AND (p_store_id IS NULL OR id IS DISTINCT FROM p_store_id)
  ) THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.store_slug_redirects
     WHERE old_slug = slug
       AND (p_store_id IS NULL OR store_id IS DISTINCT FROM p_store_id)
  ) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.store_slug_is_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_slug_is_available(text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_store_slug(business_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(coalesce(business_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug from 1 for 20);
  base_slug := trim(both '-' from base_slug);
  IF base_slug IS NULL OR length(base_slug) < 3 THEN
    base_slug := 'shop';
  END IF;
  IF NOT public.store_slug_label_allowed(base_slug) THEN
    base_slug := trim(both '-' from substring(base_slug || '-shop' from 1 for 20));
  END IF;
  IF NOT public.store_slug_label_allowed(base_slug) THEN
    base_slug := 'shop';
  END IF;
  final_slug := base_slug;
  WHILE NOT public.store_slug_is_available(final_slug, NULL) LOOP
    counter := counter + 1;
    IF counter > 50 THEN
      RAISE EXCEPTION 'invalid_store_slug' USING ERRCODE = '23514';
    END IF;
    final_slug := trim(both '-' from substring(base_slug from 1 for 16)) || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_store_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_store_slug(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_store_redirect(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT store_id
    FROM public.store_slug_redirects
   WHERE old_slug = btrim(coalesce(p_slug, ''))
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_store_redirect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_store_redirect(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS store_slug_redirects_read ON public.store_slug_redirects;
REVOKE SELECT ON public.store_slug_redirects FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.remember_store_slug(uuid, text, text);

CREATE OR REPLACE FUNCTION public.stores_guard_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  previous text;
  owner uuid;
  seen text[] := ARRAY[]::text[];
  slug_unchanged boolean;
  sub_unchanged boolean;
BEGIN
  slug_unchanged := TG_OP = 'UPDATE' AND OLD.store_slug IS NOT DISTINCT FROM NEW.store_slug;
  sub_unchanged := TG_OP = 'UPDATE' AND OLD.subdomain IS NOT DISTINCT FROM NEW.subdomain;

  -- A subdomain-only save used to return here and skip every check, so a
  -- shop could claim another shop's old name or the word "storehouse".
  IF slug_unchanged AND sub_unchanged THEN
    RETURN NEW;
  END IF;

  IF NOT slug_unchanged THEN
    IF NEW.store_slug IS NULL OR btrim(NEW.store_slug) = '' THEN
      IF TG_OP = 'INSERT' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'invalid_store_slug' USING ERRCODE = '23514';
      END IF;
    ELSE
      NEW.store_slug := lower(btrim(NEW.store_slug));
      IF NOT public.store_slug_is_available(NEW.store_slug, NEW.id) THEN
        RAISE EXCEPTION 'invalid_store_slug' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF NOT sub_unchanged THEN
    IF NEW.subdomain IS NULL OR btrim(NEW.subdomain) = '' THEN
      NEW.subdomain := NULL;
    ELSE
      NEW.subdomain := lower(btrim(NEW.subdomain));
      IF NOT public.store_slug_is_available(NEW.subdomain, NEW.id) THEN
        RAISE EXCEPTION 'invalid_store_subdomain' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF slug_unchanged AND TG_OP = 'UPDATE' THEN
    -- Redirect history is recorded from the slug change below. A subdomain
    -- change still has to pass the checks above.
    NULL;
  END IF;

  IF TG_OP = 'INSERT' OR slug_unchanged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.store_slug_redirects
     WHERE old_slug = NEW.store_slug
       AND store_id = NEW.id;

    FOREACH previous IN ARRAY ARRAY[OLD.store_slug, OLD.subdomain]
    LOOP
      IF previous IS NULL OR btrim(previous) = '' OR previous = NEW.store_slug THEN
        CONTINUE;
      END IF;
      IF previous = ANY (seen) THEN
        CONTINUE;
      END IF;
      seen := array_append(seen, previous);

      IF EXISTS (
        SELECT 1
          FROM public.stores
         WHERE id IS DISTINCT FROM NEW.id
           AND (store_slug = previous OR subdomain = previous)
      ) THEN
        CONTINUE;
      END IF;

      SELECT r.store_id INTO owner
        FROM public.store_slug_redirects AS r
       WHERE r.old_slug = previous;
      IF NOT FOUND THEN
        INSERT INTO public.store_slug_redirects (old_slug, store_id)
        VALUES (previous, NEW.id);
      ELSIF owner = NEW.id THEN
        UPDATE public.store_slug_redirects
           SET created_at = now()
         WHERE old_slug = previous;
      ELSE
        RAISE EXCEPTION 'slug_redirect_owned' USING ERRCODE = '23505';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stores_guard_slug() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stores_guard_slug ON public.stores;
CREATE TRIGGER stores_guard_slug
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.stores_guard_slug();

CREATE UNIQUE INDEX IF NOT EXISTS stores_store_slug_uniq
  ON public.stores (store_slug)
  WHERE store_slug IS NOT NULL;

DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_active, false) = true
    AND EXISTS (
      SELECT 1
        FROM public.products AS p
        JOIN public.stores AS s
          ON s.user_id = p.user_id::text
       WHERE p.id = product_variants.product_id
         AND COALESCE(p.is_public, false) = true
         AND s.is_public = true
    )
  );

GRANT SELECT ON public.product_variants TO anon, authenticated;

COMMIT;
