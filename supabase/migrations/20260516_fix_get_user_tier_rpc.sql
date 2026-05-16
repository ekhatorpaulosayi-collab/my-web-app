-- Subscription hardening — item 3 of 3.
-- Fix get_user_tier RPC to mirror submit_kyc_v1's canonical paid-tier check.
--
-- WHAT IT USED TO DO (broken):
--   Trivial INNER JOIN of user_subscriptions and subscription_tiers
--   on user_id. No status filter, no period check, no fallback.
--   Consequences:
--     - Returned zero rows for users with no user_subscriptions row
--       (caller had to coalesce; behaviour inconsistent across files).
--     - Returned the stored tier_id verbatim for cancelled users
--       (e.g. cancelled Pro user kept Pro features forever).
--     - Returned the stored tier_id for subscriptions whose period had
--       lapsed by any amount.
--     - Returned the stored tier_id for the 10 'business'-tier seed
--       rows even though every other consumer (F2/F3/submit_kyc_v1)
--       treats 'business' as 'free'.
--
-- WHAT IT NOW DOES (correct):
--   Mirrors submit_kyc_v1's tier check verbatim:
--     - status IN ('active','non_renewing','trialing','past_due')
--     - current_period_end IS NULL OR > now() - INTERVAL '7 days'
--     - tier_id IN ('starter','pro')
--   Any user_subscriptions row that fails any of these gates → fall
--   through to the 'free' tier row from subscription_tiers. Users
--   with no row at all also resolve to 'free'.
--
-- THREE-WAY SYNC CONTRACT:
--   The paid-tier definition now lives in THREE places that MUST
--   stay in sync:
--     1. supabase/functions/_shared/tier-resolver.ts (TypeScript,
--        used by F2 + F3 edge functions)
--     2. submit_kyc_v1 RPC body (canonical authority — the SQL the
--        spec was authored against)
--     3. get_user_tier RPC body (this file; used by frontend
--        subscriptionService.getUserTier())
--   Any change to one of these MUST be applied in parallel to the
--   other two. See docs/SESSION_4_LESSONS_CAPTURED.md
--   (Subscription hardening — items 1 and 3).
--
-- SIGNATURE UNCHANGED. Callers don't need updates.

CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid)
RETURNS TABLE(
  tier_id text,
  tier_name text,
  billing_cycle text,
  max_products integer,
  max_images_per_product integer,
  max_users integer,
  max_ai_chats_monthly integer,
  ai_chats_used integer,
  ai_chats_remaining integer,
  has_product_variants boolean,
  has_debt_tracking boolean,
  has_invoicing boolean,
  has_recurring_invoices boolean,
  has_profit_analytics boolean,
  has_whatsapp_ai boolean,
  has_export_data boolean,
  has_priority_support boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_tier text;
  v_billing_cycle text;
  v_ai_chats_used integer;
BEGIN
  -- Resolve effective tier using the canonical contract (mirrors
  -- submit_kyc_v1 verbatim — see header note).
  SELECT
    s.tier_id,
    s.billing_cycle,
    COALESCE(s.ai_chats_used_this_month, 0)
  INTO v_effective_tier, v_billing_cycle, v_ai_chats_used
  FROM user_subscriptions s
  WHERE s.user_id = p_user_id
    AND s.tier_id IN ('starter', 'pro')
    AND s.status IN ('active', 'non_renewing', 'trialing', 'past_due')
    AND (s.current_period_end IS NULL OR s.current_period_end > now() - INTERVAL '7 days')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Fall through to 'free' if no row matched the paid-tier gate.
  IF v_effective_tier IS NULL THEN
    v_effective_tier := 'free';
    v_billing_cycle := 'monthly';
    v_ai_chats_used := 0;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    v_billing_cycle,
    t.max_products,
    t.max_images_per_product,
    t.max_users,
    t.max_ai_chats_monthly,
    v_ai_chats_used,
    (t.max_ai_chats_monthly - v_ai_chats_used) AS ai_chats_remaining,
    t.has_product_variants,
    t.has_debt_tracking,
    t.has_invoicing,
    t.has_recurring_invoices,
    t.has_profit_analytics,
    t.has_whatsapp_ai,
    t.has_export_data,
    t.has_priority_support
  FROM subscription_tiers t
  WHERE t.id = v_effective_tier;
END;
$$;
