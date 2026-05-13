-- 20260510_record_successful_payment_rpc.sql
--
-- Atomic webhook event processing for paystack-subaccount-webhook.
-- Replaces the inline claim/update/velocity-increment logic in the edge
-- function with a single transactional Postgres function.
--
-- Solves:
--   1. Atomic webhook claim (ON CONFLICT DO NOTHING acts as the claim).
--   2. Read-modify-write race on vendor_velocity_limits (SELECT FOR UPDATE
--      serializes concurrent webhooks for the same vendor).
--   3. Timezone correctness — resets use Africa/Lagos (WAT, UTC+1, no DST),
--      not server local time.
--
-- Additive only: CREATE FUNCTION on a new name. No ALTER, no DROP on existing
-- objects. Safe to apply after 20260509_paystack_subaccounts_foundation.sql.

CREATE OR REPLACE FUNCTION public.record_successful_payment(
  p_reference  TEXT,
  p_event_type TEXT,
  p_payload    JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
  v_inserted_count INT;
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

  -- 4. Mark webhook event processed.
  UPDATE public.paystack_webhook_events
     SET processed_at = NOW()
   WHERE paystack_reference = p_reference
     AND event_type = p_event_type;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Service role is the only caller (edge functions use service role key).
-- No GRANT to authenticated/anon — never callable from client.
REVOKE ALL ON FUNCTION public.record_successful_payment(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_successful_payment(TEXT, TEXT, JSONB) FROM authenticated;
REVOKE ALL ON FUNCTION public.record_successful_payment(TEXT, TEXT, JSONB) FROM anon;

COMMENT ON FUNCTION public.record_successful_payment IS
  'Atomic webhook handler for Paystack charge.success events. Claims the event, marks order paid, marks split success, and increments velocity counters under row lock. Called only by paystack-subaccount-webhook edge function via service role.';
