-- Step 3a — submit_kyc_v1 RPC.
-- Spec: docs/KYC_V1_SPEC.md §4.1
--
-- Merchant-facing KYC submission. SECURITY DEFINER because it
-- needs to read vault-protected encryption keys (via the
-- encrypt_vendor_kyc_field helper). Ownership and tier gating
-- are enforced inside the function — the function trusts no
-- input from the caller's identity beyond auth.uid().
--
-- Flow:
--   1. Verify caller owns the store
--   2. Verify caller has a paid subscription (starter|pro)
--      with a non-expired period (7-day grace window)
--   3. Validate confirmation acceptance
--   4. Format-validate BVN/NIN/phone/business_category
--   5. Block if there's an existing pending or frozen row
--   6. Block if there's a rejected row with submission_count >= 5
--   7. Upsert on store_id — encrypt BVN/NIN, clear prior
--      rejection metadata
--
-- Returns JSON: { kyc_id, status, submission_count }
--
-- Email notification on success is handled by a separate trigger
-- or edge function (out of scope for this RPC).

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
  v_has_paid_tier boolean;
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

  -- Tier check (Option 1b — paid tiers only)
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = v_user_id
      AND us.tier_id IN ('starter', 'pro')
      AND us.status IN ('active', 'non_renewing', 'trialing', 'past_due')
      AND (us.current_period_end IS NULL OR us.current_period_end > now() - INTERVAL '7 days')
  ) INTO v_has_paid_tier;

  IF NOT v_has_paid_tier THEN
    RAISE EXCEPTION 'subscription_required';
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
