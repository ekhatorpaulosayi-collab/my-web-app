-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run after 20261025_09, 20261025_12, and 20261025_18.
--
-- Cashiers cannot put a discount on a sale. Owners and managers still can,
-- up to the line total, inside record_sale.
--
-- store_name_reservations is the single name lock for a slug, a subdomain,
-- and a historic redirect. Two merchants cannot commit the same label.
--
-- A stuck inventory queue row stops after 8 attempts (dead_at). Replay is
-- still apply_storefront_inventory(reference), which is idempotent, then
-- clear dead_at or delete the queue row. See audit-remediation/08_RELEASE_RUNBOOK.md.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS sales_reject_cashier_discount ON public.sales;
--   DROP FUNCTION IF EXISTS public.reject_cashier_discount();
--   DROP TRIGGER IF EXISTS stores_reserve_names ON public.stores;
--   DROP TRIGGER IF EXISTS redirects_reserve_names ON public.store_slug_redirects;
--   DROP FUNCTION IF EXISTS public.reserve_store_name(text, uuid);
--   DROP FUNCTION IF EXISTS public.stores_reserve_names();
--   DROP FUNCTION IF EXISTS public.redirects_reserve_names();
--   DROP TABLE IF EXISTS public.store_name_reservations;
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.reject_cashier_discount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.acting_staff_role() = 'cashier' AND COALESCE(NEW.discount_amount, 0) <> 0 THEN
    RAISE EXCEPTION 'cashier_discount_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_reject_cashier_discount ON public.sales;
CREATE TRIGGER sales_reject_cashier_discount
  BEFORE INSERT OR UPDATE OF discount_amount ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_cashier_discount();

CREATE TABLE IF NOT EXISTS public.store_name_reservations (
  name text PRIMARY KEY,
  store_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_name_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_name_reservations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_store_name(p_name text, p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_updated int;
BEGIN
  IF v_name = '' OR p_store_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.store_name_reservations (name, store_id)
  VALUES (v_name, p_store_id)
  ON CONFLICT (name) DO UPDATE
    SET store_id = EXCLUDED.store_id
  WHERE public.store_name_reservations.store_id = EXCLUDED.store_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'store_name_taken' USING ERRCODE = '23505';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_store_name(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.stores_reserve_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.reserve_store_name(NEW.store_slug, NEW.id);
  PERFORM public.reserve_store_name(NEW.subdomain, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_reserve_names ON public.stores;
CREATE TRIGGER stores_reserve_names
  AFTER INSERT OR UPDATE OF store_slug, subdomain ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.stores_reserve_names();

CREATE OR REPLACE FUNCTION public.redirects_reserve_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.reserve_store_name(NEW.old_slug, NEW.store_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redirects_reserve_names ON public.store_slug_redirects;
CREATE TRIGGER redirects_reserve_names
  AFTER INSERT OR UPDATE OF old_slug, store_id ON public.store_slug_redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.redirects_reserve_names();

-- Refuse to hide an existing collision. Backfill only when each label has one store.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT lower(btrim(store_slug)) AS name, id AS store_id
          FROM public.stores
         WHERE store_slug IS NOT NULL AND btrim(store_slug) <> ''
        UNION ALL
        SELECT lower(btrim(subdomain)), id
          FROM public.stores
         WHERE subdomain IS NOT NULL AND btrim(subdomain) <> ''
        UNION ALL
        SELECT lower(btrim(old_slug)), store_id
          FROM public.store_slug_redirects
         WHERE old_slug IS NOT NULL AND btrim(old_slug) <> ''
      ) AS names
     GROUP BY name
    HAVING count(DISTINCT store_id) > 1
  ) THEN
    RAISE EXCEPTION 'store_name_collision' USING ERRCODE = '23505';
  END IF;
END $$;

INSERT INTO public.store_name_reservations (name, store_id)
SELECT name, store_id
  FROM (
    SELECT lower(btrim(store_slug)) AS name, id AS store_id
      FROM public.stores
     WHERE store_slug IS NOT NULL AND btrim(store_slug) <> ''
    UNION
    SELECT lower(btrim(subdomain)), id
      FROM public.stores
     WHERE subdomain IS NOT NULL AND btrim(subdomain) <> ''
    UNION
    SELECT lower(btrim(old_slug)), store_id
      FROM public.store_slug_redirects
     WHERE old_slug IS NOT NULL AND btrim(old_slug) <> ''
  ) AS names
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.storefront_inventory_queue
  ADD COLUMN IF NOT EXISTS dead_at timestamptz;

CREATE OR REPLACE FUNCTION public.process_storefront_inventory_queue(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r record;
  v_ok int := 0;
  v_fail int := 0;
  v_attempts int;
  v_err text;
  v_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT q.paystack_reference
      FROM public.storefront_inventory_queue q
     WHERE q.dead_at IS NULL
       AND q.updated_at <= now() - make_interval(mins => LEAST(GREATEST(q.attempts, 1), 8))
     ORDER BY q.updated_at
     LIMIT v_limit
     FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.apply_storefront_inventory(r.paystack_reference);
      DELETE FROM public.storefront_inventory_queue
       WHERE paystack_reference = r.paystack_reference;
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
      UPDATE public.storefront_inventory_queue
         SET attempts = attempts + 1,
             last_error = left(v_err, 500),
             updated_at = now(),
             dead_at = CASE WHEN attempts + 1 >= 8 THEN now() ELSE NULL END
       WHERE paystack_reference = r.paystack_reference
       RETURNING attempts INTO v_attempts;
      v_fail := v_fail + 1;
      IF v_attempts >= 2 AND NOT EXISTS (
        SELECT 1
          FROM public.storefront_inventory_alerts a
         WHERE a.paystack_reference = r.paystack_reference
           AND a.created_at > now() - interval '1 hour'
      ) THEN
        INSERT INTO public.storefront_inventory_alerts (paystack_reference, attempts, last_error)
        VALUES (r.paystack_reference, v_attempts, left(v_err, 500));
      END IF;
      IF v_attempts >= 8 THEN
        PERFORM pg_notify('storefront_inventory_dead', r.paystack_reference);
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('applied', v_ok, 'failed', v_fail);
END;
$$;

REVOKE ALL ON FUNCTION public.process_storefront_inventory_queue(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_storefront_inventory_queue(integer) TO service_role;

COMMIT;
