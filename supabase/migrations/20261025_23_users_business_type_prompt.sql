-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- Step 23. "Not now" on the shop-type card is remembered on the account.
-- A new device reads public.users.business_type_prompt_dismissed. This
-- file adds the column when it is missing and leaves an existing value
-- alone. The signup insert does not write this column.
-- =============================================================================
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS business_type_prompt_dismissed boolean NOT NULL DEFAULT false;

GRANT SELECT (business_type_prompt_dismissed), UPDATE (business_type_prompt_dismissed)
  ON TABLE public.users TO authenticated;

COMMIT;
