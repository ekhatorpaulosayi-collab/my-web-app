-- Step 3d — grant_velocity_override RPC.
-- Spec: docs/KYC_V1_SPEC.md §4.4
--
-- Admin-only velocity override grant. SECURITY DEFINER. Phase 1
-- relies on the grant model (called from bash scripts via the
-- service-role key). Phase 2 may add explicit reviewer-role check.
--
-- Validation:
--   reason_required           — p_reason is NULL or empty
--   at_least_one_cap_required — all 3 cap columns NULL
--
-- The table-level at_least_one_override CHECK constraint provides
-- a second line of defense, but we raise the cleaner application
-- error first.
--
-- auth.uid() is captured as created_by_user_id for audit trail
-- even though no ownership check happens here.
--
-- Returns: { override_id, expires_at }

CREATE OR REPLACE FUNCTION grant_velocity_override(
  p_store_id uuid,
  p_daily_cap_kobo bigint DEFAULT NULL,
  p_monthly_cap_kobo bigint DEFAULT NULL,
  p_single_txn_cap_kobo bigint DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_override_id uuid;
BEGIN
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF p_daily_cap_kobo IS NULL AND p_monthly_cap_kobo IS NULL AND p_single_txn_cap_kobo IS NULL THEN
    RAISE EXCEPTION 'at_least_one_cap_required';
  END IF;

  INSERT INTO vendor_velocity_overrides (
    store_id, daily_cap_kobo, monthly_cap_kobo, single_txn_cap_kobo,
    expires_at, reason, created_by_user_id
  ) VALUES (
    p_store_id, p_daily_cap_kobo, p_monthly_cap_kobo, p_single_txn_cap_kobo,
    p_expires_at, p_reason, auth.uid()
  )
  RETURNING id INTO v_override_id;

  RETURN json_build_object(
    'override_id', v_override_id,
    'expires_at', p_expires_at
  );
END;
$$;
