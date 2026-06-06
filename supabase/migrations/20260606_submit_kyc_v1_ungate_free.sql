-- Step — ungate Free tier for KYC submission (punch-list #2, Option A).
-- Spec: docs/KYC_V1_SPEC.md §4.1 (tier gate removed per product decision
--       to ship Free-tier card payments — see CLAUDE.md "Session 11").
--
-- WHAT CHANGED vs 20260515_submit_kyc_v1_rpc.sql:
--   The paid-tier gate is REMOVED. Previously submit_kyc_v1 required a
--   starter|pro subscription and raised 'subscription_required' otherwise,
--   which made the Free card-payment flow unreachable (UI + this RPC still
--   blocked Free even though F2/F3 edge guards were already removed).
--   Specifically removed:
--     - the `v_has_paid_tier boolean` DECLARE
--     - the `SELECT EXISTS(... tier_id IN ('starter','pro') ...) INTO v_has_paid_tier`
--     - the `IF NOT v_has_paid_tier THEN RAISE EXCEPTION 'subscription_required'`
--   `v_has_paid_tier` is referenced nowhere else in the function, so removing
--   it leaves the rest of the body byte-identical.
--
-- WHAT IS UNCHANGED (intentionally):
--   Ownership check, p_confirmation_accepted, BVN/NIN/phone/business_category
--   format validation, the already-pending / frozen blocks, the resubmission
--   cap (5), and the upsert. CREATE OR REPLACE preserves the existing EXECUTE
--   ACL — no GRANT/REVOKE is issued here (none existed on this function in the
--   original migration either).
--
-- Flow (now):
--   1. Verify caller owns the store
--   2. Validate confirmation acceptance
--   3. Format-validate BVN/NIN/phone/business_category
--   4. Block if there's an existing pending or frozen row
--   5. Block if there's a rejected row with submission_count >= 5
--   6. Upsert on store_id — encrypt BVN/NIN, clear prior rejection metadata
--
-- Returns JSON: { kyc_id, status, submission_count }

CREATE OR REPLACE FUNCTION submit_kyc_v1(
  p_store_id uuid,
  p_bvn text,
  p_nin text,
  p_phone text,
  p_business_category text,
  p_selfie_url text,
  p_cac_rc_number text DEFAULT NULL,
  p_business_address text DEFAULT NULL,
  p_confirmation_accepted boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_existing_status text;
  v_submission_count int;
  v_kyc_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Ownership check.
  -- stores.user_id is text (legacy schema). Cast auth.uid() (uuid)
  -- to text for the comparison to match existing codebase patterns
  -- (F2 ownership check, F1 RLS policy paystack_subaccounts_vendor_select).
  IF NOT EXISTS (
    SELECT 1 FROM stores
    WHERE id = p_store_id AND user_id = v_user_id::text
  ) THEN
    RAISE EXCEPTION 'unauthorized: store not owned by user';
  END IF;

  -- Confirmation check
  IF NOT p_confirmation_accepted THEN
    RAISE EXCEPTION 'confirmation_required';
  END IF;

  -- Format validation
  IF p_bvn !~ '^2\d{10}$' THEN
    RAISE EXCEPTION 'invalid_bvn_format';
  END IF;

  IF p_nin !~ '^\d{11}$' THEN
    RAISE EXCEPTION 'invalid_nin_format';
  END IF;

  IF p_bvn = p_nin THEN
    RAISE EXCEPTION 'bvn_nin_identical';
  END IF;

  IF p_phone !~ '^\+234[789]\d{9}$' THEN
    RAISE EXCEPTION 'invalid_phone_format';
  END IF;

  IF p_business_category NOT IN ('retail', 'food', 'provision', 'services', 'online', 'other') THEN
    RAISE EXCEPTION 'invalid_business_category';
  END IF;

  -- Check existing status
  SELECT status, submission_count
  INTO v_existing_status, v_submission_count
  FROM vendor_kyc
  WHERE store_id = p_store_id;

  -- Block if pending or hard-frozen
  IF v_existing_status = 'submitted' THEN
    RAISE EXCEPTION 'already_pending';
  END IF;

  IF v_existing_status = 'frozen' THEN
    RAISE EXCEPTION 'account_frozen_contact_support';
  END IF;

  -- Check resubmission limit (5 max)
  IF v_existing_status = 'rejected' AND v_submission_count >= 5 THEN
    RAISE EXCEPTION 'max_resubmissions_exceeded';
  END IF;

  -- Insert or update
  INSERT INTO vendor_kyc (
    store_id,
    bvn_encrypted,
    nin_encrypted,
    phone,
    business_category,
    selfie_url,
    cac_rc_number,
    business_address,
    status,
    submitted_at,
    submission_count,
    confirmation_accepted_at
  ) VALUES (
    p_store_id,
    encrypt_vendor_kyc_field(p_bvn),
    encrypt_vendor_kyc_field(p_nin),
    p_phone,
    p_business_category,
    p_selfie_url,
    p_cac_rc_number,
    p_business_address,
    'submitted',
    now(),
    1,
    now()
  )
  ON CONFLICT (store_id) DO UPDATE
  SET
    bvn_encrypted = encrypt_vendor_kyc_field(p_bvn),
    nin_encrypted = encrypt_vendor_kyc_field(p_nin),
    phone = p_phone,
    business_category = p_business_category,
    selfie_url = p_selfie_url,
    cac_rc_number = p_cac_rc_number,
    business_address = p_business_address,
    status = 'submitted',
    submitted_at = now(),
    submission_count = vendor_kyc.submission_count + 1,
    confirmation_accepted_at = now(),
    -- Clear previous rejection
    rejection_category = NULL,
    reviewer_notes_merchant = NULL,
    reviewer_notes = NULL,
    reviewed_by = NULL,
    reviewed_at = NULL
  RETURNING id INTO v_kyc_id;

  RETURN json_build_object(
    'kyc_id', v_kyc_id,
    'status', 'submitted',
    'submission_count', COALESCE(v_submission_count + 1, 1)
  );
END;
$$;
