-- Ajo / Contributions — Stage 1: schema reconciliation
-- Spec: docs Stage 0 audit + AJO redesign plan.
--
-- WHY: contribution_groups accumulated out-of-band drift (these columns exist LIVE
-- but were never in a recorded migration): `payment_frequency` (duplicate of
-- `frequency`, with a different default), `owner_id` (duplicate of `user_id`), and
-- `cycle_start_date`. `frequency` is the canonical schedule field. Two live groups had
-- frequency/payment_frequency disagreements (john: weekly vs monthly; Osayi: biweekly
-- vs monthly) caused by payment_frequency defaulting to 'monthly'.
--
-- THIS MIGRATION (Stage 1 only — minimal, safe, reversible):
--   1. Backfill payment_frequency := frequency for ALL groups (reconcile the duplicate
--      to the canonical value; fixes the 2 disagreements). frequency stays the truth.
--      This is the ONLY data write.
--   2. ADD COLUMN IF NOT EXISTS cycle_start_date date — idempotent; no-op live (the
--      column already exists), but formalizes it in the migration ledger.
--   3. Document the collection_day convention via COMMENT ON COLUMN (no data rewrite).
--
-- EXPLICITLY NOT TOUCHED (later stages / out of scope):
--   - owner_id (left as-is; user_id is canonical and RLS-bound).
--   - total_members (Stage 3 re-derives from actual member rows).
--   - contribution_payments / contribution_payouts (history stays safe).
--   - collection_day values (only the convention is documented, not rewritten).
--   - payment_frequency is NOT dropped yet (readers still use payment_frequency ||
--     frequency; a later stage migrates readers to frequency-only, then drops it).

BEGIN;

-- 0) Drop the over-restrictive payment_frequency CHECK before the backfill.
--    The live constraint allows only ('daily','weekly','monthly') — it OMITS
--    'biweekly', so backfilling payment_frequency := frequency for the biweekly
--    group (Osayi) would violate it (this is what rolled back the first attempt).
--    `frequency` keeps its correct 4-value check (daily/weekly/biweekly/monthly),
--    which is the canonical validator. payment_frequency is deprecated and slated for
--    removal, so we drop its narrower duplicate check rather than maintain it.
ALTER TABLE public.contribution_groups
  DROP CONSTRAINT IF EXISTS contribution_groups_payment_frequency_check;

-- 1) Reconcile the duplicate frequency column to the canonical `frequency` value.
--    Safe: makes payment_frequency AGREE with the intended value; does not change
--    `frequency` itself. After this, the 2 disagreements (john, Osayi) are gone.
UPDATE public.contribution_groups
   SET payment_frequency = frequency
 WHERE payment_frequency IS DISTINCT FROM frequency;

-- 2) Formalize cycle_start_date in the ledger. Idempotent — column already exists live,
--    so this is a no-op there, but it makes the column traceable to a migration.
ALTER TABLE public.contribution_groups
  ADD COLUMN IF NOT EXISTS cycle_start_date date;

-- 3) Document the schedule conventions (no data change). Establishes the rule the date
--    layer (Stage 4) will rely on.
COMMENT ON COLUMN public.contribution_groups.frequency IS
  'Canonical contribution/rotation frequency: daily | weekly | biweekly | monthly. Source of truth (payment_frequency is a deprecated duplicate kept temporarily for read-compat).';

COMMENT ON COLUMN public.contribution_groups.collection_day IS
  'Collection day, interpreted by frequency: day-of-week name (e.g. "Monday") for weekly/biweekly; day-of-month (e.g. "1") for monthly. Free text today; convention established Stage 1, enforcement deferred.';

COMMENT ON COLUMN public.contribution_groups.cycle_start_date IS
  'Date of the first collection (rotation anchor). Each member''s collection date is derived as cycle_start_date + (payout_position - 1) periods of `frequency`. May be NULL on legacy groups until set.';

COMMENT ON COLUMN public.contribution_groups.payment_frequency IS
  'DEPRECATED duplicate of `frequency`. Kept temporarily because readers use (payment_frequency || frequency). Backfilled to equal `frequency` in Stage 1; will be removed after readers migrate to `frequency`.';

COMMIT;
