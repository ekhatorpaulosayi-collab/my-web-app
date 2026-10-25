-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Auditor script 04 v2, STAGE A only (sections 0-6, 7a, 8, and the optional
-- section 9 comment). Section 7b is in 20261025_04b_chat_policies_stage_b.sql.
--
-- RUN ORDER:
--   1. Deploy the affiliate-ledger edge function from this PR (Builder note B1).
--   2. Run 20261023_01, then 02, then 03.
--   3. Run THIS file (Stage A). It creates the visitor chat RPCs (section 6).
--   4. Deploy the frontend (Builder note B3 switches AIChatWidget to those RPCs).
--   5. Only then run 20261025_04b (Stage B, section 7b).
-- Running 04b before step 4 breaks the storefront chat widget.
-- =============================================================================

-- =============================================================================
-- 20261025_04_advisor_hardening.sql
-- Storehouse / Supabase project 'smartstock' (yzlniqwzqlsftxrtapdl)
-- Fixes Supabase security-advisor items S1-S16 (see FIX_LIST_AND_SCORECARD.md §4).
-- v2 (25 Oct 2026 07:40 GMT): corrected against live read-only results Q1/Q3/Q5/Q6/Q8
-- (advisor_query_results.md). All REVOKE signatures match Q3 exactly. Policy names
-- in sections 7-8 are the exact live names from Q6.
--
-- REVIEW HEADER — READ BEFORE RUNNING
--  * Written by the auditor (read-only). NOT applied by anyone. Paul runs it himself.
--  * Run order: 20261023_01 -> 02 -> 03 -> THIS FILE (04).
--  * Run advisor_readonly_queries.sql FIRST and check every "EXPECT" note. If a
--    result disagrees with an assumption below, stop and adjust that section.
--  * Take a backup / PITR point first. Run in a staging branch if you have one.
--  * Each numbered section is its own transaction, so a failure only rolls back
--    that section. Re-runnable (idempotent) where possible.
--  * Service-role code (edge functions, api/whatsapp/index.js) bypasses RLS and
--    grants, so sections 1, 3 and 5 do not affect it.
--  * After running: re-open Supabase > Advisors > Security and re-check, then
--    smoke-test: storefront page + reviews, AI chat widget, ajo share link,
--    public invoice link, add product, record sale, KYC wizard, conversations.
--  * ROLLBACK for every section is at the bottom of this file.
--  * TWO-STAGE RUN:
--      Stage A (safe now, no app code change needed): sections 0-5, 7a, 8.
--      Stage B (ONLY after the builder deploys the code changes in
--      FIX_LIST "Builder notes"): section 6 (chat visitor RPCs can be created
--      in Stage A — they are additive) and section 7b (drops the open chat
--      policies). Running 7b before the widget uses the RPCs WILL break the
--      storefront chat widget (AIChatWidget.tsx reads/updates
--      ai_chat_conversations and ai_chat_messages directly as anon).
--      Section 3 also breaks src/services/affiliateService.ts recordSale/
--      deduct calls until they move to an edge function (Builder note B1).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. PRE-CHECKS (read-only; abort if anything unexpected)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION 'Postgres < 15: security_invoker views unsupported. Stop.';
  END IF;
  IF to_regclass('public.blossom_forward_log') IS NULL THEN
    RAISE NOTICE 'blossom_forward_log not found (fine; nothing in this file touches it).';
  END IF;
END $$;

-- What this file will change (just prints):
SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('ai_chat_rate_limits','green_api_pool','whatsapp_debug_log','sales_units_backup_20260530');

-- ---------------------------------------------------------------------------
-- 1. S1/S2/S3/S4 — RLS disabled on 4 public tables (advisor ERROR rls_disabled_in_public)
--    All app access is via service role (ai-chat edge fn, api/whatsapp/index.js),
--    so enabling RLS with NO policies = service-only. Also strip anon/authenticated
--    table privileges as belt and braces.
-- ---------------------------------------------------------------------------
BEGIN;
ALTER TABLE public.green_api_pool      ENABLE ROW LEVEL SECURITY;   -- holds api_token!
ALTER TABLE public.ai_chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_debug_log  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.green_api_pool, public.ai_chat_rate_limits, public.whatsapp_debug_log
  FROM anon, authenticated;

