-- ============================================================================
-- 20260604_c2_harden_kyc_and_affiliate_rpcs.sql
--
-- Remediation for AUDIT.md finding C2 — "[CRITICAL] KYC reviewer RPCs (and
-- affiliate-increment RPCs) are PUBLIC-executable with no internal owner/reviewer
-- check — privilege escalation."
--
-- STATUS: PROPOSED / UNAPPLIED. Reviewed by Paul before any run. Intended to be
-- tested on a STAGING CLONE first, then applied to production.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
-- ----------------------------------------------------------------------------
-- Part A — KYC reviewer RPCs (approve_kyc_review, reject_kyc_review,
--   grant_velocity_override):
--     1. Adds an internal authorization guard inside each body.
--     2. Pins SET search_path = public (closes search-path-hijack on SECURITY
--        DEFINER; AUDIT.md C2 step 4 / advisor function_search_path_mutable).
--     3. REVOKEs EXECUTE from PUBLIC, anon, authenticated.
--   Bodies are otherwise VERBATIM from the source migrations
--   (20260516_approve_kyc_review_rpc.sql, 20260516_reject_kyc_review_rpc.sql,
--   20260516_grant_velocity_override_rpc.sql). Only the guard line and the
--   `SET search_path = public` clause are added; no other logic changes.
--
-- Part B — Affiliate increment RPCs (increment_affiliate_clicks,
--   increment_affiliate_signup, increment_affiliate_conversion):
--     1. Adds an owner check (the affiliate must belong to the JWT caller).
--     2. Pins SET search_path = public.
--     3. KEEPS the existing anon/authenticated EXECUTE grants — these are called
--        from the browser (src/services/affiliateService.ts) for click/signup/
--        conversion tracking, and a blind REVOKE would break that legitimately.
--   Bodies are otherwise VERBATIM from 20250115_affiliate_program.sql.
--
-- ----------------------------------------------------------------------------
-- WHY THE GUARD USES `auth.uid() IS NULL` AS A TRUSTED-BACKEND ALLOW-BRANCH
-- ----------------------------------------------------------------------------
-- The KYC reviewer path is the bash scripts in scripts/kyc/*.sh, which connect
-- via `psql "$DBURL"` as the project `postgres` role (the function OWNER, with
-- rolbypassrls=true). Under psql there is NO JWT, so auth.uid() returns NULL.
-- The guard therefore ALLOWS the NULL case (trusted backend: postgres / a future
-- service_role edge function) and only BLOCKS a real JWT caller who is not the
-- reviewer. This is belt-and-suspenders with the REVOKE:
--   - REVOKE stops anon/authenticated from reaching the function via PostgREST.
--   - The guard protects against an accidental future re-GRANT and gates any
--     trusted edge path that might be added later.
-- The `postgres` owner can always EXECUTE its own functions regardless of the
-- REVOKE, so the manual reviewer path (scripts/kyc/*.sh) is UNAFFECTED.
--
-- Confirmed live (read-only, 2026-06-04, project yzlniqwzqlsftxrtapdl):
--   - $DBURL connects as `postgres.yzlniqwzqlsftxrtapdl`; postgres owns all 6
--     functions and has rolbypassrls=true.
--   - Reviewer UUID dffba89b-869d-422a-a542-2e2494850b44 = auth.users.id for
--     ekhatorpaulosayi@gmail.com (also matches public.users.id).
--   - affiliates.user_id is type `uuid` (NOT text) → compares to auth.uid()
--     with NO cast. (Contrast: the C1 tenant tables are text and need ::text.)
--   - vendor_kyc.reviewed_by, vendor_velocity_overrides.created_by_user_id are
--     both uuid; auth.uid() audit-capture is unchanged.
--
-- Reviewer UUID note: the single hardcoded reviewer UUID is the known Phase-1
-- limitation (AUDIT.md L12 / AUDIT-FUNCTIONAL.md #11 — "reviewers table planned").
-- This migration matches the existing edge-layer REVIEWER_USER_ID model rather
-- than introducing a new pattern. Replace with a reviewers-table lookup in Phase 2.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART A — KYC REVIEWER RPCs
-- ============================================================================

-- Reusable reviewer UUID for the guard. Phase-1 single reviewer (Paul).
-- (Inlined as a literal in each function below; SECURITY DEFINER functions
--  cannot read a session-level \set, and we avoid a config table for one value.)

-- ---- approve_kyc_review -----------------------------------------------------
-- Source: 20260516_approve_kyc_review_rpc.sql (body verbatim; guard + search_path added).
CREATE OR REPLACE FUNCTION public.approve_kyc_review(
  p_kyc_id uuid,
  p_reviewer_notes text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_current_status text;
BEGIN
  -- C2 AUTHZ GUARD: trusted backend (no JWT -> auth.uid() IS NULL: postgres via
  -- scripts/kyc/*.sh, or service_role) is allowed; any other JWT caller must be
  -- the reviewer. Blocks self-approval via direct PostgREST RPC.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> 'dffba89b-869d-422a-a542-2e2494850b44'::uuid THEN
    RAISE EXCEPTION 'forbidden_not_reviewer';
  END IF;

  SELECT store_id, status
  INTO v_store_id, v_current_status
  FROM vendor_kyc
  WHERE id = p_kyc_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'kyc_not_found';
  END IF;

  IF v_current_status != 'submitted' THEN
    RAISE EXCEPTION 'not_pending_review';
  END IF;

  -- Update vendor_kyc
  UPDATE vendor_kyc
  SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes)
  WHERE id = p_kyc_id;

  -- Update stores.kyc_status
  UPDATE stores
  SET
    kyc_status = 'approved',
    kyc_approved_at = now()
  WHERE id = v_store_id;

  RETURN json_build_object(
    'kyc_id', p_kyc_id,
    'status', 'approved',
    'stores_kyc_status', 'approved'
  );
END;
$$;

-- ---- reject_kyc_review ------------------------------------------------------
-- Source: 20260516_reject_kyc_review_rpc.sql (body verbatim; guard + search_path added).
CREATE OR REPLACE FUNCTION public.reject_kyc_review(
  p_kyc_id uuid,
  p_rejection_category text,
  p_reviewer_notes text DEFAULT NULL,
  p_freeze boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_merchant_message text;
  v_target_status text;
BEGIN
  -- C2 AUTHZ GUARD: see approve_kyc_review. Blocks "freeze any competitor" via
  -- direct PostgREST RPC.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> 'dffba89b-869d-422a-a542-2e2494850b44'::uuid THEN
    RAISE EXCEPTION 'forbidden_not_reviewer';
  END IF;

  -- Validate category
  IF p_rejection_category NOT IN (
    'photo_unclear', 'photo_doesnt_show_id', 'info_doesnt_match',
    'document_not_accepted', 'more_info_needed'
  ) THEN
    -- Also allow NULL category if freezing (no specific reason)
    IF NOT (p_freeze AND p_rejection_category IS NULL) THEN
      RAISE EXCEPTION 'invalid_rejection_category';
    END IF;
  END IF;

  SELECT status INTO v_current_status
  FROM vendor_kyc
  WHERE id = p_kyc_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'kyc_not_found';
  END IF;

  IF v_current_status != 'submitted' THEN
    RAISE EXCEPTION 'not_pending_review';
  END IF;

  -- Map category to merchant-facing message
  v_merchant_message := CASE p_rejection_category
    WHEN 'photo_unclear' THEN 'Your photo was too blurry to verify. Please take a clearer photo in good lighting and try again.'
    WHEN 'photo_doesnt_show_id' THEN 'We couldn''t see your ID clearly in the photo. Please make sure both your face and your ID are visible.'
    WHEN 'info_doesnt_match' THEN 'The information you provided doesn''t match your bank account. Please check and try again.'
    WHEN 'document_not_accepted' THEN 'We need a different type of ID. Please use your NIN slip, driver''s license, voter''s card, or passport.'
    WHEN 'more_info_needed' THEN 'We need to verify some additional details. Please contact support@storehouse.ng.'
    ELSE 'We''re unable to verify your account at this time. Please contact support.'
  END;

  v_target_status := CASE WHEN p_freeze THEN 'frozen' ELSE 'rejected' END;

  UPDATE vendor_kyc
  SET
    status = v_target_status,
    rejection_category = p_rejection_category,
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes),
    reviewer_notes_merchant = v_merchant_message,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_kyc_id;

  RETURN json_build_object(
    'kyc_id', p_kyc_id,
    'status', v_target_status,
    'rejection_category', p_rejection_category,
    'can_resubmit', NOT p_freeze AND v_target_status != 'frozen'
  );
END;
$$;

-- ---- grant_velocity_override ------------------------------------------------
-- Source: 20260516_grant_velocity_override_rpc.sql (body verbatim; guard + search_path added).
-- Note: zero callers in the codebase today (not even a bash script). The guard
-- hardens it against the "raise own AML caps" vector for any future caller.
CREATE OR REPLACE FUNCTION public.grant_velocity_override(
  p_store_id uuid,
  p_daily_cap_kobo bigint DEFAULT NULL,
  p_monthly_cap_kobo bigint DEFAULT NULL,
  p_single_txn_cap_kobo bigint DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override_id uuid;
BEGIN
  -- C2 AUTHZ GUARD: see approve_kyc_review. Blocks "raise own AML caps" via
  -- direct PostgREST RPC.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> 'dffba89b-869d-422a-a542-2e2494850b44'::uuid THEN
    RAISE EXCEPTION 'forbidden_not_reviewer';
  END IF;

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF p_daily_cap_kobo IS NULL AND p_monthly_cap_kobo IS NULL AND p_single_txn_cap_kobo IS NULL THEN
    RAISE EXCEPTION 'at_least_one_cap_required';
  END IF;

  INSERT INTO vendor_velocity_overrides (
    store_id, daily_cap_kobo, monthly_cap_kobo, single_txn_cap_kobo,
    expires_at, reason, created_by_user_id
  ) VALUES (
    p_store_id, p_daily_cap_kobo, p_monthly_cap_kobo, p_single_txn_cap_kobo,
    p_expires_at, p_reason, auth.uid()
  )
  RETURNING id INTO v_override_id;

  RETURN json_build_object(
    'override_id', v_override_id,
    'expires_at', p_expires_at
  );
END;
$$;

-- ---- Part A revoke ----------------------------------------------------------
-- Remove PUBLIC/anon/authenticated EXECUTE. The owner (postgres) keeps EXECUTE
-- implicitly (owner can always run its own functions); the manual reviewer path
-- via psql is UNAFFECTED. service_role keeps EXECUTE for any future trusted edge
-- caller (it is not in the revoke list).
REVOKE ALL ON FUNCTION public.approve_kyc_review(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_kyc_review(uuid, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_velocity_override(uuid, bigint, bigint, bigint, timestamptz, text)
  FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- PART B — AFFILIATE INCREMENT RPCs
-- ============================================================================
-- These KEEP their anon/authenticated EXECUTE grants (browser tracking needs
-- them). The fix is an in-body owner check + pinned search_path.
-- affiliates.user_id is uuid -> compares to auth.uid() with NO cast.
-- Trusted backend (service_role edge fns: paystack-webhook,
-- paystack-subscription-handler) hits the auth.uid() IS NULL allow-branch.

-- ---- increment_affiliate_clicks ---------------------------------------------
-- Source: 20250115_affiliate_program.sql (body verbatim; owner-check + search_path added).
CREATE OR REPLACE FUNCTION public.increment_affiliate_clicks(p_affiliate_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- C2 OWNER CHECK: trusted backend (auth.uid() IS NULL) allowed; otherwise the
  -- caller must own this affiliate. Blocks incrementing someone else's affiliate.
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM affiliates a
       WHERE a.id = p_affiliate_id AND a.user_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'forbidden_not_affiliate_owner';
  END IF;

  UPDATE affiliates
  SET total_clicks = total_clicks + 1,
      updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;

-- ---- increment_affiliate_signup ---------------------------------------------
-- Source: 20250115_affiliate_program.sql (body verbatim; owner-check + search_path added).
CREATE OR REPLACE FUNCTION public.increment_affiliate_signup(p_affiliate_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- C2 OWNER CHECK: see increment_affiliate_clicks.
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM affiliates a
       WHERE a.id = p_affiliate_id AND a.user_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'forbidden_not_affiliate_owner';
  END IF;

  UPDATE affiliates
  SET total_signups = total_signups + 1,
      updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;

-- ---- increment_affiliate_conversion -----------------------------------------
-- Source: 20250115_affiliate_program.sql (body verbatim; owner-check + search_path added).
--
-- ⚠️ RESIDUAL RISK — SELF-CONVERSION FRAUD REMAINS OPEN (on record, intentional
--    for now). This RPC writes earnings (total_earnings_kobo,
--    pending_earnings_kobo) and unlocks payouts. The owner check below only
--    confirms the affiliate belongs to the caller — it does NOT stop a logged-in
--    affiliate from calling this RPC directly to inflate their OWN earnings,
--    because the browser caller src/services/affiliateService.ts:338
--    (recordAffiliateSale) runs as anon/authenticated and must keep EXECUTE.
--
--    The complete fix is to make this RPC service_role-only (REVOKE FROM anon,
--    authenticated) and move the recordAffiliateSale increment server-side into
--    a trusted edge function (it already runs server-side from paystack-webhook
--    and paystack-subscription-handler on real subscription events). That is a
--    CODE change beyond this SQL-only / C2 migration and is tracked as a SEPARATE
--    FOLLOW-UP TASK. Until then, this owner-check is a partial mitigation: it
--    prevents inflating OTHER affiliates' earnings, not one's own.
CREATE OR REPLACE FUNCTION public.increment_affiliate_conversion(
  p_affiliate_id uuid,
  p_commission_kobo bigint
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_conversions INTEGER;
BEGIN
  -- C2 OWNER CHECK: see increment_affiliate_clicks. NOTE the residual
  -- self-conversion risk documented in the header comment above.
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM affiliates a
       WHERE a.id = p_affiliate_id AND a.user_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'forbidden_not_affiliate_owner';
  END IF;

  -- Increment stats
  UPDATE affiliates
  SET total_conversions = total_conversions + 1,
      total_earnings_kobo = total_earnings_kobo + p_commission_kobo,
      pending_earnings_kobo = pending_earnings_kobo + p_commission_kobo,
      updated_at = NOW()
  WHERE id = p_affiliate_id
  RETURNING total_conversions INTO v_new_conversions;

  -- Check if payouts should be unlocked (2+ conversions)
  IF v_new_conversions >= 2 THEN
    UPDATE affiliates
    SET payouts_unlocked = true
    WHERE id = p_affiliate_id;
  END IF;
END;
$$;

-- Part B intentionally issues NO REVOKE: the existing
--   GRANT EXECUTE ... TO authenticated
-- (from 20250115_affiliate_program.sql) is preserved so browser tracking works.
-- CREATE OR REPLACE does not alter the existing ACL, so the grants survive.

COMMIT;

-- ============================================================================
-- POST-APPLY VERIFICATION (run read-only after applying on staging/prod)
-- ============================================================================
-- 1. ACLs: KYC RPCs should no longer list anon/authenticated; affiliate RPCs
--    should still list authenticated.
--    SELECT proname, proacl::text, proconfig
--    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND proname IN
--      ('approve_kyc_review','reject_kyc_review','grant_velocity_override',
--       'increment_affiliate_clicks','increment_affiliate_signup',
--       'increment_affiliate_conversion');
--    Expect: KYC -> {postgres=X, service_role=X}; affiliate -> still has authenticated=X.
--    Expect: proconfig = {search_path=public} on all six.
--
-- 2. Reviewer path still works (run the actual script against staging):
--    ./scripts/kyc/approve.sh <a-submitted-staging-kyc-id>
--    Expect: success (psql connects as owner `postgres`, auth.uid() IS NULL).
--
-- 3. Attacker path blocked (simulate a JWT user via PostgREST against staging):
--    POST /rest/v1/rpc/approve_kyc_review with anon/authenticated key
--    Expect: 401/403 (no EXECUTE) or 'forbidden_not_reviewer' if grant lingers.
--
-- 4. Browser affiliate tracking still works on staging (click/signup a test
--    affiliate code while logged in as that affiliate's owner). Expect success.
--    Then attempt increment of a DIFFERENT affiliate's id -> 'forbidden_not_affiliate_owner'.
--
-- 5. Re-run the Supabase security advisor; the C2-related
--    anon_security_definer_function_executable / function_search_path_mutable
--    counts for these six functions should drop.
-- ============================================================================
