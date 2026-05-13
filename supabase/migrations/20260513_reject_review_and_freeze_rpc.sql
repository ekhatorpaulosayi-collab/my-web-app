-- 20260513_reject_review_and_freeze_rpc.sql
--
-- Atomic reviewer rejection + store freeze for reject-transaction-and-freeze
-- edge function. Replaces three sequential UPDATEs with a single transactional
-- Postgres function.
--
-- Solves:
--   1. Atomicity. Three UPDATEs (split rejection, store freeze, order_items
--      block) must succeed or fail together. The previous design had a
--      catastrophic stuck-state bug: if split UPDATE succeeded and store
--      UPDATE failed, a known-fraudulent vendor would stay unfrozen and
--      keep operating.
--   2. State machine guards. Refuses rejecting transactions that don't
--      require review, that are already rejected, or that are already
--      approved. The approved→rejected transition specifically is refused
--      because post-approval the right recovery is refund+freeze, not
--      the pre-fulfillment reject path (different semantics, different
--      side effects).
--   3. Audit trail preservation. If a store is already frozen, the split
--      rejection still proceeds but the freeze fields are NOT overwritten,
--      preserving the original freeze reason, timestamp, and reviewer.
--      Re-freeze audit trail is Session 3 work (audit_log table).
--
-- Additive only: CREATE FUNCTION on a new name. No ALTER, no DROP. Safe to
-- apply after 20260509–20260512.

CREATE OR REPLACE FUNCTION public.reject_review_and_freeze(
  p_split_id     UUID,
  p_reviewer_id  UUID,
  p_reason       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split        RECORD;
  v_store_was_already_frozen BOOLEAN;
BEGIN
  -- 1. Lock the split row for the duration of the transaction.
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

  IF v_split.review_status = 'rejected' THEN
    -- Idempotent retry path. Already rejected.
    RETURN jsonb_build_object('ok', true, 'already_rejected', true);
  END IF;

  IF v_split.review_status = 'approved' THEN
    -- Refuse approved→rejected. Post-approval recovery requires
    -- refund + freeze, not the pre-fulfillment reject workflow. Build a
    -- separate reverse-approval-and-refund endpoint in Session 3+ when
    -- the use case materializes.
    RETURN jsonb_build_object('error', 'cannot_reject_approved');
  END IF;

  -- v_split.review_status is now 'pending' (CHECK constraint guarantees).

  -- 3. Lock and read the store row. Tells us whether we're freezing a
  -- previously-clean store or hitting one that's already frozen.
  SELECT frozen
    INTO v_store_was_already_frozen
    FROM public.stores
   WHERE id = v_split.store_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'store_not_found');
  END IF;

  -- 4. Reject the split. Always happens.
  UPDATE public.paystack_split_transactions
     SET review_status = 'rejected',
         reviewer_id   = p_reviewer_id,
         reviewed_at   = NOW(),
         review_notes  = p_reason
   WHERE id = p_split_id;

  -- 5. Freeze the store, but ONLY if not already frozen. Preserves the
  -- original freeze audit trail (frozen_at, frozen_reason, frozen_by).
  IF v_store_was_already_frozen = FALSE THEN
    UPDATE public.stores
       SET frozen        = TRUE,
           frozen_at     = NOW(),
           frozen_reason = p_reason,
           frozen_by     = p_reviewer_id
     WHERE id = v_split.store_id;
  END IF;

  -- 6. Block fulfillment on this store's items for this order.
  UPDATE public.order_items
     SET vendor_can_fulfill = FALSE
   WHERE order_id = v_split.order_id
     AND store_id = v_split.store_id;

  RETURN jsonb_build_object(
    'ok', true,
    'split_id', p_split_id,
    'order_id', v_split.order_id,
    'store_id', v_split.store_id,
    'amount_total_kobo', v_split.amount_total_kobo,
    'store_was_already_frozen', v_store_was_already_frozen
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reject_review_and_freeze(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_review_and_freeze(UUID, UUID, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.reject_review_and_freeze(UUID, UUID, TEXT) FROM anon;

COMMENT ON FUNCTION public.reject_review_and_freeze IS
  'Atomic reviewer rejection + store freeze. Locks split and store rows, validates state transition, updates split fields, freezes the store (only if not already frozen — preserves original audit trail), and blocks order_items fulfillment for this store. Refuses approved→rejected transitions. Called only by reject-transaction-and-freeze edge function via service role.';