-- Backup table: move out of the API-exposed schema (keeps the data, reversible).
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM anon, authenticated, PUBLIC;
DO $$ BEGIN
  IF to_regclass('public.sales_units_backup_20260530') IS NOT NULL THEN
    ALTER TABLE public.sales_units_backup_20260530 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.sales_units_backup_20260530 FROM anon, authenticated;
    ALTER TABLE public.sales_units_backup_20260530 SET SCHEMA archive;
  END IF;
END $$;
-- Optional later, once you're sure you never need it:
-- DROP TABLE archive.sales_units_backup_20260530;
COMMIT;

-- ---------------------------------------------------------------------------
-- 2. S5 — Security-definer views (advisor ERROR security_definer_view)
--    Make views run with the CALLER's permissions so RLS on base tables applies.
--    Q5: all 6 had reloptions NULL. Q6: product_reviews ALREADY has
--    "Anyone can view approved reviews" (status='approved', roles {public}), so
--    storefront reviews keep working once the open "Anyone can view reviews"
--    policy is dropped in section 8. member_payment_status relies on the owner
--    policies from 20261023_01 for contribution_* (run 01 first).
-- ---------------------------------------------------------------------------
BEGIN;
ALTER VIEW IF EXISTS public.product_variants_view  SET (security_invoker = true);
ALTER VIEW IF EXISTS public.invoice_summary        SET (security_invoker = true);
-- public_product_reviews currently exposes customer_email, customer_phone, order_id
-- and rejection_reason to anonymous users (Q5). No code reads this view (rg), so
-- recreate it without PII. Columns can't be removed with CREATE OR REPLACE.
DROP VIEW IF EXISTS public.public_product_reviews;
CREATE VIEW public.public_product_reviews WITH (security_invoker = true) AS
 SELECT r.id, r.product_id, r.store_user_id, r.customer_name, r.rating,
        r.review_title, r.review_text, r.is_verified_purchase, r.status,
        r.store_response, r.store_response_date, r.helpful_count, r.not_helpful_count,
        r.created_at, r.updated_at,
        r.helpful_count - r.not_helpful_count AS helpfulness_score,
        p.name AS product_name, p.image_url AS product_image
   FROM public.product_reviews r JOIN public.products p ON r.product_id = p.id
  WHERE r.status = 'approved'
  ORDER BY r.created_at DESC;
GRANT SELECT ON public.public_product_reviews TO anon, authenticated;
ALTER VIEW IF EXISTS public.product_review_stats   SET (security_invoker = true);
ALTER VIEW IF EXISTS public.store_conversations    SET (security_invoker = true);
ALTER VIEW IF EXISTS public.member_payment_status  SET (security_invoker = true);
-- Owner-only views should not be anon-readable at all:
REVOKE SELECT ON public.invoice_summary, public.store_conversations,
                 public.member_payment_status FROM anon;
COMMIT;

