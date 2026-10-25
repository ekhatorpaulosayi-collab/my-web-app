-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Builder note from the advisor scorecard: get_sales_summary(uuid, date, date)
-- is SECURITY DEFINER and did not check the caller. Any logged-in user could
-- pass another store's user id and read that store's revenue.
--
-- Run after 20261025_04 (Stage A). Safe before Stage B.
-- The live body (repo supabase-schema.sql) sums public.sales where
-- sales.user_id = p_user_id. Sales are stored per store owner (user_id text),
-- which is the store scope in this schema (there is no sales.store_id).
-- This replacement ignores a mismatched p_user_id for a logged-in caller and
-- only aggregates auth.uid()'s rows. service_role may still pass an owner id.
--
-- ROLLBACK: recreate the previous body from supabase-schema.sql lines 379-401
-- (no auth.uid() check). Do not do that on production.
-- =============================================================================
BEGIN;

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

COMMIT;
