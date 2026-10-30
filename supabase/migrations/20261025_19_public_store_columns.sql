-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Do not UPDATE or DELETE the two live TEST signup rows.
--
-- Run after step 19b (20261025_18_slug_guard.sql).
--
-- Anon keeps a public storefront. Settlement columns come off that role:
-- bank_name, account_number, account_name. Checkout still reads
-- payment_methods. Authenticated keeps table SELECT so the owner dashboard
-- and Store Settings can read and write the settlement columns.
--
-- A subdomain is checked only when that column changes. An existing
-- subdomain, including a numeric one, is left alone. A new subdomain uses
-- the same reserved-word and uniqueness rules as a slug.
--
-- resolve_store_redirect matches an old slug in any letter case.
--
-- ROLLBACK (does not drop store_slug_redirects and does not restore
-- remember_store_slug). Do not run the step 19 rollback after 19b.
--   GRANT SELECT ON TABLE public.stores TO anon;
-- Then run 20261025_18_slug_guard.sql again to put the previous trigger
-- body back. Skip the GRANT above if anon should stay off the
-- settlement columns.
-- =============================================================================
BEGIN;

REVOKE SELECT ON TABLE public.stores FROM anon;

DO $$
DECLARE
  present text;
  safe text[] := ARRAY[
    'id', 'user_id', 'business_name', 'whatsapp_number', 'address', 'logo_url',
    'is_public', 'store_slug', 'subdomain', 'custom_domain', 'custom_domain_verified',
    'about_us', 'return_policy', 'delivery_areas', 'delivery_fee', 'delivery_time',
    'minimum_order', 'business_hours', 'days_of_operation', 'instagram_url',
    'facebook_url', 'tiktok_url', 'twitter_url', 'payment_methods',
    'accepted_payment_methods', 'payment_instructions', 'paystack_enabled',
    'paystack_public_key', 'paystack_test_mode', 'paystack_subaccounts_enabled',
    'kyc_status', 'frozen', 'wa_fallback_minutes'
  ];
BEGIN
  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinality)
    INTO present
    FROM unnest(safe) WITH ORDINALITY AS c(column_name, ordinality)
   WHERE EXISTS (
     SELECT 1
       FROM information_schema.columns AS live
      WHERE live.table_schema = 'public'
        AND live.table_name = 'stores'
        AND live.column_name = c.column_name
   );

  IF present IS NULL THEN
    RAISE EXCEPTION 'stores is missing the public shop columns';
  END IF;

  EXECUTE format('GRANT SELECT (%s) ON TABLE public.stores TO anon', present);
END $$;

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
     WHERE (lower(store_slug) = slug OR lower(subdomain) = slug)
       AND (p_store_id IS NULL OR id IS DISTINCT FROM p_store_id)
  ) THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.store_slug_redirects
     WHERE lower(old_slug) = slug
       AND (p_store_id IS NULL OR store_id IS DISTINCT FROM p_store_id)
  ) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_store_redirect(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT store_id
    FROM public.store_slug_redirects
   WHERE lower(old_slug) = lower(btrim(coalesce(p_slug, '')))
   ORDER BY created_at DESC
   LIMIT 1;
$$;

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

  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.store_slug_redirects
     WHERE lower(old_slug) = lower(NEW.store_slug)
       AND store_id = NEW.id;

    FOREACH previous IN ARRAY ARRAY[OLD.store_slug, OLD.subdomain]
    LOOP
      IF previous IS NULL OR btrim(previous) = '' THEN
        CONTINUE;
      END IF;
      previous := lower(btrim(previous));
      IF previous = lower(coalesce(NEW.store_slug, '')) OR previous = ANY (seen) THEN
        CONTINUE;
      END IF;
      seen := array_append(seen, previous);

      IF EXISTS (
        SELECT 1
          FROM public.stores
         WHERE id IS DISTINCT FROM NEW.id
           AND (lower(store_slug) = previous OR lower(subdomain) = previous)
      ) THEN
        CONTINUE;
      END IF;

      SELECT r.store_id INTO owner
        FROM public.store_slug_redirects AS r
       WHERE lower(r.old_slug) = previous
       LIMIT 1;
      IF NOT FOUND THEN
        INSERT INTO public.store_slug_redirects (old_slug, store_id)
        VALUES (previous, NEW.id);
      ELSIF owner = NEW.id THEN
        UPDATE public.store_slug_redirects
           SET created_at = now()
         WHERE lower(old_slug) = previous;
      ELSE
        RAISE EXCEPTION 'slug_redirect_owned' USING ERRCODE = '23505';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_guard_slug ON public.stores;
CREATE TRIGGER stores_guard_slug
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.stores_guard_slug();

COMMIT;
