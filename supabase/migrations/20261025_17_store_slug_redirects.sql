-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- Old store URLs keep working after a slug change. generate_store_slug
-- checks public.stores (and this redirect table), not public.users.
-- New slugs are at most 20 characters. Existing long slugs are left as
-- they are.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.remember_store_slug(uuid, text, text);
--   DROP FUNCTION IF EXISTS public.generate_store_slug(text);
--   DROP TABLE IF EXISTS public.store_slug_redirects;
-- The previous generate_store_slug checked public.users. Do not restore
-- that body. If you drop the function, the app uses its own short slug.
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.store_slug_redirects (
  old_slug text PRIMARY KEY,
  store_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_slug_redirects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_slug_redirects FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS store_slug_redirects_read ON public.store_slug_redirects;

CREATE OR REPLACE FUNCTION public.remember_store_slug(
  p_store_id uuid,
  p_old text,
  p_new text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_old IS NULL OR p_new IS NULL OR btrim(p_old) = '' OR p_old = p_new THEN
    RETURN;
  END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.stores
     WHERE id = p_store_id
       AND user_id = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'not_store_owner' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.store_slug_redirects (old_slug, store_id)
  VALUES (p_old, p_store_id)
  ON CONFLICT (old_slug) DO NOTHING;

  IF EXISTS (
    SELECT 1
      FROM public.store_slug_redirects
     WHERE old_slug = p_old
       AND store_id IS DISTINCT FROM p_store_id
  ) THEN
    RAISE EXCEPTION 'slug_redirect_owned' USING ERRCODE = '23505';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.remember_store_slug(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remember_store_slug(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.generate_store_slug(business_name text)
RETURNS text
LANGUAGE plpgsql
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
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.stores
     WHERE store_slug = final_slug OR subdomain = final_slug
  ) OR EXISTS (
    SELECT 1 FROM public.store_slug_redirects WHERE old_slug = final_slug
  ) LOOP
    counter := counter + 1;
    final_slug := substring(base_slug from 1 for 16) || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_store_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_store_slug(text) TO anon, authenticated, service_role;

COMMIT;
