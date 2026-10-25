-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run AFTER 20261025_09_staff_sessions.sql (this function calls
-- acting_staff_role()) and BEFORE the frontend that records sales.
--
-- Cashiers use the owner's JWT. Migration 09 hides sales from them and blocks
-- product edits, so the browser cannot insert a sale and then read it back,
-- and it cannot decrement products.quantity. This function does both in one
-- transaction and returns the id, so the client never SELECTs the new row.
--
-- One call is one line. public.sales is one row per item (there is no
-- sale_items table). A second call with the same client_sale_id returns the
-- existing id and does not decrement stock again.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.record_sale(text, text, integer, bigint, bigint, text, text, text, text, text, text, text, date, text, text, bigint, bigint);
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.record_sale(
  p_product_id text,
  p_product_name text,
  p_quantity integer,
  p_unit_price bigint,
  p_discount_amount bigint DEFAULT 0,
  p_client_sale_id text DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_payment_status text DEFAULT 'paid',
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_sale_date date DEFAULT NULL,
  p_sale_time text DEFAULT NULL,
  p_sale_channel text DEFAULT NULL,
  p_amount_paid bigint DEFAULT NULL,
  p_amount_due bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_existing uuid;
  v_id uuid;
  v_client text := NULLIF(btrim(COALESCE(p_client_sale_id, '')), '');
  v_discount bigint;
  v_total bigint;
  v_final bigint;
  v_channel text;
  v_owned int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '42501';
  END IF;

  v_role := public.acting_staff_role();
  IF v_role IS NOT NULL AND v_role NOT IN ('manager', 'cashier') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'product selection is required' USING ERRCODE = '23502';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 100000 THEN
    RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = '23514';
  END IF;
  IF p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'invalid_price' USING ERRCODE = '23514';
  END IF;

  v_discount := GREATEST(COALESCE(p_discount_amount, 0), 0);
  v_total := p_unit_price * p_quantity;
  IF v_discount > v_total THEN
    RAISE EXCEPTION 'discount_exceeds_total' USING ERRCODE = '23514';
  END IF;
  v_final := v_total - v_discount;

  v_channel := COALESCE(NULLIF(btrim(COALESCE(p_sale_channel, '')), ''), 'in-person');
  IF v_channel NOT IN ('in-person', 'online-store', 'wholesale', 'social-media', 'offline-sync') THEN
    RAISE EXCEPTION 'invalid_channel' USING ERRCODE = '23514';
  END IF;

  IF v_client IS NOT NULL THEN
    SELECT s.id INTO v_existing
      FROM public.sales s
     WHERE s.user_id = auth.uid()::text
       AND s.client_sale_id::text = v_client
     LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object(
        'id', v_existing,
        'client_sale_id', v_client,
        'already_recorded', true
      );
    END IF;
  END IF;

  UPDATE public.products
     SET quantity = COALESCE(quantity, 0) - p_quantity
   WHERE id::text = p_product_id
     AND user_id::text = auth.uid()::text;
  GET DIAGNOSTICS v_owned = ROW_COUNT;
  IF v_owned = 0 AND EXISTS (
    SELECT 1 FROM public.products WHERE id::text = p_product_id
  ) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sales (
    user_id, product_id, product_name, quantity,
    unit_price, total_amount, discount_amount, final_amount,
    customer_name, customer_phone, customer_email,
    payment_method, payment_status,
    amount_paid, amount_due,
    sale_date, sale_time, sale_channel, notes, client_sale_id
  ) VALUES (
    auth.uid()::text,
    p_product_id,
    COALESCE(NULLIF(btrim(COALESCE(p_product_name, '')), ''), 'Unknown Product'),
    p_quantity,
    p_unit_price,
    v_total,
    v_discount,
    v_final,
    NULLIF(btrim(COALESCE(p_customer_name, '')), ''),
    NULLIF(btrim(COALESCE(p_customer_phone, '')), ''),
    NULLIF(btrim(COALESCE(p_customer_email, '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(p_payment_method, '')), ''), 'cash'),
    COALESCE(NULLIF(btrim(COALESCE(p_payment_status, '')), ''), 'paid'),
    COALESCE(p_amount_paid, v_final),
    COALESCE(p_amount_due, 0),
    COALESCE(p_sale_date, (now() AT TIME ZONE 'Africa/Lagos')::date),
    COALESCE(NULLIF(btrim(COALESCE(p_sale_time, '')), ''), to_char(now() AT TIME ZONE 'Africa/Lagos', 'HH24:MI:SS')),
    v_channel,
    NULLIF(btrim(COALESCE(p_notes, '')), ''),
    v_client
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'client_sale_id', v_client,
    'already_recorded', false
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT s.id INTO v_existing
      FROM public.sales s
     WHERE s.user_id = auth.uid()::text
       AND v_client IS NOT NULL
       AND s.client_sale_id::text = v_client
     LIMIT 1;
    IF v_existing IS NULL THEN
      RAISE;
    END IF;
    RETURN jsonb_build_object(
      'id', v_existing,
      'client_sale_id', v_client,
      'already_recorded', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_sale(text, text, integer, bigint, bigint, text, text, text, text, text, text, text, date, text, text, bigint, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale(text, text, integer, bigint, bigint, text, text, text, text, text, text, text, date, text, text, bigint, bigint)
  TO authenticated;

COMMIT;
