-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run AFTER 20261025_10_inventory_queue.sql and 20261025_06 (apply_storefront_inventory).
--
-- Replays queued Paystack references. A success deletes the queue row.
-- apply_storefront_inventory is idempotent via storefront_fulfillments, so a
-- replay does not decrement stock twice. A failure increments attempts and,
-- from the second failure on, writes one alert per reference per hour.
--
-- Paul can run it from psql (no JWT). The webhook calls it with the service
-- role. Signed-in shop users cannot.
--
--   SELECT public.process_storefront_inventory_queue(50);
--   SELECT paystack_reference, attempts, last_error, created_at
--     FROM public.storefront_inventory_alerts
--    ORDER BY created_at DESC
--    LIMIT 20;
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.process_storefront_inventory_queue(integer);
--   DROP TABLE IF EXISTS public.storefront_inventory_alerts;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.storefront_inventory_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paystack_reference text NOT NULL,
  attempts integer NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_inventory_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storefront_inventory_alerts FROM PUBLIC, anon, authenticated;

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
             updated_at = now()
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
    END;
  END LOOP;

  RETURN jsonb_build_object('applied', v_ok, 'failed', v_fail);
END;
$$;

REVOKE ALL ON FUNCTION public.process_storefront_inventory_queue(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_storefront_inventory_queue(integer) TO service_role;

COMMIT;
