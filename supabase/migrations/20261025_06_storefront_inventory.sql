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
-- Superseded for stock movement by 20261030_02_owned_inventory.sql.
-- If this file was already applied, run 20261030_02. Do not re-run this
-- file after 20261030_02.
-- Safe to run with Stage A. Does not touch chat policies.
-- Products without a variant use decrement_product_quantity. That
-- function is not on live, so this file creates it (service_role only)
-- before apply_storefront_inventory. A shortfall raises insufficient_stock.
--
-- A legacy checkout with several lines uses decrement_storefront_lines.
-- That function decrements every line in one transaction. A shortfall
-- raises insufficient_stock and undoes the earlier lines in that call.
--
-- ROLLBACK: DROP FUNCTION public.apply_storefront_inventory(text);
--           DROP FUNCTION public.decrement_storefront_lines(jsonb);
--           DROP FUNCTION public.decrement_product_quantity(uuid, integer);
--           DROP TABLE public.storefront_fulfillments;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.storefront_fulfillments (
  paystack_reference text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_fulfillments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storefront_fulfillments FROM PUBLIC, anon, authenticated;

-- Same rule as decrement_variant_quantity: subtract only when the row
-- still has enough stock. No updated row means the product is missing or
-- the sale would go negative, and the order must not continue.
CREATE OR REPLACE FUNCTION public.decrement_product_quantity(
  p_product_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.products
     SET quantity = quantity - p_quantity
   WHERE id = p_product_id
     AND quantity >= p_quantity;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '23514';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_quantity(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_quantity(uuid, integer) TO service_role;

-- One call, one transaction. complete-storefront-order uses this so a
-- later insufficient_stock does not leave the earlier lines decremented.
CREATE OR REPLACE FUNCTION public.decrement_storefront_lines(p_lines jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_line jsonb;
  v_qty integer;
  v_product uuid;
  v_variant uuid;
  v_updated integer;
BEGIN
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) < 1 THEN
    RAISE EXCEPTION 'bad_items' USING ERRCODE = '23514';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_qty := (v_line ->> 'quantity')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 10000 THEN
      RAISE EXCEPTION 'bad_quantity' USING ERRCODE = '23514';
    END IF;
    v_variant := NULLIF(v_line ->> 'variant_id', '')::uuid;
    v_product := NULLIF(v_line ->> 'product_id', '')::uuid;
    IF v_variant IS NOT NULL THEN
      UPDATE public.product_variants
         SET quantity = quantity - v_qty
       WHERE id = v_variant
         AND quantity >= v_qty;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '23514';
      END IF;
    ELSIF v_product IS NOT NULL THEN
      PERFORM public.decrement_product_quantity(v_product, v_qty);
    ELSE
      RAISE EXCEPTION 'bad_items' USING ERRCODE = '23514';
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_storefront_lines(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_storefront_lines(jsonb) TO service_role;

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
