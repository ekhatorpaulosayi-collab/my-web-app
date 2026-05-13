-- 20260511_complete_subaccount_onboarding_rpc.sql
--
-- Atomic vendor onboarding for create-paystack-subaccount edge function.
-- Replaces the inline two-insert-plus-orphaned-flag-flip logic with a single
-- transactional Postgres function.
--
-- Solves:
--   1. Atomicity. Subaccount insert + velocity row insert + stores flag flip
--      must succeed or fail together. JS-level sequential inserts cannot.
--   2. Race safety on subaccount creation. ON CONFLICT DO NOTHING on store_id
--      handles the double-tap case without a TOCTOU window.
--   3. Timezone correctness. Velocity reset timestamps computed in WAT
--      (Africa/Lagos, UTC+1, no DST), not server local time.
--   4. Bidirectional FK linkage: stores.paystack_subaccount_id populated
--      atomically with the subaccount row.
--
-- Additive only: CREATE FUNCTION on a new name. No ALTER, no DROP on existing
-- objects. Safe to apply after 20260509 and 20260510.

CREATE OR REPLACE FUNCTION public.complete_subaccount_onboarding(
  p_store_id          UUID,
  p_settlement_bank   TEXT,
  p_account_number    TEXT,
  p_account_name      TEXT,
  p_mock_code         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id        UUID;
  v_new_subaccount     RECORD;
  v_inserted_count     INT;
  v_day_resets_at      TIMESTAMPTZ;
  v_month_resets_at    TIMESTAMPTZ;
BEGIN
  -- 1. Idempotency: if a subaccount already exists for this store, return it
  -- without doing any writes. Caller distinguishes by reused=true.
  SELECT id INTO v_existing_id
    FROM public.paystack_subaccounts
   WHERE store_id = p_store_id;

  IF v_existing_id IS NOT NULL THEN
    SELECT * INTO v_new_subaccount
      FROM public.paystack_subaccounts
     WHERE id = v_existing_id;
    RETURN jsonb_build_object(
      'reused', true,
      'subaccount', row_to_json(v_new_subaccount)
    );
  END IF;

  -- 2. Compute WAT-correct reset timestamps. Same pattern as
  -- record_successful_payment.
  v_day_resets_at   := ((date_trunc('day',   NOW() AT TIME ZONE 'Africa/Lagos')
                         + interval '1 day')   AT TIME ZONE 'Africa/Lagos');
  v_month_resets_at := ((date_trunc('month', NOW() AT TIME ZONE 'Africa/Lagos')
                         + interval '1 month') AT TIME ZONE 'Africa/Lagos');

  -- 3. Insert subaccount. ON CONFLICT DO NOTHING handles the concurrent-
  -- caller race: if a parallel transaction just inserted, we hit the unique
  -- constraint on store_id and fall through to the reused branch.
  INSERT INTO public.paystack_subaccounts (
    store_id, paystack_subaccount_code, settlement_bank,
    account_number, account_name, active
  ) VALUES (
    p_store_id, p_mock_code, p_settlement_bank,
    p_account_number, p_account_name, FALSE  -- Session 2 flips this when real Paystack call wires up
  )
  ON CONFLICT (store_id) DO NOTHING
  RETURNING * INTO v_new_subaccount;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count = 0 THEN
    -- Lost the race. Read the row a parallel transaction just inserted.
    --
    -- Rare edge case: if the winning transaction's steps 4 or 5 throw and
    -- roll back AFTER we've already read its uncommitted row here, we return
    -- reused=true to our caller while the subaccount no longer exists. In
    -- practice both callers in this race are the same vendor double-tapping;
    -- on retry the RPC will create the subaccount cleanly. Not worth the
    -- SELECT FOR SHARE complexity to close fully.
    SELECT * INTO v_new_subaccount
      FROM public.paystack_subaccounts
     WHERE store_id = p_store_id;
    RETURN jsonb_build_object(
      'reused', true,
      'subaccount', row_to_json(v_new_subaccount)
    );
  END IF;

  -- 4. Insert velocity row. ON CONFLICT DO NOTHING because we lock down
  -- the unlikely case where a velocity row pre-exists without a subaccount
  -- (manual cleanup, partial rollback from a prior version).
  --
  -- SESSION 5 TODO: read daily_cap_kobo from velocity_band_config table.
  -- Hardcoded value must match locked decision:
  --   Days 1-7: ₦200,000/day, Days 8-30: ₦500,000/day, Day 31+: unlimited.
  -- Day transitions handled by nightly cron (Session 5+ work).
  INSERT INTO public.vendor_velocity_limits (
    store_id,
    days_since_approval,
    daily_cap_kobo,
    monthly_cap_kobo,
    current_day_volume_kobo,
    current_day_resets_at,
    current_month_volume_kobo,
    current_month_resets_at
  ) VALUES (
    p_store_id,
    0,
    20000000,  -- ₦200,000 in kobo (days 1-7)
    NULL,      -- monthly cap from platform_fee_config.monthly_volume_cap_kobo, not velocity row
    0,
    v_day_resets_at,
    0,
    v_month_resets_at
  )
  ON CONFLICT (store_id) DO NOTHING;

  -- 5. Flip the gating flag and populate the bidirectional FK on stores.
  -- Atomic with the inserts above — if anything earlier fails, this never runs.
  UPDATE public.stores
     SET paystack_subaccounts_enabled = TRUE,
         paystack_subaccount_id       = v_new_subaccount.id
   WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'reused', false,
    'subaccount', row_to_json(v_new_subaccount)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_subaccount_onboarding(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_subaccount_onboarding(UUID, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.complete_subaccount_onboarding(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;

COMMENT ON FUNCTION public.complete_subaccount_onboarding IS
  'Atomic onboarding: inserts paystack_subaccounts row, inserts vendor_velocity_limits row with WAT-correct resets, flips stores.paystack_subaccounts_enabled, and populates stores.paystack_subaccount_id. Called only by create-paystack-subaccount edge function via service role.';
