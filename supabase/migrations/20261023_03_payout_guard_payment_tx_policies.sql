-- =====================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF (Supabase SQL editor). NOT auto-applied.
-- Audit findings: H4 (ajo double payout: guard is client-side only, two
-- taps / two devices can both pass), H12 (payment_transactions has
-- INSERT WITH CHECK (true) / UPDATE USING (true) for every role; the
-- service role bypasses RLS anyway, so these only open the table to users).
-- Run after 01 and 02.
-- =====================================================================

-- PRE-CHECK: must return 0 rows, else the unique index will fail.
--   SELECT group_id, member_id, count(*) FROM contribution_payouts
--   GROUP BY 1,2 HAVING count(*) > 1;
-- If rows come back, decide which duplicate payout is real and delete the other first.

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS contribution_payouts_one_per_member
  ON contribution_payouts (group_id, member_id);

DROP POLICY IF EXISTS "Service role can insert transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON payment_transactions;
COMMIT;

-- Verify the Paystack webhook / record_successful_payment still work after
-- this (they use the service role or SECURITY DEFINER RPCs, which bypass RLS).

-- =====================================================================
-- ROLLBACK:
-- BEGIN;
-- DROP INDEX IF EXISTS contribution_payouts_one_per_member;
-- CREATE POLICY "Service role can insert transactions" ON payment_transactions FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Service role can update transactions" ON payment_transactions FOR UPDATE USING (true);
-- COMMIT;
-- =====================================================================
