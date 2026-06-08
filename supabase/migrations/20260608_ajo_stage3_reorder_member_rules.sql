-- Ajo / Contributions — Stage 3: transactional reorder + member-change rules + lifecycle
-- Spec: docs/AJO-REDESIGN-PLAN.md (Stage 3 + the Jan 2026 ROSCA member-change rules).
--
-- All RPCs are SECURITY DEFINER and enforce ownership internally (caller must own the
-- group via contribution_groups.user_id = auth.uid()). They do ONE atomic transaction
-- each, so reorder/add/remove cannot half-apply. "Collected" = a member has a row in
-- contribution_payouts (the Stage 2 ledger). Stage 2 recipient/payout logic is NOT
-- touched here.
--
-- NOTE on the unique index: the migration 20260331 declared a
-- UNIQUE(group_id, payout_position) index, but it is NOT present live (drift). The
-- reorder RPC uses an offset-then-finalize sequence so it is correct WHETHER OR NOT that
-- unique index exists (and would not violate it if it is added later). We do NOT add the
-- unique index here — existing data may contain duplicate/zero positions that would make
-- adding it fail; that hardening is a separate, data-checked step.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Lifecycle states: allow forming / dissolved in addition to active/completed/paused.
--    (Forming = before contributions/payouts begin; Active = irreversible once begun;
--    Completed = everyone collected; Dissolved = ended early.) Widen the CHECK only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.contribution_groups
  DROP CONSTRAINT IF EXISTS contribution_groups_status_check;
ALTER TABLE public.contribution_groups
  ADD CONSTRAINT contribution_groups_status_check
  CHECK (status = ANY (ARRAY['forming','active','completed','paused','dissolved']::text[]));

