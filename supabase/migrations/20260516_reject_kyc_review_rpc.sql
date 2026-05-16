-- Step 3c — reject_kyc_review RPC.
-- Spec: docs/KYC_V1_SPEC.md §4.3
--
-- Reviewer-only KYC rejection. SECURITY DEFINER. Phase 1 relies
-- on the grant model — reviewer bash scripts use the service-role
-- key. Phase 2 will add an explicit role-claim check.
--
-- Two modes:
--   p_freeze=false → soft rejection → status='rejected'
--                    requires p_rejection_category in the 5-value
--                    allow-list. Merchant can resubmit.
--   p_freeze=true  → hard rejection → status='frozen'
--                    p_rejection_category may be NULL (no specific
--                    reason). Merchant cannot resubmit.
--
-- The merchant-facing message (reviewer_notes_merchant) is mapped
-- from the rejection category via a CASE; the merchant never sees
-- reviewer_notes (internal).
--
-- Does NOT touch stores.kyc_status — rejection leaves the store
-- in whatever kyc state it was in (typically 'not_started').
-- Only approval sets stores.kyc_status='approved'.
--
-- Returns: { kyc_id, status, rejection_category, can_resubmit }

CREATE OR REPLACE FUNCTION reject_kyc_review(
  p_kyc_id uuid,
  p_rejection_category text,
  p_reviewer_notes text DEFAULT NULL,
  p_freeze boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_merchant_message text;
  v_target_status text;
BEGIN
  -- Validate category
  IF p_rejection_category NOT IN (
    'photo_unclear', 'photo_doesnt_show_id', 'info_doesnt_match',
    'document_not_accepted', 'more_info_needed'
  ) THEN
    -- Also allow NULL category if freezing (no specific reason)
    IF NOT (p_freeze AND p_rejection_category IS NULL) THEN
      RAISE EXCEPTION 'invalid_rejection_category';
    END IF;
  END IF;

  SELECT status INTO v_current_status
  FROM vendor_kyc
  WHERE id = p_kyc_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'kyc_not_found';
  END IF;

  IF v_current_status != 'submitted' THEN
    RAISE EXCEPTION 'not_pending_review';
  END IF;

  -- Map category to merchant-facing message
  v_merchant_message := CASE p_rejection_category
    WHEN 'photo_unclear' THEN 'Your photo was too blurry to verify. Please take a clearer photo in good lighting and try again.'
    WHEN 'photo_doesnt_show_id' THEN 'We couldn''t see your ID clearly in the photo. Please make sure both your face and your ID are visible.'
    WHEN 'info_doesnt_match' THEN 'The information you provided doesn''t match your bank account. Please check and try again.'
    WHEN 'document_not_accepted' THEN 'We need a different type of ID. Please use your NIN slip, driver''s license, voter''s card, or passport.'
    WHEN 'more_info_needed' THEN 'We need to verify some additional details. Please contact support@storehouse.ng.'
    ELSE 'We''re unable to verify your account at this time. Please contact support.'
  END;

  v_target_status := CASE WHEN p_freeze THEN 'frozen' ELSE 'rejected' END;

  UPDATE vendor_kyc
  SET
    status = v_target_status,
    rejection_category = p_rejection_category,
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes),
    reviewer_notes_merchant = v_merchant_message,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_kyc_id;

  RETURN json_build_object(
    'kyc_id', p_kyc_id,
    'status', v_target_status,
    'rejection_category', p_rejection_category,
    'can_resubmit', NOT p_freeze AND v_target_status != 'frozen'
  );
END;
$$;
