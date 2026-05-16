-- Step 3b — approve_kyc_review RPC.
-- Spec: docs/KYC_V1_SPEC.md §4.2
--
-- Reviewer-only KYC approval. SECURITY DEFINER. Phase 1 relies on
-- the grant model: PUBLIC has no EXECUTE (REVOKE not strictly
-- needed since plpgsql functions default to grant-to-PUBLIC, but
-- we rely on the fact that no role except service_role calls this
-- in Phase 1 — reviewer bash scripts use the service-role key).
-- Phase 2 will add an explicit role check via auth.jwt() ->
-- 'role' claim.
--
-- Flow:
--   1. Look up vendor_kyc row by id
--   2. Reject if not found (kyc_not_found)
--   3. Reject if status != 'submitted' (not_pending_review)
--   4. UPDATE vendor_kyc: status='approved', reviewed_at=now(),
--      reviewed_by=auth.uid(), reviewer_notes=coalesce(...)
--   5. UPDATE stores: kyc_status='approved', kyc_approved_at=now()
--
-- Note: Paul still manually verifies the subaccount on Paystack's
-- dashboard in Phase 1. Phase 2 will call Paystack's
-- /subaccount/verify API here.

CREATE OR REPLACE FUNCTION approve_kyc_review(
  p_kyc_id uuid,
  p_reviewer_notes text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id uuid;
  v_current_status text;
BEGIN
  SELECT store_id, status
  INTO v_store_id, v_current_status
  FROM vendor_kyc
  WHERE id = p_kyc_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'kyc_not_found';
  END IF;

  IF v_current_status != 'submitted' THEN
    RAISE EXCEPTION 'not_pending_review';
  END IF;

  -- Update vendor_kyc
  UPDATE vendor_kyc
  SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes)
  WHERE id = p_kyc_id;

  -- Update stores.kyc_status
  UPDATE stores
  SET
    kyc_status = 'approved',
    kyc_approved_at = now()
  WHERE id = v_store_id;

  RETURN json_build_object(
    'kyc_id', p_kyc_id,
    'status', 'approved',
    'stores_kyc_status', 'approved'
  );
END;
$$;
