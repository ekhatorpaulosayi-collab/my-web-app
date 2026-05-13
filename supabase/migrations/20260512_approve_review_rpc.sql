-- 20260512_approve_review_rpc.sql
--
-- Atomic reviewer approval for approve-transaction-for-fulfillment edge
-- function. Replaces the inline two-UPDATE logic with a single transactional
-- Postgres function.
--
-- Solves:
--   1. Atomicity. Split status update + order_items vendor_can_fulfill flip
--      must succeed or fail together. The previous design had a stuck-state
--      bug: if split UPDATE succeeded and order_items UPDATE failed, the
--      idempotency check on retry would short-circuit with "already_approved"
--      and never re-attempt the flip.
--   2. State transition validation. Refuses rejected→approved transitions
--      (a rejected transaction must be explicitly reopened, not silently
--      approved). Rejects approve calls for not_required transactions.
--   3. Audit trail. Writes reviewer_id, reviewed_at, review_notes in one go.
--
-- Additive only: CREATE FUNCTION on a new name. No ALTER, no DROP. Safe to
-- apply after 20260509, 20260510, 20260511.

CREATE OR REPLACE FUNCTION public.approve_review(
  p_split_id     UUID,
  p_reviewer_id  UUID,
  p_notes        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
BEGIN
  -- 1. Lock the split row for the duration of the transaction. Serializes
  -- concurrent approve calls on the same split.
  SELECT *
    INTO v_split
    FROM public.paystack_split_transactions
   WHERE id = p_split_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'split_not_found');
  END IF;

  -- 2. State machine guards.
  IF v_split.requires_review = FALSE THEN
    RETURN jsonb_build_object('error', 'review_not_required');
  END IF;

  IF v_split.review_status = 'approved' THEN
    -- Idempotent retry path. Already approved by this or another call.
    RETURN jsonb_build_object('ok', true, 'already_approved', true);
  END IF;

  IF v_split.review_status = 'rejected' THEN
    -- Refuse silent rejected→approved transition. Reopening a rejection
    -- requires a separate explicit endpoint (Session 3 work).
    RETURN jsonb_build_object('error', 'cannot_approve_rejected');
  END IF;

  -- v_split.review_status is now 'pending'. (not_required was caught by the
  -- requires_review = FALSE check above; the CHECK constraint guarantees the
  -- four values are the only possibilities.)

  -- 3. Update the split row.
  UPDATE public.paystack_split_transactions
     SET review_status = 'approved',
         reviewer_id   = p_reviewer_id,
         reviewed_at   = NOW(),
         review_notes  = p_notes
   WHERE id = p_split_id;

  -- 4. Flip vendor_can_fulfill on order_items for THIS store only.
  -- The store_id filter is essential for marketplace orders where items
  -- from multiple stores share an order_id.
  UPDATE public.order_items
     SET vendor_can_fulfill = TRUE
   WHERE order_id = v_split.order_id
     AND store_id = v_split.store_id;

  RETURN jsonb_build_object(
    'ok', true,
    'split_id', p_split_id,
    'order_id', v_split.order_id,
    'store_id', v_split.store_id,
    'amount_total_kobo', v_split.amount_total_kobo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_review(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_review(UUID, UUID, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.approve_review(UUID, UUID, TEXT) FROM anon;

COMMENT ON FUNCTION public.approve_review IS
  'Atomic reviewer approval. Locks the split row, validates state transition, updates review fields, and flips order_items.vendor_can_fulfill for the store. Refuses rejected→approved transitions. Called only by approve-transaction-for-fulfillment edge function via service role.';
