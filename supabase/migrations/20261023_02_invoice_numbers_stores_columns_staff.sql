-- =====================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF (Supabase SQL editor). NOT auto-applied.
-- Audit findings: C4 (second user's first invoice fails: invoice_number is
-- globally UNIQUE but numbered per user), C3 (StoreSettings saves 7 columns
-- that don't exist on live -> 42703 -> store can never be saved/published),
-- M4 (staff email saved as '' collides with UNIQUE(store_owner_uid,email)).
-- Safe to run before or after the frontend PRs; run it BEFORE merging the
-- "online store publish" PR. Run 01 first.
-- ROLLBACK at the bottom.
-- =====================================================================
BEGIN;

-- C4: make invoice_number unique per user, not globally ---------------
-- Pre-check (should return 0 rows; if not, resolve dups before running):
--   SELECT user_id, invoice_number, count(*) FROM invoices GROUP BY 1,2 HAVING count(*) > 1;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_key
  ON invoices (user_id, invoice_number);

CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  -- Only allow generating numbers for yourself.
  IF auth.uid() IS NOT NULL AND auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  -- Serialize per user so two concurrent invoices don't get the same number.
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_user_id));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '\D', '', 'g'), '')::int), 0) + 1
    INTO v_next
    FROM invoices WHERE user_id = p_user_id AND invoice_number ~ '^INV-\d+$';
  RETURN 'INV-' || LPAD(v_next::text, 3, '0');
END;
$$;

-- C3: columns StoreSettings.tsx writes but live DB lacks ---------------
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS accepted_payment_methods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS return_policy TEXT;
-- Make PostgREST see the new columns immediately:
NOTIFY pgrst, 'reload schema';

-- M4: empty-string staff emails -> NULL so UNIQUE(owner,email) ignores them
UPDATE staff_members SET email = NULL WHERE email = '';

COMMIT;

-- NOTE (C3, data): existing stores created with is_public=false stay private
-- until the owner toggles "Make store public" in Store Settings (now works).
-- If you want every store with a slug published right away, run manually:
--   UPDATE stores SET is_public = true WHERE store_slug IS NOT NULL AND is_public = false;
-- (Only do this if you're sure owners expect it.)

-- =====================================================================
-- ROLLBACK:
-- BEGIN;
-- DROP INDEX IF EXISTS invoices_user_invoice_number_key;
-- ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number); -- fails if users now share numbers
-- -- (restore old generate_invoice_number from invoice-system-schema.sql:253-275)
-- ALTER TABLE stores DROP COLUMN IF EXISTS address, DROP COLUMN IF EXISTS accepted_payment_methods,
--   DROP COLUMN IF EXISTS payment_instructions, DROP COLUMN IF EXISTS delivery_time,
--   DROP COLUMN IF EXISTS tiktok_url, DROP COLUMN IF EXISTS twitter_url, DROP COLUMN IF EXISTS return_policy;
-- COMMIT;
-- (staff email '' -> NULL is not worth reverting.)
-- =====================================================================
