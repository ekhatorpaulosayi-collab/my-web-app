-- Migration: extend record_successful_payment RPC to dual-write
-- a row into the sales table per order_items row, and upsert the
-- customer record on charge.success.
--
-- Rationale: existing dashboards (Today's Revenue, Sales History,
-- profit analytics, daily report emails, AI business summaries)
-- all read from the sales table. F3 (initiate-storefront-payment)
-- writes to orders/order_items/paystack_split_transactions only.
-- Without this dual-write, card payments would be invisible in
-- every existing reporting surface.
--
-- See docs/PAYSTACK-SUBACCOUNTS-DESIGN.md §6 and the Session 6
-- audit reports (schema_reconcile, trigger_verification).
--
-- Locked decisions (Session 6):
--   D1. Option 2: webhook dual-writes into sales.
--   D3. Add (a) sales INSERT and (c) upsert_customer to this RPC.
--   D4. promo_code_usage stays browser-side (F3 doesn't carry promo).
--   D5. variant_id hardcoded NULL (order_items lacks variant_id).
--   D6. discount_amount hardcoded 0 (F3 doesn't carry discount).
--   D7. Fail-loud on missing products (validate_sale_product trigger
--       rolls back the whole webhook, Paystack retries).
--   D8. sale_date/sale_time use CURRENT_DATE/CURRENT_TIME at fire time.
--
-- Deferred (Option A, filed as separate tickets):
--   - decrement_product_quantity called from frontend but RPC doesn't
--     exist. Silently failing since shipped. Storehouse storefront
--     inventory has never decremented on online-store orders. Fix is
--     a separate scope.
--
-- Idempotency: inherited from the existing paystack_webhook_events
--   claim primitive at the top of the function.
-- Atomicity: same transaction as the existing orders/split/velocity
--   updates. Any failure (e.g., validate_sale_product trigger raises
--   on a missing product, upsert_customer fails) rolls back the
--   entire delivery, including the claim row, so Paystack retries
--   can succeed.
-- Inertness: although ENABLE_PAYSTACK_SUBACCOUNTS is currently true
--   in production (flipped earlier in Session 6), no customer-facing
--   surface drives F3 yet. The 8 pending paystack_split_transactions
--   rows cannot fire new webhook events on their own. Migration is
--   safe to deploy in this window before Cart.tsx ships a Pay-with-
--   Card button.

CREATE OR REPLACE FUNCTION public.record_successful_payment(
  p_reference text,
  p_event_type text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_split RECORD;
  v_inserted_count INT;
  v_order RECORD;
BEGIN
  -- 1. Atomic claim. ON CONFLICT DO NOTHING is the claim primitive: only
  -- the first delivery for a (reference, event_type) inserts a row.
  INSERT INTO public.paystack_webhook_events
    (paystack_reference, event_type, payload, processed_at)
  VALUES
    (p_reference, p_event_type, p_payload, NULL)
  ON CONFLICT (paystack_reference, event_type) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count = 0 THEN
    RETURN jsonb_build_object('already_processed', true);
  END IF;

  -- 2. Idempotent order + split updates (eq status='pending' makes retries
  -- safe even outside this function, but inside the claim they should only
  -- ever run once).
  UPDATE public.orders
     SET status = 'paid', paid_at = NOW()
   WHERE paystack_reference = p_reference
     AND status = 'pending';

  UPDATE public.paystack_split_transactions
     SET status = 'success', settled_at = NOW()
   WHERE paystack_reference = p_reference
     AND status = 'pending';

  -- 3. Velocity counter update per split row. FOR UPDATE locks each velocity
  -- row for the rest of this transaction, serializing concurrent webhooks
  -- for the same vendor and eliminating the read-modify-write race.
  --
  -- WAT (Africa/Lagos) is the authoritative timezone for daily/monthly
  -- reset boundaries. Africa/Lagos has no DST.
  FOR v_split IN
    SELECT store_id, amount_total_kobo
      FROM public.paystack_split_transactions
     WHERE paystack_reference = p_reference
  LOOP
    PERFORM 1
       FROM public.vendor_velocity_limits
      WHERE store_id = v_split.store_id
      FOR UPDATE;

    UPDATE public.vendor_velocity_limits v
       SET
         current_day_volume_kobo =
           CASE WHEN v.current_day_resets_at <= NOW()
                THEN v_split.amount_total_kobo
                ELSE v.current_day_volume_kobo + v_split.amount_total_kobo
           END,
         current_day_resets_at =
           CASE WHEN v.current_day_resets_at <= NOW()
                THEN ((date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos')
                       + interval '1 day') AT TIME ZONE 'Africa/Lagos')
                ELSE v.current_day_resets_at
           END,
         current_month_volume_kobo =
           CASE WHEN v.current_month_resets_at <= NOW()
                THEN v_split.amount_total_kobo
                ELSE v.current_month_volume_kobo + v_split.amount_total_kobo
           END,
         current_month_resets_at =
           CASE WHEN v.current_month_resets_at <= NOW()
                THEN ((date_trunc('month', NOW() AT TIME ZONE 'Africa/Lagos')
                       + interval '1 month') AT TIME ZONE 'Africa/Lagos')
                ELSE v.current_month_resets_at
           END,
         updated_at = NOW()
     WHERE v.store_id = v_split.store_id;
  END LOOP;

  -- 3.5 Dashboard denormalization (Session 6, Option 2).
  -- Write one sales row per order_items row tied to this reference,
  -- so existing dashboards see card-paid storefront orders without
  -- being rewritten to read from orders+order_items.
  --
  -- Filter to NON-NULL product_id: validate_sale_product trigger
  -- raises on NULL product_id. F3 allows order_items.product_id to
  -- be NULL for free-text items, which would block the entire
  -- webhook. Real Cart.tsx usage passes catalog UUIDs; this filter
  -- is a no-op in the happy path but defensive against the 8
  -- existing smoke-test rows (all product_id NULL) and any future
  -- free-text item path.
  --
  -- Trigger interaction: validate_sale_product BEFORE INSERT FOR
  -- EACH ROW will reject any row whose product_id is NULL or whose
  -- product no longer exists in public.products. Fail-loud per D7:
  -- a missing product rolls back the whole webhook and Paystack
  -- retries, surfacing the data-integrity issue.
  --
  -- Hardcoded values per D5/D6: discount_amount=0 (F3 doesn't carry
  -- discount today), variant_id NULL (order_items doesn't carry
  -- variant_id today). Both are separate-scope schema extensions.
  INSERT INTO public.sales (
    user_id, product_id, product_name, quantity,
    unit_price, total_amount, discount_amount, final_amount,
    customer_name, customer_phone, customer_email,
    payment_method, payment_status,
    amount_paid, amount_due,
    sale_date, sale_time, sale_channel, notes
  )
  SELECT
    s.user_id,
    oi.product_id::text,
    oi.product_name,
    oi.quantity,
    oi.unit_price_kobo,
    oi.total_price_kobo,
    0,
    oi.total_price_kobo,
    o.customer_name, o.customer_phone, o.customer_email,
    'card', 'paid',
    oi.total_price_kobo, 0,
    CURRENT_DATE, CURRENT_TIME, 'online-store',
    'Paystack ref: ' || o.paystack_reference
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.stores s ON s.id = oi.store_id
  WHERE o.paystack_reference = p_reference
    AND oi.product_id IS NOT NULL;

  -- 3.6 Customer record (Session 6, Option 2).
  -- One upsert per order. The customer is only "real" once their
  -- payment cleared, which is what charge.success confirms. For the
  -- WhatsApp/manual path, this stays in onlineStoreSales.ts (pre-
  -- existing behavior). For the card path under Option 2, the
  -- webhook is the authoritative source.
  --
  -- order_amount uses total_amount_kobo directly (upsert_customer
  -- accepts bigint p_order_amount). order_date uses CURRENT_DATE at
  -- webhook fire time per D8.
  --
  -- One row per order (not per order_items row): for marketplace
  -- multi-vendor orders this would still be one customer record per
  -- order regardless of vendor count. Storefront orders are single-
  -- vendor today.
  FOR v_order IN
    SELECT o.customer_name, o.customer_phone, o.customer_email,
           o.total_amount_kobo, s.user_id
      FROM public.orders o
      JOIN public.stores s ON s.id = o.primary_store_id
     WHERE o.paystack_reference = p_reference
  LOOP
    PERFORM public.upsert_customer(
      p_user_id := v_order.user_id,
      p_customer_name := v_order.customer_name,
      p_customer_phone := v_order.customer_phone,
      p_customer_email := v_order.customer_email,
      p_order_amount := v_order.total_amount_kobo,
      p_order_date := CURRENT_DATE
    );
  END LOOP;

  -- 4. Mark webhook event processed.
  UPDATE public.paystack_webhook_events
     SET processed_at = NOW()
   WHERE paystack_reference = p_reference
     AND event_type = p_event_type;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_successful_payment(text, text, jsonb)
  TO service_role;