-- ---------------------------------------------------------------------------
-- 3. S6/S7 — SECURITY DEFINER functions executable by anon/authenticated
--    Supabase grants EXECUTE to anon+authenticated directly via default
--    privileges, so "REVOKE ... FROM PUBLIC" (used in older migrations) is NOT
--    enough. Strategy:
--     a) Server-only functions: revoke from anon AND authenticated.
--     b) Logged-in-only functions: revoke from anon.
--     c) Storefront/anon-needed functions: keep, but listed for body review.
--    Intentional anon RPCs from 20261023_01 (get_shared_group, get_public_invoice,
--    mark_invoice_viewed) are deliberately NOT touched here.
-- ---------------------------------------------------------------------------
BEGIN;
-- a) server / cron / trigger / admin only (no client .rpc() call found in src/)
REVOKE EXECUTE ON FUNCTION public.decrypt_vendor_kyc_field(bytea)              FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_vendor_kyc_field(text)               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fetch_conversation_messages_unrestricted(text) FROM anon, authenticated, PUBLIC; -- only used by src/components/debug/AgentTakeoverDebugger.tsx
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits()                    FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_pending_sales()                      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_default_subscription()                FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_affiliates_ready_for_payout()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_conversation_messages(uuid)          FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_product_review_stats()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_whatsapp_message(uuid,text,text,text,text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_payment_history(uuid)              FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_context(uuid)                      FROM anon, authenticated, PUBLIC; -- edge fn only (service role)
REVOKE EXECUTE ON FUNCTION public.increment_affiliate_conversion(uuid,bigint) FROM anon, authenticated, PUBLIC; -- see S7 note: move client call to server
REVOKE EXECUTE ON FUNCTION public.deduct_affiliate_earnings(uuid,bigint)      FROM anon, authenticated, PUBLIC; -- see S7 note: move client call to server

-- b) owner / logged-in only
REVOKE EXECUTE ON FUNCTION public.add_contribution_member(uuid,text,text)       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_contribution_member(uuid)              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reorder_contribution_members(uuid,uuid[])     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_add_product(uuid)                         FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_add_product_image(uuid,text)              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_chat_quota(uuid)                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.end_agent_takeover(uuid,text)                 FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.end_agent_takeover(uuid,uuid)                 FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.initiate_agent_takeover(uuid,uuid,text)       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_agent_message(uuid,text,uuid)            FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(text)                 FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_invoices()                       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_invoice_status(uuid)                   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_products(uuid)                  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sales_summary(uuid,date,date)             FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_tier(uuid)                           FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_kyc_v1(uuid,text,text,text,text,text,text,text,boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_kyc_after_approval(uuid,text,text,text,text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_referral_milestones(text)              FROM anon, PUBLIC;

-- c) KEPT anon-callable for now (storefront / signup paths) — bodies must check
--    ownership/inputs; see S7 in the fix list:
--    check_chat_quota(uuid,text), decrement_variant_quantity(uuid,integer),
--    get_variant_price(uuid), upsert_customer(...), increment_affiliate_clicks(uuid),
--    increment_affiliate_signup(uuid)
COMMIT;

-- Q3 check: 46 DEFINER fns, 39 anon-executable. a) 14 + b) 19 revoked + c) 6 kept = 39.
-- The 7 already non-anon (record_successful_payment, complete_subaccount_onboarding,
-- approve_review, reject_review_and_freeze, approve_kyc_review, reject_kyc_review,
-- grant_velocity_override) are untouched.
-- Stop future functions being anon-executable by default:
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, PUBLIC;

-- ---------------------------------------------------------------------------
-- 4. S8 — Mutable search_path on 47 functions (advisor WARN)
--    Pins search_path on every listed public function (all overloads).
-- ---------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prokind='f'
       AND p.proname = ANY (ARRAY[
 'update_member_payment_status','validate_sale_product','initiate_agent_takeover','check_inactive_members',
 'track_whatsapp_message','log_whatsapp_debug','cleanup_old_rate_limits','confirm_pending_sales',
 'get_affiliates_ready_for_payout','update_payment_transaction_updated_at','get_user_payment_history',
 'check_chat_quota','update_referral_milestones','check_rate_limit','update_updated_at_column',
 'deduct_affiliate_earnings','send_agent_message','update_conversation_analytics','generate_invoice_number',
 'can_add_product_image','upsert_customer','update_invoice_status','mark_overdue_invoices',
 'trigger_update_invoice_status','search_marketplace_products','create_default_subscription',
 'update_product_search_vector','generate_store_slug','update_product_boost_scores','get_product_image_count',
 'refresh_product_review_stats','get_variant_price','decrement_variant_quantity','get_user_tier',
 'get_user_context','end_agent_takeover','check_ai_chat_quota','search_documentation_vector',
 'update_review_helpfulness','update_review_stats','fn_set_updated_at','refresh_daily_sales_summary',
 'refresh_conversation_messages','submit_kyc_v1','can_add_product','get_low_stock_products','get_sales_summary'])
       AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    -- 'extensions' included because pg_trgm/vector/unaccent may move there (S11)
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', r.sig);
    RAISE NOTICE 'pinned search_path on %', r.sig;
  END LOOP;
