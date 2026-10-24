-- ============================================================================
-- FOR PAUL TO REVIEW AND RUN
-- 20261023_02_invoice_numbers_stores_columns_staff.sql
--
-- Changes:
--   1. Per-user invoice number sequence — adds generate_invoice_number(p_user_id)
--      RPC and a sequence-counter table so each merchant's numbers start at INV-0001
--      and are never shared with other users.
--   2. Seven missing stores columns used by OnlineStoreSetup but not present in any
--      tracked migration: logo_url, minimum_order, business_hours, days_of_operation,
--      about_us, instagram_url, facebook_url, delivery_areas, delivery_fee, address,
--      custom_domain, custom_domain_verified.
--      (All nullable / backward-compatible; existing rows are not touched.)
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.generate_invoice_number(uuid);
--   DROP TABLE IF EXISTS public.invoice_number_sequences;
--   -- Column removals only if columns were newly created and have no data:
--   ALTER TABLE public.stores
--     DROP COLUMN IF EXISTS logo_url,
--     DROP COLUMN IF EXISTS minimum_order,
--     DROP COLUMN IF EXISTS business_hours,
--     DROP COLUMN IF EXISTS days_of_operation,
--     DROP COLUMN IF EXISTS about_us,
--     DROP COLUMN IF EXISTS instagram_url,
--     DROP COLUMN IF EXISTS facebook_url,
--     DROP COLUMN IF EXISTS delivery_areas,
--     DROP COLUMN IF EXISTS delivery_fee,
--     DROP COLUMN IF EXISTS address,
--     DROP COLUMN IF EXISTS custom_domain,
--     DROP COLUMN IF EXISTS custom_domain_verified;
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Per-user invoice number sequences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_number_sequences (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seq INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_number_sequences ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read their own sequence (write is service-role only
-- via SECURITY DEFINER function below).
CREATE POLICY "Users can view own invoice sequence"
  ON public.invoice_number_sequences FOR SELECT
  USING (auth.uid() = user_id);

-- SECURITY DEFINER so the function can upsert even when the client JWT owns only
-- the row it's incrementing. search_path is pinned to prevent hijack.
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  -- Only the authenticated user can generate their own numbers.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.invoice_number_sequences (user_id, last_seq)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET last_seq = invoice_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Missing stores columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url              TEXT,
  ADD COLUMN IF NOT EXISTS minimum_order         TEXT,
  ADD COLUMN IF NOT EXISTS business_hours        TEXT,
  ADD COLUMN IF NOT EXISTS days_of_operation     TEXT[],
  ADD COLUMN IF NOT EXISTS about_us              TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url         TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url          TEXT,
  ADD COLUMN IF NOT EXISTS delivery_areas        TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee          TEXT,
  ADD COLUMN IF NOT EXISTS address               TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain         TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for storefront custom-domain lookup (used in StorefrontPage.tsx).
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_custom_domain
  ON public.stores (custom_domain)
  WHERE custom_domain IS NOT NULL;

COMMIT;

-- POST-APPLY VERIFICATION:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'stores'
--   AND column_name IN (
--     'logo_url','minimum_order','business_hours','days_of_operation',
--     'about_us','instagram_url','facebook_url','delivery_areas','delivery_fee',
--     'address','custom_domain','custom_domain_verified'
--   );
--   -- expect: 12 rows
--
--   SELECT public.generate_invoice_number(auth.uid()); -- expect: '0001' (first call)
--   SELECT public.generate_invoice_number(auth.uid()); -- expect: '0002' (second call)
