-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run after 20261025_06. Replaces the stock functions from that file.
-- Do not re-run 06 after this file: 06 would put the unscoped bodies back.
--
-- Stock moves only for products owned by the paid order's store.
-- order_items is the source. orders.notes is not.
-- A reference with no server lines does not insert a fulfilment claim.
-- decrement_storefront_lines and decrement_product_quantity now refuse
-- every call. Use decrement_owned_lines.
--
-- ROLLBACK: restore is not provided. Re-applying 06 restores the unscoped
-- bodies and re-opens the cross-store stock path. Do not do that.
-- =============================================================================
BEGIN;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid;

CREATE OR REPLACE FUNCTION public.decrement_product_quantity(
  p_product_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'unscoped_stock_change' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_quantity(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_quantity(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.decrement_storefront_lines(p_lines jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'unscoped_stock_change' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_storefront_lines(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_storefront_lines(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.decrement_owned_lines(
  p_owner_user_id text,
  p_lines jsonb
)
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
  IF p_owner_user_id IS NULL OR btrim(p_owner_user_id) = '' THEN
    RAISE EXCEPTION 'missing_owner' USING ERRCODE = '23514';
  END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) < 1 THEN
    RAISE EXCEPTION 'bad_items' USING ERRCODE = '23514';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_qty := (v_line ->> 'quantity')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 10000 THEN
      RAISE EXCEPTION 'bad_quantity' USING ERRCODE = '23514';
    END IF;
    v_product := NULLIF(v_line ->> 'product_id', '')::uuid;
    v_variant := NULLIF(v_line ->> 'variant_id', '')::uuid;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'bad_items' USING ERRCODE = '23514';
    END IF;

    IF v_variant IS NOT NULL THEN
      UPDATE public.product_variants AS v
         SET quantity = v.quantity - v_qty
        FROM public.products AS p
       WHERE v.id = v_variant
         AND v.product_id = v_product
         AND p.id = v_product
         AND p.user_id::text = p_owner_user_id
         AND v.user_id::text = p_owner_user_id
         AND v.quantity >= v_qty;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '23514';
      END IF;
    ELSE
      UPDATE public.products
         SET quantity = quantity - v_qty
       WHERE id = v_product
         AND user_id::text = p_owner_user_id
         AND quantity >= v_qty;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_owned_lines(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_owned_lines(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_storefront_inventory(p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted int;
  v_count int;
  v_item record;
BEGIN
  IF p_reference IS NULL OR length(p_reference) < 6 THEN
    RAISE EXCEPTION 'bad reference';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM public.order_items AS oi
    JOIN public.orders AS o ON o.id = oi.order_id
    JOIN public.stores AS s ON s.id = o.primary_store_id
    JOIN public.products AS p ON p.id = oi.product_id
   WHERE o.paystack_reference = p_reference
     AND oi.store_id = o.primary_store_id
     AND p.user_id::text = s.user_id::text;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'missing_order_lines' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.storefront_fulfillments (paystack_reference)
  VALUES (p_reference)
  ON CONFLICT (paystack_reference) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('already_applied', true);
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.variant_id, oi.quantity, s.user_id::text AS owner_id
      FROM public.order_items AS oi
      JOIN public.orders AS o ON o.id = oi.order_id
      JOIN public.stores AS s ON s.id = o.primary_store_id
      JOIN public.products AS p ON p.id = oi.product_id
     WHERE o.paystack_reference = p_reference
       AND oi.store_id = o.primary_store_id
       AND p.user_id::text = s.user_id::text
  LOOP
    PERFORM public.decrement_owned_lines(
      v_item.owner_id,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_item.product_id,
        'variant_id', v_item.variant_id,
        'quantity', v_item.quantity
      ))
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'lines', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_storefront_inventory(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_storefront_inventory(text) TO service_role;

COMMIT;