END $$;
COMMIT;

-- ---------------------------------------------------------------------------
-- 5. S10 — Materialized views selectable via the API (advisor WARN)
--    These aggregate ALL stores' data and matviews can't have RLS. The app reads
--    them through get_low_stock_products(uuid) (Q8: SECURITY DEFINER, so unaffected).
--    refresh_daily_sales_summary() is INVOKER but only REFRESHes (needs ownership,
--    not SELECT), so it is unaffected when run by postgres/cron.
-- ---------------------------------------------------------------------------
BEGIN;
REVOKE SELECT ON public.low_stock_products  FROM anon, authenticated;
REVOKE SELECT ON public.daily_sales_summary FROM anon, authenticated;
COMMIT;


-- ---------------------------------------------------------------------------
-- 6. S15 (prep for stage B) — Visitor chat RPCs for the storefront widget.
--    ADDITIVE, safe to create now. They let an anonymous visitor read/update ONLY
--    the conversation whose (id, session_id) pair they hold — the session_id is
--    the visitor's secret, generated in the browser. Builder note B3 switches
--    AIChatWidget.tsx to these, then section 7b removes the open policies.
-- ---------------------------------------------------------------------------
BEGIN;
DO $$ BEGIN   -- pre-check: columns the RPCs rely on
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_chat_conversations'
    AND column_name IN ('id','session_id','store_id','takeover_status','is_agent_active','chat_status','waiting_for_owner_since')
    HAVING count(*)=7;
  IF NOT FOUND THEN RAISE EXCEPTION 'ai_chat_conversations is missing an expected column; adjust section 6'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.visitor_get_conversation(p_conversation_id uuid, p_session_id text)
