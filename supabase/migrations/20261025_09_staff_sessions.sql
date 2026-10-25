-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run AFTER 20261025_08. This file replaces dashboard_bootstrap() and
-- get_sales_summary() so a cashier session cannot read money through those
-- definer functions. If 08 is applied later, run this file again.
--
-- Staff mode used to be a localStorage flag on the OWNER's JWT. Clearing that
-- key restored owner access, and PostgREST still saw the owner. This adds a
-- server session keyed by the Supabase JWT session_id. RLS restrictive
-- policies hide sales (and other money tables) while that session is a cashier.
-- Leaving staff mode requires the owner password inside end_staff_session.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.begin_staff_session(text);
--   DROP FUNCTION IF EXISTS public.end_staff_session(text);
--   DROP FUNCTION IF EXISTS public.get_acting_staff();
--   DROP FUNCTION IF EXISTS public.acting_staff_role();
--   DROP TABLE IF EXISTS public.staff_active_sessions;
--   Then re-apply 05 and 08 if you still want those function bodies.
-- =============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.staff_active_sessions (
  owner_uid uuid NOT NULL,
  session_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'cashier')),
  staff_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_uid, session_id)
);

ALTER TABLE public.staff_active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_sessions_select_own ON public.staff_active_sessions;
CREATE POLICY staff_sessions_select_own ON public.staff_active_sessions
  FOR SELECT TO authenticated
  USING (owner_uid = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.staff_active_sessions FROM anon, authenticated;

-- NULL means the signed-in session is the owner (no active staff lock).
CREATE OR REPLACE FUNCTION public.acting_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.role
    FROM public.staff_active_sessions s
   WHERE s.owner_uid = auth.uid()
     AND s.session_id = NULLIF(auth.jwt()->>'session_id', '')::uuid
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.acting_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acting_staff_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.begin_staff_session(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_session uuid := NULLIF(auth.jwt()->>'session_id', '')::uuid;
  v_staff record;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'no_session';
  END IF;
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 8 OR p_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'invalid_pin';
  END IF;

  FOR v_staff IN
    SELECT id, name, role, pin
      FROM public.staff_members
     WHERE store_owner_uid::text = auth.uid()::text
       AND coalesce(is_active, true) = true
       AND pin IS NOT NULL
  LOOP
    v_hash := replace(v_staff.pin, '$2b$', '$2a$');
    IF v_hash ~ '^\$2a\$' AND crypt(p_pin, v_hash) = v_hash THEN
      INSERT INTO public.staff_active_sessions (owner_uid, session_id, staff_id, role, staff_name)
      VALUES (auth.uid(), v_session, v_staff.id, v_staff.role, coalesce(v_staff.name, 'Staff'))
      ON CONFLICT (owner_uid, session_id) DO UPDATE
        SET staff_id = EXCLUDED.staff_id,
            role = EXCLUDED.role,
            staff_name = EXCLUDED.staff_name,
            started_at = now();
      RETURN jsonb_build_object(
        'staff_id', v_staff.id,
        'name', coalesce(v_staff.name, 'Staff'),
        'role', v_staff.role
      );
    END IF;
  END LOOP;

  RAISE EXCEPTION 'invalid_pin';
END;
$$;

REVOKE ALL ON FUNCTION public.begin_staff_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_staff_session(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_staff_session(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_session uuid := NULLIF(auth.jwt()->>'session_id', '')::uuid;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;
  IF p_password IS NULL OR length(p_password) < 1 THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  SELECT encrypted_password INTO v_hash FROM auth.users WHERE id = auth.uid();
  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;
  v_hash := replace(v_hash, '$2b$', '$2a$');
  IF crypt(p_password, v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  DELETE FROM public.staff_active_sessions
   WHERE owner_uid = auth.uid()
     AND (v_session IS NULL OR session_id = v_session);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.end_staff_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_staff_session(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_acting_staff()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.staff_active_sessions%ROWTYPE;
  v_session uuid := NULLIF(auth.jwt()->>'session_id', '')::uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('role', 'owner');
  END IF;
  SELECT * INTO v_row
    FROM public.staff_active_sessions
   WHERE owner_uid = auth.uid()
     AND session_id = v_session;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('role', 'owner');
  END IF;
  RETURN jsonb_build_object(
    'role', v_row.role,
    'staff_id', v_row.staff_id,
    'name', v_row.staff_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_acting_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_acting_staff() TO authenticated;

-- PIN hashes must not travel to the browser. The new client lists staff
-- without this column. Run this only after the frontend that omits `pin`
-- from selects is deployed (see DEPLOY_ORDER.md).
REVOKE SELECT (pin) ON public.staff_members FROM anon, authenticated;

-- Restrictive policies AND with the existing owner policies. They do nothing
-- when acting_staff_role() is NULL (owner session).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'sales' AND c.relrowsecurity
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS sales_cashier_no_read ON public.sales';
    EXECUTE 'CREATE POLICY sales_cashier_no_read ON public.sales AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
    EXECUTE 'DROP POLICY IF EXISTS sales_cashier_no_write ON public.sales';
    EXECUTE 'CREATE POLICY sales_cashier_no_write ON public.sales AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.acting_staff_role() IS DISTINCT FROM ''cashier'') WITH CHECK (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
    EXECUTE 'DROP POLICY IF EXISTS sales_cashier_no_delete ON public.sales';
    EXECUTE 'CREATE POLICY sales_cashier_no_delete ON public.sales AS RESTRICTIVE FOR DELETE TO authenticated USING (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'customers' AND c.relrowsecurity
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS customers_cashier_no_read ON public.customers';
    EXECUTE 'CREATE POLICY customers_cashier_no_read ON public.customers AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'expenses' AND c.relrowsecurity
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS expenses_cashier_no_read ON public.expenses';
    EXECUTE 'CREATE POLICY expenses_cashier_no_read ON public.expenses AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'invoices' AND c.relrowsecurity
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS invoices_cashier_no_read ON public.invoices';
    EXECUTE 'CREATE POLICY invoices_cashier_no_read ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'products' AND c.relrowsecurity
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS products_staff_no_edit ON public.products';
    EXECUTE 'CREATE POLICY products_staff_no_edit ON public.products AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.acting_staff_role() IS NULL) WITH CHECK (public.acting_staff_role() IS NULL)';
    EXECUTE 'DROP POLICY IF EXISTS products_staff_no_delete ON public.products';
    EXECUTE 'CREATE POLICY products_staff_no_delete ON public.products AS RESTRICTIVE FOR DELETE TO authenticated USING (public.acting_staff_role() IS NULL)';
    EXECUTE 'DROP POLICY IF EXISTS products_cashier_no_insert ON public.products';
    EXECUTE 'CREATE POLICY products_cashier_no_insert ON public.products AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.acting_staff_role() IS DISTINCT FROM ''cashier'')';
  END IF;
END $$;

-- Same body as 05, plus a cashier refusal. final_amount is net of discount.
CREATE OR REPLACE FUNCTION public.get_sales_summary(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_revenue bigint,
  total_transactions bigint,
  total_items_sold bigint,
  average_transaction_value numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF public.acting_staff_role() = 'cashier' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
    v_owner := auth.uid();
  ELSIF coalesce(auth.role(), '') = 'service_role' THEN
    v_owner := p_user_id;
  ELSE
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(s.final_amount), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(SUM(s.quantity), 0)::bigint,
    COALESCE(AVG(s.final_amount), 0)
  FROM public.sales s
  WHERE s.user_id::text = v_owner::text
    AND s.sale_date BETWEEN p_start_date AND p_end_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_summary(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_summary(uuid, date, date) TO authenticated, service_role;

-- Same shape as 08. Cashiers get products without cost and no sales.
-- Bank account number is owner-only.
CREATE OR REPLACE FUNCTION public.dashboard_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    SELECT id, business_name, store_slug, subdomain, is_public, whatsapp_number,
           CASE WHEN v_role IS NULL THEN bank_name ELSE NULL END AS bank_name,
           CASE WHEN v_role IS NULL THEN account_number ELSE NULL END AS account_number
    FROM public.stores
    WHERE user_id::text = v_uid
    ORDER BY created_at DESC NULLS LAST
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
$$;

REVOKE ALL ON FUNCTION public.dashboard_bootstrap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_bootstrap() TO authenticated, service_role;

COMMIT;
