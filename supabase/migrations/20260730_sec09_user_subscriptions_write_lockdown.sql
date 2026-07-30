-- SEC-09: user_subscriptions write lockdown.
--
-- Any authenticated user could UPDATE their own row via PostgREST — the
-- "Users can update own subscription" policy had no column restriction,
-- so tier_id / status / current_period_end were client-writable: free
-- self-upgrade to Pro AND 0% platform fee on card sales (tier-resolver
-- trusts this row). anon/authenticated also held INSERT/DELETE/TRUNCATE.
--
-- Writes move to service-role only. Unaffected by design:
--   - signup free-tier row: create_default_subscription() trigger is
--     SECURITY DEFINER (owner), immune to role grants;
--   - verify-transaction / verify-subscription / manage-subscription /
--     webhook handlers: service-role clients;
--   - client reads: existing SELECT policy + grant stay.
-- Client-side writers removed/already dead: SubscriptionUpgrade cancel
-- now goes through manage-subscription; its two handleUpgrade .delete()
-- calls become silent no-ops (verify-transaction's service-role
-- delete-then-insert covers them); the two quota writers in
-- aiUsageService/subscriptionService were already broken (nonexistent
-- column / nonexistent supabase.raw API) and fail closed.

BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_subscriptions FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

COMMIT;