RETURNS TABLE(id uuid, takeover_status text, is_agent_active boolean, chat_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id, c.takeover_status::text, c.is_agent_active, c.chat_status::text
    FROM ai_chat_conversations c
   WHERE c.session_id = p_session_id
     AND (p_conversation_id IS NULL OR c.id = p_conversation_id)
     AND length(coalesce(p_session_id,'')) >= 16
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.visitor_get_messages(p_conversation_id uuid, p_session_id text, p_after timestamptz DEFAULT NULL)
RETURNS SETOF ai_chat_messages
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.* FROM ai_chat_messages m
    JOIN ai_chat_conversations c ON c.id = m.conversation_id
   WHERE c.id = p_conversation_id AND c.session_id = p_session_id
     AND length(coalesce(p_session_id,'')) >= 16
     AND (p_after IS NULL OR m.created_at >= p_after)
   ORDER BY m.created_at
   LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.visitor_request_owner(p_conversation_id uuid, p_session_id text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE ai_chat_conversations
     SET takeover_status = 'requested', waiting_for_owner_since = now(), is_agent_active = false
   WHERE id = p_conversation_id AND session_id = p_session_id
     AND length(coalesce(p_session_id,'')) >= 16
     AND coalesce(takeover_status::text,'') <> 'requested';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO ai_chat_messages (conversation_id, role, content, is_agent_message, sender_type)
  VALUES (p_conversation_id, 'system', 'Customer requested to speak with store owner', false, 'customer');
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.visitor_get_conversation(uuid,text)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.visitor_get_messages(uuid,text,timestamptz)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.visitor_request_owner(uuid,text)               FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visitor_get_conversation(uuid,text)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_get_messages(uuid,text,timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_request_owner(uuid,text)            TO anon, authenticated;
COMMIT;

-- Helper used by owner-scoped chat policies (DEFINER so it can read stores
-- without recursion; returns true when the caller owns the conversation's store).
BEGIN;
CREATE OR REPLACE FUNCTION public.owns_conversation(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM ai_chat_conversations c
      JOIN stores s ON s.id::text = c.store_id::text
     WHERE c.id = p_conversation_id AND s.user_id = auth.uid()::text);
$$;
REVOKE ALL ON FUNCTION public.owns_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_conversation(uuid) TO authenticated;
COMMIT;

-- ---------------------------------------------------------------------------
-- 7. S15 — Open chat / takeover policies (Q6: {public}, qual true)
-- ---------------------------------------------------------------------------
-- 7a. STAGE A — agent_takeover_sessions (no direct client .from() use; the
--     takeover RPCs are DEFINER and bypass RLS). Safe now.
-- Section 7b lives in 20261025_04b_chat_policies_stage_b.sql. Do not paste it
-- into this file.
BEGIN;
DROP POLICY IF EXISTS "Allow all operations for store owners" ON public.agent_takeover_sessions;
CREATE POLICY takeover_owner_select ON public.agent_takeover_sessions
  FOR SELECT TO authenticated USING (public.owns_conversation(conversation_id));
COMMIT;

-- ---------------------------------------------------------------------------
-- 8. S16 — Other open policies + open INSERTs (Q6). STAGE A, safe now.
--    Each line notes the code use checked with rg.
-- ---------------------------------------------------------------------------
BEGIN;
-- chat_analytics: open SELECT (qual true) -> own rows. Inserts come from the ai-chat
-- edge fn (service role). Also close the "OR auth.uid() IS NULL" insert loophole.
DROP POLICY IF EXISTS "Owners can view analytics"     ON public.chat_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.chat_analytics;
CREATE POLICY chat_analytics_owner_select ON public.chat_analytics
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- documentation "Public read access": INTENTIONAL (public help articles for the AI
-- assistant). Kept. Confirm the table holds no private notes.

-- login_attempts: "login_attempts_select_own" is qual true -> every visitor can list
-- all emails + IPs that tried to log in. Drop. (src/utils/errorMonitoring.ts:110 uses
-- it for a client-side attempt counter; that count will read 0 — Builder note B5.)
DROP POLICY IF EXISTS login_attempts_select_own ON public.login_attempts;
-- open insert kept (logged before sign-in, so must be anon) but constrained:
DROP POLICY IF EXISTS login_attempts_insert_policy ON public.login_attempts;
CREATE POLICY login_attempts_insert_constrained ON public.login_attempts
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(email) <= 320 AND length(coalesce(error_message,'')) <= 1000
              AND length(user_agent) <= 1000 AND coalesce(attempt_number,1) BETWEEN 1 AND 1000
              AND "timestamp" > now() - interval '5 minutes' AND "timestamp" < now() + interval '5 minutes');

-- product_images: "product_images_public_select" (qual true) exposes images of
-- private products. The existing anon policy already allows public products; add the
-- same for logged-in users browsing other stores, then drop the open one.
DROP POLICY IF EXISTS product_images_public_select ON public.product_images;
CREATE POLICY product_images_public_products_auth ON public.product_images
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_public = true));

-- product_reviews: drop open SELECT (exposes pending/rejected reviews + reviewer
-- email/phone) and the duplicate open INSERT. Kept: "Anyone can view approved
-- reviews" and "Anyone can submit reviews" (WITH CHECK status='pending'), used by
-- src/services/reviewService.ts:69 (storefront review form). Tighten the kept insert:
DROP POLICY IF EXISTS "Anyone can view reviews"  ON public.product_reviews;
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.product_reviews;
CREATE POLICY product_reviews_submit_pending ON public.product_reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending'
              AND rating BETWEEN 1 AND 5
              AND length(review_text) BETWEEN 10 AND 5000
              AND coalesce(helpful_count,0) = 0 AND coalesce(not_helpful_count,0) = 0
              AND store_response IS NULL
              AND EXISTS (SELECT 1 FROM public.products p
                           WHERE p.id = product_reviews.product_id
                             AND p.user_id::text = product_reviews.store_user_id::text
                             AND p.is_public = true));

