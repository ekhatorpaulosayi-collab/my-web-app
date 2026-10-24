-- ============================================================================
-- FOR PAUL TO REVIEW AND RUN
-- 20261023_03_payout_guard_payment_tx_policies.sql
--
-- One-payout-per-member rule for ajo / contribution_payouts.
-- A member should receive the pot only once per cycle.  Without a database
-- constraint two concurrent requests can both pass the application-level check
-- and insert duplicate payout rows, paying the same member twice.
--
-- DUPLICATE-PAYOUT PRE-CHECK — run this SELECT first and review before applying:
--   SELECT group_id, member_id, cycle_number, COUNT(*) AS duplicates
--   FROM public.contribution_payouts
--   GROUP BY group_id, member_id, cycle_number
--   HAVING COUNT(*) > 1;
-- If any rows are returned, resolve the duplicates (keep the most recent row per
-- group, delete the others) before applying the UNIQUE index.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_contribution_payouts_one_per_member_cycle;
-- ============================================================================

BEGIN;

-- Unique index: one payout row per (group, member, cycle).
-- Uses IF NOT EXISTS so the migration is idempotent on replay.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contribution_payouts_one_per_member_cycle
  ON public.contribution_payouts (group_id, member_id, cycle_number);

COMMIT;

-- POST-APPLY VERIFICATION:
--   -- Attempt to insert a duplicate (use real IDs from your data):
--   INSERT INTO public.contribution_payouts
--     (group_id, member_id, cycle_number, amount, payment_method)
--   SELECT group_id, member_id, cycle_number, amount, payment_method
--   FROM public.contribution_payouts LIMIT 1;
--   -- expect: ERROR  duplicate key value violates unique constraint
