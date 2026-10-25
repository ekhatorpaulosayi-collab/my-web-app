-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Builder note B6, second step.
--
-- DO NOT RUN until ALL of these are true:
--   * 20261025_06_storefront_inventory.sql has been run
--   * edge functions complete-storefront-order AND the updated
--     paystack-webhook-router (calls apply_storefront_inventory) are deployed
--   * this PR's frontend is what customers are using (it no longer calls
--     decrement_variant_quantity, decrement_product_quantity, upsert_customer,
--     or inserts promo_code_usage from the browser)
--
-- Not part of the 01 → 02 → 03 → 04 Stage A → 04b Stage B order.
-- Run this only after that sequence and the deploys above.
--
-- ROLLBACK:
--   GRANT EXECUTE ON FUNCTION public.decrement_variant_quantity(uuid, integer) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.decrement_product_quantity(uuid, integer) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.upsert_customer(text, text, text, text, bigint, date) TO anon, authenticated;
--   (recreate promo_usage_insert_checkout from 20261025_04 section 8 if you still need it)
-- =============================================================================
BEGIN;

-- Signatures are taken from pg_proc so a mismatch with the repo copy
-- (upsert_customer is text on live, uuid in an old script) does not abort.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'decrement_variant_quantity',
         'decrement_product_quantity',
         'upsert_customer'
       )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    RAISE NOTICE 'storefront write revoked from anon/authenticated: %', r.sig;
  END LOOP;
END $$;

DROP POLICY IF EXISTS promo_usage_insert_checkout ON public.promo_code_usage;
DROP POLICY IF EXISTS "Anyone can record promo code usage" ON public.promo_code_usage;

COMMIT;