-- review_votes: open SELECT exposes voter_identifier (IP/session). No client SELECT
-- (rg). Drop it. Open insert used by reviewService.ts:257 -> keep, constrain.
DROP POLICY IF EXISTS "Anyone can view review votes" ON public.review_votes;
DROP POLICY IF EXISTS "Anyone can vote on reviews"   ON public.review_votes;
CREATE POLICY review_votes_insert_constrained ON public.review_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (vote_type IN ('helpful','not_helpful')
              AND length(voter_identifier) BETWEEN 6 AND 128   -- 'voter_'+hash (reviewService.ts:426)
              AND EXISTS (SELECT 1 FROM public.product_reviews r
                           WHERE r.id = review_votes.review_id AND r.status = 'approved'));

-- affiliate_clicks: browser insert from referral landing (affiliateService.ts:238).
-- Keep, constrain (no forging conversions).
DROP POLICY IF EXISTS clicks_insert_all ON public.affiliate_clicks;
CREATE POLICY clicks_insert_constrained ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (coalesce(converted,false) = false AND customer_id IS NULL
              AND EXISTS (SELECT 1 FROM public.affiliates a
                           WHERE a.id = affiliate_clicks.affiliate_id
                             AND a.affiliate_code = affiliate_clicks.affiliate_code));

-- affiliate_sales: open insert = anyone can create commission. Server path exists
-- (_shared/paystack-subscription-handler.ts:410, service role). Drop.
-- Breaks affiliateService.ts:317 until Builder note B1.
DROP POLICY IF EXISTS sales_insert_service ON public.affiliate_sales;

-- chat_abuse_log / whatsapp_chats: inserted only by edge functions (service role).
DROP POLICY IF EXISTS "Service role can insert abuse logs" ON public.chat_abuse_log;
DROP POLICY IF EXISTS "Service role can insert chats"      ON public.whatsapp_chats;
-- chat_abuse_log SELECT is "auth.role()='authenticated'" = every user sees every IP.
DROP POLICY IF EXISTS "Only authenticated users can view abuse logs" ON public.chat_abuse_log;

-- error_logs: client logger (src/utils/errorMonitoring.ts:71) -> keep, constrain.
-- Also error_logs_select_own exposes all rows with user_id IS NULL to everyone.
DROP POLICY IF EXISTS error_logs_insert_policy ON public.error_logs;
CREATE POLICY error_logs_insert_constrained ON public.error_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid())
              AND coalesce(resolved,false) = false AND resolved_at IS NULL
              AND length(error_message) <= 2000 AND length(coalesce(error_stack,'')) <= 10000
              AND length(page_url) <= 2000 AND length(user_agent) <= 1000);
DROP POLICY IF EXISTS error_logs_select_own ON public.error_logs;
CREATE POLICY error_logs_select_own ON public.error_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- marketplace_analytics: storefront tracking (src/services/marketplace.ts:314) ->
-- keep, constrain.
DROP POLICY IF EXISTS marketplace_analytics_insert_all ON public.marketplace_analytics;
CREATE POLICY marketplace_analytics_insert_constrained ON public.marketplace_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (event_type IS NOT NULL AND length(event_type) <= 64
              AND user_ip IS NULL AND length(coalesce(user_agent,'')) <= 1000
              AND length(coalesce(referrer,'')) <= 2000);

-- moderation_queue: no client use found (rg). Drop open insert. Its SELECT is any
-- authenticated user -> drop too (admins use service role / dashboard).
DROP POLICY IF EXISTS moderation_queue_insert_all  ON public.moderation_queue;
DROP POLICY IF EXISTS moderation_queue_select_auth ON public.moderation_queue;