-- ---------------------------------------------------------------------------
-- 1) reorder_contribution_members(p_group_id, p_member_ids uuid[])
--    Atomically rewrite payout_position = 1..N in the given order. Only members that
--    have NOT collected (no payout row) may be reordered; collected members keep their
--    existing positions and are placed FIRST (by their current position) so they can
--    never be pushed into an upcoming slot. Offset-then-finalize avoids any transient
--    position collision.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_contribution_members(
  p_group_id uuid,
  p_member_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_collected_count int;
  v_pos int;
  v_member uuid;
BEGIN
  -- Ownership check
  SELECT user_id INTO v_owner FROM contribution_groups WHERE id = p_group_id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'unauthorized: not group owner';
  END IF;

  -- The supplied order must contain ONLY uncollected members (the UI should not offer to
  -- reorder collected ones). Reject if any supplied id has already collected.
  SELECT count(*) INTO v_collected_count
  FROM contribution_payouts
  WHERE group_id = p_group_id
    AND member_id = ANY(p_member_ids);
  IF v_collected_count > 0 THEN
    RAISE EXCEPTION 'cannot reorder members who have already collected';
  END IF;

  -- Offset every member in the group out of the way (avoid any 1..N collision).
  UPDATE contribution_members
     SET payout_position = payout_position + 1000
   WHERE group_id = p_group_id;

  -- Collected members keep their relative order at the FRONT (positions 1..k), by their
  -- prior (offset) position. They are never moved behind an uncollected member.
  v_pos := 1;
  FOR v_member IN
    SELECT m.id
    FROM contribution_members m
    WHERE m.group_id = p_group_id
      AND EXISTS (SELECT 1 FROM contribution_payouts po
                  WHERE po.group_id = p_group_id AND po.member_id = m.id)
    ORDER BY m.payout_position  -- offset position preserves prior order
  LOOP
    UPDATE contribution_members SET payout_position = v_pos
     WHERE id = v_member AND group_id = p_group_id;
    v_pos := v_pos + 1;
  END LOOP;

  -- Then the supplied (uncollected) order fills the remaining slots, in array order.
  FOR i IN 1 .. array_length(p_member_ids, 1) LOOP
    UPDATE contribution_members SET payout_position = v_pos
     WHERE id = p_member_ids[i] AND group_id = p_group_id;
    v_pos := v_pos + 1;
  END LOOP;

  -- Safety: any member not covered above (shouldn't happen) gets appended deterministically.
  FOR v_member IN
    SELECT id FROM contribution_members
     WHERE group_id = p_group_id AND payout_position > 1000
     ORDER BY payout_position
  LOOP
    UPDATE contribution_members SET payout_position = v_pos WHERE id = v_member;
    v_pos := v_pos + 1;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) add_contribution_member(p_group_id, p_name, p_phone)
--    Allowed ONLY before the first payout (no contribution_payouts rows yet). New member
--    goes at the END (max payout_position + 1). Recomputes total_members from real count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_contribution_member(
  p_group_id uuid,
  p_name text,
  p_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_payout_count int;
  v_next_pos int;
  v_new_id uuid;
  v_count int;
BEGIN
  SELECT user_id INTO v_owner
  FROM contribution_groups WHERE id = p_group_id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'unauthorized: not group owner';
  END IF;

  -- Standard rule, expressed by the rotation itself: members may be added only BEFORE
  -- the first payout. Once anyone has collected, the rotation has started and adding a
  -- member would disrupt positions + cycle count. Gate on "no payouts exist yet" rather
  -- than a status flag (no collection = forming, on its own merits).
  SELECT count(*) INTO v_payout_count
  FROM contribution_payouts WHERE group_id = p_group_id;
  IF v_payout_count > 0 THEN
    RAISE EXCEPTION 'cannot add members: the rotation has already started (a payout has been recorded)';
  END IF;

  SELECT COALESCE(MAX(payout_position), 0) + 1 INTO v_next_pos
  FROM contribution_members WHERE group_id = p_group_id;

  INSERT INTO contribution_members (group_id, name, phone, payout_position, status)
  VALUES (p_group_id, p_name, p_phone, v_next_pos, 'active')
  RETURNING id INTO v_new_id;

  SELECT count(*) INTO v_count FROM contribution_members WHERE group_id = p_group_id;
  UPDATE contribution_groups
     SET total_members = v_count, updated_at = now()
   WHERE id = p_group_id;

  RETURN v_new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) remove_contribution_member(p_member_id)
--    Leaving AFTER receiving payout = NOT allowed (obligation/debt). Leaving BEFORE
--    payout = allowed: delete, RE-PACK remaining positions 1..N (no gaps), recompute
--    total_members. One atomic transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_contribution_member(
  p_member_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group uuid;
  v_owner uuid;
  v_has_collected boolean;
  v_pos int;
  v_member uuid;
  v_count int;
BEGIN
  SELECT group_id INTO v_group FROM contribution_members WHERE id = p_member_id;
  IF v_group IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  SELECT user_id INTO v_owner FROM contribution_groups WHERE id = v_group;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'unauthorized: not group owner';
  END IF;

  -- Block removal if this member has already collected (they owe contributions to the
  -- remaining members — treat the outstanding amount as a debt, do not let them leave).
  SELECT EXISTS (SELECT 1 FROM contribution_payouts
                 WHERE group_id = v_group AND member_id = p_member_id)
    INTO v_has_collected;
  IF v_has_collected THEN
    RAISE EXCEPTION 'cannot remove a member who has already collected (they still owe contributions)';
  END IF;

  DELETE FROM contribution_members WHERE id = p_member_id;

  -- Re-pack remaining positions contiguously 1..N (preserve relative order).
  v_pos := 1;
  FOR v_member IN
    SELECT id FROM contribution_members
     WHERE group_id = v_group
     ORDER BY payout_position, created_at
  LOOP
    UPDATE contribution_members SET payout_position = v_pos WHERE id = v_member;
    v_pos := v_pos + 1;
  END LOOP;

  SELECT count(*) INTO v_count FROM contribution_members WHERE group_id = v_group;
  UPDATE contribution_groups
     SET total_members = v_count, updated_at = now()
   WHERE id = v_group;
END;
$$;

-- Permissions: callable by authenticated users; ownership enforced inside each function.
REVOKE ALL ON FUNCTION public.reorder_contribution_members(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_contribution_member(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_contribution_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_contribution_members(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_contribution_member(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_contribution_member(uuid) TO authenticated;

COMMIT;
