-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Builder note B6. Card payments confirmed by record_successful_payment were
-- not decrementing stock (see 20260527 comment). This adds an idempotent
-- function the webhook calls after the payment RPC.
--
-- It does NOT revoke anon EXECUTE. That is 20261025_07, and only after
-- complete-storefront-order is deployed. Running 07 first breaks the old
-- storefront client.
--
-- Safe to run with Stage A. Does not touch chat policies.
-- ROLLBACK: DROP FUNCTION public.apply_storefront_inventory(text);
--           DROP TABLE public.storefront_fulfillments;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.storefront_fulfillments (
  paystack_reference text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_fulfillments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storefront_fulfillments FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_storefront_inventory(p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_inserted int;
  v_item record;
  v_notes text;
  v_notes_json jsonb;
  v_promo jsonb;
  v_discount bigint;
  v_order_total bigint;
  v_final bigint;
BEGIN
  IF p_reference IS NULL OR length(p_reference) < 6 THEN
    RAISE EXCEPTION 'bad reference';
  END IF;

  INSERT INTO public.storefront_fulfillments (paystack_reference)
  VALUES (p_reference)
  ON CONFLICT (paystack_reference) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('already_applied', true);
  END IF;

  SELECT o.notes INTO v_notes
    FROM public.orders o
   WHERE o.paystack_reference = p_reference
   LIMIT 1;

  IF v_notes IS NOT NULL AND left(btrim(v_notes), 1) = '{' THEN
    v_notes_json := v_notes::jsonb;
  END IF;

  IF v_notes_json IS NOT NULL AND jsonb_typeof(v_notes_json -> 'inventory') = 'array' THEN
    FOR v_item IN
      SELECT *
        FROM jsonb_to_recordset(v_notes_json -> 'inventory')
          AS x(product_id uuid, variant_id uuid, quantity integer)
    LOOP
      IF v_item.variant_id IS NOT NULL THEN
        PERFORM public.decrement_variant_quantity(v_item.variant_id, v_item.quantity);
      ELSIF v_item.product_id IS NOT NULL THEN
        PERFORM public.decrement_product_quantity(v_item.product_id, v_item.quantity);
      END IF;
    END LOOP;
  ELSE
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
       WHERE o.paystack_reference = p_reference
         AND oi.product_id IS NOT NULL
    LOOP
      PERFORM public.decrement_product_quantity(v_item.product_id, v_item.quantity);
    END LOOP;
  END IF;

  -- Promo is recorded only when initiate-storefront-payment stored a
  -- server-computed discount in orders.notes. Client-supplied amounts are ignored.
  v_promo := v_notes_json -> 'promo';
  IF v_promo IS NOT NULL AND (v_promo ->> 'promo_code_id') IS NOT NULL THEN
    v_order_total := (v_promo ->> 'order_total')::bigint;
    v_discount := (v_promo ->> 'discount_amount')::bigint;
    v_final := (v_promo ->> 'final_total')::bigint;
    IF v_order_total >= 0 AND v_discount >= 0 AND v_discount <= v_order_total
       AND v_final = v_order_total - v_discount THEN
      INSERT INTO public.promo_code_usage (
        promo_code_id, order_total, discount_amount, final_total,
        customer_name, customer_phone
      )
      SELECT
        (v_promo ->> 'promo_code_id')::uuid,
        v_order_total, v_discount, v_final,
        v_promo ->> 'customer_name',
        v_promo ->> 'customer_phone'
      WHERE EXISTS (
        SELECT 1 FROM public.promo_codes pc
         WHERE pc.id = (v_promo ->> 'promo_code_id')::uuid
      );
      UPDATE public.promo_codes
         SET used_count = coalesce(used_count, 0) + 1
       WHERE id = (v_promo ->> 'promo_code_id')::uuid;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_storefront_inventory(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_storefront_inventory(text) TO service_role;

COMMIT;