-- promo_code_usage: storefront Cart.tsx:334 (anon customer). Drop the duplicate open
-- policy; constrain the public one. promo_usage_insert_own (owner) is kept.
DROP POLICY IF EXISTS "Anyone can record promo code usage" ON public.promo_code_usage;
CREATE POLICY promo_usage_insert_checkout ON public.promo_code_usage
  FOR INSERT TO anon, authenticated
  WITH CHECK (order_total >= 0 AND discount_amount >= 0 AND discount_amount <= order_total
              AND final_total = order_total - discount_amount
              AND length(coalesce(customer_name,'')) <= 200 AND length(coalesce(customer_phone,'')) <= 32
              AND EXISTS (SELECT 1 FROM public.promo_codes pc WHERE pc.id = promo_code_usage.promo_code_id));
COMMIT;

-- ---------------------------------------------------------------------------
-- 9. S11 — Extensions in public (advisor WARN). OPTIONAL / LOW. Left commented:
--    moving them changes operator/type resolution (vector columns, trigram
--    indexes). Do in a maintenance window after testing on a branch.
-- ---------------------------------------------------------------------------
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION pg_trgm  SET SCHEMA extensions;
-- ALTER EXTENSION unaccent SET SCHEMA extensions;
-- ALTER EXTENSION citext   SET SCHEMA extensions;
-- ALTER EXTENSION vector   SET SCHEMA extensions;   -- highest risk; test search_documentation_vector after

-- ---------------------------------------------------------------------------
-- NOT SQL (dashboard): S12 leaked-password protection -> Auth > Providers >
-- Email > "Prevent use of leaked passwords" ON (Pro plan feature).
-- S9: Auth > Sign In / Providers > confirm "Allow anonymous sign-ins" is OFF.
-- =============================================================================

-- =============================================================================
-- ROLLBACK (run only the section you need)
-- =============================================================================
-- 1: ALTER TABLE public.green_api_pool DISABLE ROW LEVEL SECURITY;  (etc. — NOT recommended)
--    GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_chat_rate_limits TO anon, authenticated; (only if Q1 showed they had it)
--    ALTER TABLE archive.sales_units_backup_20260530 SET SCHEMA public;
-- 2: ALTER VIEW public.<view> SET (security_invoker = false);
--    GRANT SELECT ON public.invoice_summary, public.store_conversations, public.member_payment_status TO anon;
-- 3: GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO anon, authenticated;   -- per function, using Q3 output
--    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
-- 4: ALTER FUNCTION public.<fn>(<args>) RESET search_path;
-- 5: GRANT SELECT ON public.low_stock_products, public.daily_sales_summary TO anon, authenticated;
-- 2b (public_product_reviews): re-create the old definition from Q5 output in
--    advisor_query_results.md (it included customer_email/phone — not recommended).
-- 6: DROP FUNCTION public.visitor_get_conversation(uuid,text), public.visitor_get_messages(uuid,text,timestamptz),
--      public.visitor_request_owner(uuid,text), public.owns_conversation(uuid);   (drop 7 policies first)
-- 7a: DROP POLICY takeover_owner_select ON public.agent_takeover_sessions;
--     CREATE POLICY "Allow all operations for store owners" ON public.agent_takeover_sessions FOR ALL USING (true) WITH CHECK (true);
-- 7b: emergency only (widget broken): CREATE POLICY temp_allow_all_conversations ON public.ai_chat_conversations FOR ALL USING (true) WITH CHECK (true);
--     CREATE POLICY temp_allow_all_messages ON public.ai_chat_messages FOR ALL USING (true) WITH CHECK (true);
--     (this restores the leak; prefer fixing the widget.) Then drop conv_owner_*/msg_owner_*.
-- 8: per table: DROP POLICY <new name>; CREATE POLICY "<old name>" ... as listed in
--    Q6 (advisor_query_results.md) — e.g.
--    CREATE POLICY "Anyone can view reviews" ON public.product_reviews FOR SELECT USING (true);
--    CREATE POLICY clicks_insert_all ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
-- 9: ALTER EXTENSION <ext> SET SCHEMA public;
