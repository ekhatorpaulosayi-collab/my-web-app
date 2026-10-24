-- ============================================================================
-- FOR PAUL TO REVIEW AND RUN
-- 20261023_01_ajo_and_invoice_public_access.sql
--
-- Tightens public (anon) access to ajo / contribution data.
--
-- SEC-05 (invoices) was already applied live on 2026-06-11 and is NOT repeated
-- here to avoid collision.
--
-- Changes:
--   1. Revoke the blanket GRANT SELECT ON contribution_member_payment_status TO anon
--      — this view joins contribution_members with contribution_groups, exposing
--      member names, phones, and payment history to any unauthenticated caller who
--      can enumerate group UUIDs or member UUIDs.
--   2. The share_enabled / share_code public-read policies on contribution_groups,
--      contribution_members, contribution_payments, contribution_payouts are already
--      scoped to `share_enabled = true AND share_code IS NOT NULL` and are correct
--      — they are left unchanged (shared ajo pages need to work without login).
--
-- Rollback:
--   GRANT SELECT ON public.contribution_member_payment_status TO anon;
-- ============================================================================

BEGIN;

REVOKE SELECT ON public.contribution_member_payment_status FROM anon;

COMMIT;

-- POST-APPLY VERIFICATION (run as a separate read-only check):
--   BEGIN; SET LOCAL ROLE anon;
--   SELECT count(*) FROM public.contribution_member_payment_status;  -- expect: permission denied
--   ROLLBACK;
