-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- Step 21b. Run this AFTER step 21a and step 21.
--
-- Signed-in non-owners can read a public store. Column grants cannot tell
-- the owner from another signed-in user, so bank_name, account_number, and
-- account_name move to store_bank_details. This file copies them, nulls the
-- stores columns, and revokes those columns from anon and authenticated.
--
-- Owner read and write is RLS on store_bank_details: the signed-in user must
-- own the store. Anon has no privilege. service_role keeps access for
-- resolve-bank-account, which writes bank_accounts and does not touch
-- this table. The manual transfer account stays here.
--
-- Re-run. An existing store_bank_details row is left as it is when any
-- field is already set and the stores columns are older than that row,
-- so a newer owner save is not replaced by stale stores columns. A row
-- that is still entirely empty can be filled once. A bank edit written
-- to the stores columns while this step was undone is kept when
-- stores.updated_at is later than store_bank_details.updated_at: that
-- edit replaces the details row and the existing Bank Transfer method,
-- then the stores columns are cleared. Before the stores columns are
-- cleared, a missing Bank Transfer entry is copied into payment_methods,
-- so this file still helps checkout if step 21a has not run.
--
-- DRY RUN. This SELECT changes nothing.
--
-- SELECT s.id, s.store_slug, s.bank_name, s.account_number, s.account_name
--   FROM public.stores AS s
--  WHERE nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT NULL
--     OR nullif(btrim(coalesce(s.account_number, '')), '') IS NOT NULL
--     OR nullif(btrim(coalesce(s.account_name, '')), '') IS NOT NULL;
--
-- ROLLBACK. Copies the values back onto stores and lets authenticated read
-- those columns again. It does not drop store_slug_redirects and it does
-- not restore remember_store_slug. Do not use the step 19 rollback.
--
--   UPDATE public.stores AS s
--      SET bank_name = d.bank_name,
--          account_number = d.account_number,
--          account_name = d.account_name
--     FROM public.store_bank_details AS d
--    WHERE d.store_id = s.id;
--   GRANT SELECT (bank_name, account_number, account_name) ON TABLE public.stores TO authenticated;
--   GRANT UPDATE (bank_name, account_number, account_name) ON TABLE public.stores TO authenticated;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.store_bank_details (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  bank_name text,
  account_number text,
  account_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_bank_details FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.store_owned_by_me(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.stores
     WHERE id = p_store_id
       AND user_id = auth.uid()::text
  );
$$;

REVOKE ALL ON FUNCTION public.store_owned_by_me(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_owned_by_me(uuid) TO authenticated;

DROP POLICY IF EXISTS store_bank_details_owner_select ON public.store_bank_details;
DROP POLICY IF EXISTS store_bank_details_owner_insert ON public.store_bank_details;
DROP POLICY IF EXISTS store_bank_details_owner_update ON public.store_bank_details;

CREATE POLICY store_bank_details_owner_select
  ON public.store_bank_details
  FOR SELECT
  TO authenticated
  USING (public.store_owned_by_me(store_id));

CREATE POLICY store_bank_details_owner_insert
  ON public.store_bank_details
  FOR INSERT
  TO authenticated
  WITH CHECK (public.store_owned_by_me(store_id));

CREATE POLICY store_bank_details_owner_update
  ON public.store_bank_details
  FOR UPDATE
  TO authenticated
  USING (public.store_owned_by_me(store_id))
  WITH CHECK (public.store_owned_by_me(store_id));

REVOKE ALL ON TABLE public.store_bank_details FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.store_bank_details TO authenticated;
GRANT ALL ON TABLE public.store_bank_details TO service_role;

INSERT INTO public.store_bank_details (store_id, bank_name, account_number, account_name)
SELECT s.id,
       nullif(btrim(s.bank_name), ''),
       nullif(btrim(s.account_number), ''),
       nullif(btrim(s.account_name), '')
  FROM public.stores AS s
 WHERE nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT NULL
    OR nullif(btrim(coalesce(s.account_number, '')), '') IS NOT NULL
    OR nullif(btrim(coalesce(s.account_name, '')), '') IS NOT NULL
ON CONFLICT (store_id) DO UPDATE
  SET bank_name = EXCLUDED.bank_name,
      account_number = EXCLUDED.account_number,
      account_name = EXCLUDED.account_name,
      updated_at = now()
  WHERE public.store_bank_details.bank_name IS NULL
    AND public.store_bank_details.account_number IS NULL
    AND public.store_bank_details.account_name IS NULL;

-- A filled details row stays unless the stores columns were edited
-- later, which is what happens when this step is undone and the owner
-- saves a bank account on the old columns.
UPDATE public.store_bank_details AS d
   SET bank_name = nullif(btrim(s.bank_name), ''),
       account_number = nullif(btrim(s.account_number), ''),
       account_name = nullif(btrim(s.account_name), ''),
       updated_at = now()
  FROM public.stores AS s
 WHERE s.id = d.store_id
   AND s.updated_at > d.updated_at
   AND (
        nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(s.account_number, '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(s.account_name, '')), '') IS NOT NULL
   );

-- The transfer method customers already see has to follow that newer edit.
UPDATE public.stores AS s
   SET payment_methods = (
     SELECT jsonb_agg(
              CASE
                WHEN lower(coalesce(elem->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
                THEN elem || jsonb_strip_nulls(jsonb_build_object(
                  'bank_name', nullif(btrim(coalesce(b.bank_name, '')), ''),
                  'account_number', nullif(btrim(coalesce(b.account_number, '')), ''),
                  'account_name', nullif(btrim(coalesce(b.account_name, '')), '')
                ))
                ELSE elem
              END
              ORDER BY ord
            )
       FROM jsonb_array_elements(s.payment_methods) WITH ORDINALITY AS t(elem, ord)
   )
  FROM public.store_bank_details AS b
 WHERE b.store_id = s.id
   AND jsonb_typeof(s.payment_methods) = 'array'
   AND (
        nullif(btrim(coalesce(b.bank_name, '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(b.account_number, '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(b.account_name, '')), '') IS NOT NULL
   )
   AND nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT DISTINCT FROM nullif(btrim(coalesce(b.bank_name, '')), '')
   AND nullif(btrim(coalesce(s.account_number, '')), '') IS NOT DISTINCT FROM nullif(btrim(coalesce(b.account_number, '')), '')
   AND nullif(btrim(coalesce(s.account_name, '')), '') IS NOT DISTINCT FROM nullif(btrim(coalesce(b.account_name, '')), '')
   AND EXISTS (
        SELECT 1
          FROM jsonb_array_elements(s.payment_methods) AS method
         WHERE lower(coalesce(method->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
           AND (
                nullif(btrim(coalesce(method->>'bank_name', '')), '')
                  IS DISTINCT FROM nullif(btrim(coalesce(b.bank_name, '')), '')
             OR nullif(btrim(coalesce(method->>'account_number', '')), '')
                  IS DISTINCT FROM nullif(btrim(coalesce(b.account_number, '')), '')
             OR nullif(btrim(coalesce(method->>'account_name', '')), '')
                  IS DISTINCT FROM nullif(btrim(coalesce(b.account_name, '')), '')
           )
   );

-- Checkout reads payment_methods. If step 21a has not run, add the
-- transfer account from the owner row we just kept. An existing
-- bank-transfer method is not rewritten.
UPDATE public.stores AS s
   SET payment_methods =
     CASE
       WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
       ELSE '[]'::jsonb
     END
     || jsonb_build_array(
          jsonb_strip_nulls(jsonb_build_object(
            'id', 'legacy-' || s.id::text,
            'type', 'bank',
            'enabled', true,
            'label', 'Bank Transfer',
            'bank_name', nullif(btrim(coalesce(b.bank_name, '')), ''),
            'account_number', nullif(btrim(coalesce(b.account_number, '')), ''),
            'account_name', nullif(btrim(coalesce(b.account_name, '')), '')
          ))
        )
  FROM public.store_bank_details AS b
 WHERE b.store_id = s.id
   AND (
         nullif(btrim(coalesce(b.bank_name, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(b.account_number, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(b.account_name, '')), '') IS NOT NULL
       )
   AND (
         s.payment_methods IS NULL
      OR jsonb_typeof(s.payment_methods) = 'array'
       )
   AND NOT EXISTS (
         SELECT 1
           FROM jsonb_array_elements(
             CASE
               WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
               ELSE '[]'::jsonb
             END
           ) AS method
          WHERE lower(coalesce(method->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
       );

UPDATE public.stores
   SET bank_name = NULL,
       account_number = NULL,
       account_name = NULL
 WHERE bank_name IS NOT NULL
    OR account_number IS NOT NULL
    OR account_name IS NOT NULL;

REVOKE SELECT, INSERT, UPDATE ON TABLE public.stores FROM anon, authenticated;
REVOKE SELECT (bank_name, account_number, account_name) ON TABLE public.stores FROM PUBLIC, anon, authenticated;
REVOKE INSERT (bank_name, account_number, account_name) ON TABLE public.stores FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (bank_name, account_number, account_name) ON TABLE public.stores FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  owner_cols text;
  present text;
  safe text[] := ARRAY[
    'id', 'user_id', 'business_name', 'whatsapp_number', 'address', 'logo_url',
    'is_public', 'store_slug', 'subdomain', 'custom_domain', 'custom_domain_verified',
    'about_us', 'return_policy', 'delivery_areas', 'delivery_fee', 'delivery_time',
    'minimum_order', 'business_hours', 'days_of_operation', 'instagram_url',
    'facebook_url', 'tiktok_url', 'twitter_url', 'payment_methods',
    'accepted_payment_methods', 'payment_instructions', 'paystack_enabled',
    'paystack_public_key', 'paystack_test_mode', 'paystack_subaccounts_enabled',
    'kyc_status', 'frozen', 'wa_fallback_minutes'
  ];
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO owner_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'stores'
     AND column_name NOT IN ('bank_name', 'account_number', 'account_name');

  IF owner_cols IS NULL THEN
    RAISE EXCEPTION 'stores has no columns left to grant';
  END IF;

  EXECUTE format('GRANT SELECT (%s) ON TABLE public.stores TO authenticated', owner_cols);
  EXECUTE format('GRANT UPDATE (%s) ON TABLE public.stores TO authenticated', owner_cols);
  EXECUTE format('GRANT INSERT (%s) ON TABLE public.stores TO authenticated', owner_cols);

  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinality)
    INTO present
    FROM unnest(safe) WITH ORDINALITY AS c(column_name, ordinality)
   WHERE EXISTS (
     SELECT 1
       FROM information_schema.columns AS live
      WHERE live.table_schema = 'public'
        AND live.table_name = 'stores'
        AND live.column_name = c.column_name
   );

  IF present IS NULL THEN
    RAISE EXCEPTION 'stores is missing the public shop columns';
  END IF;

  EXECUTE format('GRANT SELECT (%s) ON TABLE public.stores TO anon', present);
END $$;

DO $bootstrap$
BEGIN
  IF to_regprocedure('public.dashboard_bootstrap()') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.dashboard_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $body$
DECLARE
  v_uid text := auth.uid()::text;
  v_role text := public.acting_staff_role();
  v_store jsonb;
  v_products jsonb;
  v_sales jsonb;
BEGIN
  IF v_uid IS NULL OR v_uid = '' THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT to_jsonb(s) INTO v_store
  FROM (
    SELECT st.id, st.business_name, st.store_slug, st.subdomain, st.is_public, st.whatsapp_number,
           CASE WHEN v_role IS NULL THEN b.bank_name ELSE NULL END AS bank_name,
           CASE WHEN v_role IS NULL THEN b.account_number ELSE NULL END AS account_number,
           CASE WHEN v_role IS NULL THEN b.account_name ELSE NULL END AS account_name
    FROM public.stores AS st
    LEFT JOIN public.store_bank_details AS b ON b.store_id = st.id
    WHERE st.user_id::text = v_uid
    ORDER BY st.created_at DESC NULLS LAST
    LIMIT 1
  ) s;

  SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO v_products
  FROM (
    SELECT id, name, category, quantity, selling_price,
           CASE WHEN v_role = 'cashier' THEN NULL ELSE cost_price END AS cost_price,
           discount_price, image_url, is_public, is_active, is_featured,
           low_stock_threshold, barcode
    FROM public.products
    WHERE user_id::text = v_uid
    ORDER BY name
    LIMIT 500
  ) p;

  IF v_role = 'cashier' THEN
    v_sales := '[]'::jsonb;
  ELSE
    SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) INTO v_sales
    FROM (
      SELECT id, product_id, product_name, quantity, unit_price, discount_amount, final_amount,
             payment_method, customer_name, customer_phone, notes,
             sale_date, sale_time, created_at
      FROM public.sales
      WHERE user_id::text = v_uid
      ORDER BY created_at DESC NULLS LAST
      LIMIT 300
    ) sa;
  END IF;

  RETURN jsonb_build_object(
    'store', v_store,
    'products', coalesce(v_products, '[]'::jsonb),
    'sales', coalesce(v_sales, '[]'::jsonb),
    'acting_role', coalesce(v_role, 'owner')
  );
END;
$body$
$fn$;
END
$bootstrap$;

COMMIT;
