-- FOR PAUL. Not applied to production by the agent.
-- Run AFTER 20261025_05 (get_sales_summary) and with this frontend.
-- One authenticated call replaces the dashboard's separate product and sales reads.
-- Until this function exists, the app remembers the miss and keeps the old two reads.

BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid text := auth.uid()::text;
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
           bank_name, account_number
    FROM public.stores
    WHERE user_id::text = v_uid
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1
  ) s;

  SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO v_products
  FROM (
    SELECT id, name, category, quantity, selling_price, cost_price, discount_price,
           image_url, is_public, is_active, is_featured, low_stock_threshold, barcode
    FROM public.products
    WHERE user_id::text = v_uid
    ORDER BY name
    LIMIT 500
  ) p;

  SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) INTO v_sales
  FROM (
    SELECT id, product_id, product_name, quantity, unit_price, final_amount,
           payment_method, customer_name, customer_phone, notes,
           sale_date, sale_time, created_at
    FROM public.sales
    WHERE user_id::text = v_uid
    ORDER BY created_at DESC NULLS LAST
    LIMIT 300
  ) sa;

  RETURN jsonb_build_object(
    'store', v_store,
    'products', coalesce(v_products, '[]'::jsonb),
    'sales', coalesce(v_sales, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_bootstrap() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_bootstrap() FROM anon;
GRANT EXECUTE ON FUNCTION public.dashboard_bootstrap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_bootstrap() TO service_role;

COMMIT;
