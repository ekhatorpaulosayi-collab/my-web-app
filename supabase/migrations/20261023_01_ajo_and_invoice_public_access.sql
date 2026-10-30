-- =====================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF (Supabase SQL editor). NOT auto-applied.
-- Audit findings: C2 (ajo data publicly listable), H2 (invoices public).
-- Order: run 01 before deploying the frontend from this PR.
-- What it does:
--   * Drops the blanket "Public view shared ..." SELECT policies on the
--     four contribution_* tables (anyone could list every shared group,
--     member names/phones and payments without the share code).
--   * Adds get_shared_group(p_share_code) RPC: returns ONE group by code,
--     with member phones masked to last 4 digits.
--   * Drops the USING (true) public policies on invoices / invoice_items
--     and adds get_public_invoice(p_invoice_id) RPC (UUID link = capability).
--   * Adds mark_invoice_viewed(p_invoice_id) RPC.
-- ROLLBACK: see the bottom of this file.
-- =====================================================================
BEGIN;

DROP POLICY IF EXISTS "Public view shared groups"   ON contribution_groups;
DROP POLICY IF EXISTS "Public view shared members"  ON contribution_members;
DROP POLICY IF EXISTS "Public view shared payments" ON contribution_payments;
DROP POLICY IF EXISTS "Public view shared payouts"  ON contribution_payouts;

CREATE OR REPLACE FUNCTION public.get_shared_group(p_share_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g contribution_groups%ROWTYPE;
BEGIN
  IF p_share_code IS NULL OR length(p_share_code) < 6 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO g FROM contribution_groups
   WHERE share_code = p_share_code AND share_enabled = true
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'group', to_jsonb(g) - 'user_id',
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'phone', CASE WHEN m.phone IS NULL OR length(m.phone) < 4 THEN NULL
                      ELSE '****' || right(m.phone, 4) END,
        'payout_position', m.payout_position
      ) ORDER BY m.payout_position)
      FROM contribution_members m WHERE m.group_id = g.id), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'member_id', p.member_id, 'cycle_number', p.cycle_number,
        'amount', p.amount, 'payment_method', p.payment_method, 'paid_at', p.paid_at,
        'contribution_members', jsonb_build_object('name', m.name)
      ) ORDER BY p.cycle_number DESC, p.paid_at DESC)
      FROM contribution_payments p JOIN contribution_members m ON m.id = p.member_id
      WHERE p.group_id = g.id), '[]'::jsonb),
    'payouts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', po.id, 'member_id', po.member_id, 'cycle_number', po.cycle_number,
        'amount', po.amount, 'paid_at', po.paid_at,
        'contribution_members', jsonb_build_object('name', m.name)
      ) ORDER BY po.cycle_number DESC)
      FROM contribution_payouts po JOIN contribution_members m ON m.id = po.member_id
      WHERE po.group_id = g.id), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_shared_group(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_group(text) TO anon, authenticated;

-- Invoices --------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view invoices"      ON invoices;
DROP POLICY IF EXISTS "Public can view invoice items" ON invoice_items;

CREATE OR REPLACE FUNCTION public.get_public_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'invoice', to_jsonb(i),
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(it) ORDER BY it.line_order)
                       FROM invoice_items it WHERE it.invoice_id = i.id), '[]'::jsonb)
  )
  FROM invoices i
  WHERE i.id = p_invoice_id AND i.status <> 'draft';
$$;
REVOKE ALL ON FUNCTION public.get_public_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invoice(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_invoice_viewed(p_invoice_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE invoices SET status = 'viewed', viewed_at = now()
   WHERE id = p_invoice_id AND status = 'sent' AND viewed_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.mark_invoice_viewed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_invoice_viewed(uuid) TO anon, authenticated;

COMMIT;

-- Verify (expect 0 for anon):  select count(*) from contribution_members;  (run as anon via REST)

-- =====================================================================
-- ROLLBACK (restores the previous, insecure behaviour):
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.get_shared_group(text);
-- DROP FUNCTION IF EXISTS public.get_public_invoice(uuid);
-- DROP FUNCTION IF EXISTS public.mark_invoice_viewed(uuid);
-- CREATE POLICY "Public view shared groups" ON contribution_groups FOR SELECT USING (share_enabled = true AND share_code IS NOT NULL);
-- CREATE POLICY "Public view shared members" ON contribution_members FOR SELECT USING (group_id IN (SELECT id FROM contribution_groups WHERE share_enabled = true AND share_code IS NOT NULL));
-- CREATE POLICY "Public view shared payments" ON contribution_payments FOR SELECT USING (group_id IN (SELECT id FROM contribution_groups WHERE share_enabled = true AND share_code IS NOT NULL));
-- CREATE POLICY "Public view shared payouts" ON contribution_payouts FOR SELECT USING (group_id IN (SELECT id FROM contribution_groups WHERE share_enabled = true AND share_code IS NOT NULL));
-- CREATE POLICY "Public can view invoices" ON invoices FOR SELECT USING (true);
-- CREATE POLICY "Public can view invoice items" ON invoice_items FOR SELECT USING (true);
-- COMMIT;
-- =====================================================================
