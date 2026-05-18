-- update_kyc_after_approval: SECURITY DEFINER RPC for the 4 free-edit
-- fields on vendor_kyc. Used by /settings/payments/identity-verification/edit
-- post-approval form. BVN/NIN/photo edits NOT handled here — those route
-- to submit_kyc_v1 via the wizard.
--
-- Per spec §6.4 + §9.1: writes go through RPCs, not direct UPDATE.
-- Per spec §6.4: phone/business_category/cac_rc_number/business_address are
-- freely editable post-approval (no re-review).
--
-- Status-drift guard: re-checks status='approved' inside the RPC. If status
-- has drifted (e.g. merchant resubmitted in another tab), raises 'not_approved'.

CREATE OR REPLACE FUNCTION public.update_kyc_after_approval(
  p_store_id uuid,
  p_phone text,
  p_business_category text,
  p_cac_rc_number text DEFAULT NULL,
  p_business_address text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid text;
  v_owner_uid text;
  v_current_status text;
  v_kyc_id uuid;
BEGIN
  -- 1. Authorization: caller must own the store.
  v_caller_uid := (auth.uid())::text;
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized: not signed in';
  END IF;

  SELECT user_id INTO v_owner_uid
  FROM stores WHERE id = p_store_id;
  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized: store not found';
  END IF;
  IF v_owner_uid <> v_caller_uid THEN
    RAISE EXCEPTION 'unauthorized: store not owned by user';
  END IF;

  -- 2. Status guard: must be approved.
  SELECT id, status INTO v_kyc_id, v_current_status
  FROM vendor_kyc
  WHERE store_id = p_store_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_kyc_id IS NULL THEN
    RAISE EXCEPTION 'no_kyc_record';
  END IF;
  IF v_current_status <> 'approved' THEN
    RAISE EXCEPTION 'not_approved';
  END IF;

  -- 3. Validate formats (mirror submit_kyc_v1 validation for consistency).
  IF p_phone IS NULL OR p_phone !~ '^\+234[789]\d{9}$' THEN
    RAISE EXCEPTION 'invalid_phone_format';
  END IF;
  IF p_business_category IS NULL OR p_business_category NOT IN
     ('retail', 'food', 'provision', 'services', 'online', 'other') THEN
    RAISE EXCEPTION 'invalid_business_category';
  END IF;

  -- 4. Direct UPDATE (no re-review).
  UPDATE vendor_kyc
  SET phone = p_phone,
      business_category = p_business_category,
      cac_rc_number = p_cac_rc_number,
      business_address = p_business_address,
      updated_at = now()
  WHERE id = v_kyc_id;

  RETURN json_build_object(
    'kyc_id', v_kyc_id,
    'status', v_current_status,
    'updated_at', now()
  );
END;
$$;

-- Permissions: authenticated users can call (RLS enforced inside function).
REVOKE ALL ON FUNCTION public.update_kyc_after_approval(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_kyc_after_approval(uuid, text, text, text, text) TO authenticated;
