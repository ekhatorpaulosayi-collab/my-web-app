-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- Step 22. The business-type picker writes public.users.store_type.
-- The March 2026 file that adds this column is not on every database.
-- This file adds the column when it is missing and leaves an existing
-- value alone.
-- =============================================================================
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS store_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.users'::regclass
       AND conname = 'users_store_type_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_store_type_check
      CHECK (
        store_type IS NULL
        OR store_type IN ('fashion', 'electronics', 'food', 'pharmacy', 'general')
      );
  END IF;
END $$;

GRANT SELECT (store_type), UPDATE (store_type) ON TABLE public.users TO authenticated;

COMMIT;
