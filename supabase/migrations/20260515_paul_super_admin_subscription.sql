-- Step 1d — Paul super-admin subscription seed.
-- Spec: docs/KYC_V1_SPEC.md §3.7
--
-- user_subscriptions is append-history: multiple rows per user
-- over time (paystack-webhook + verify-subscription both .insert
-- new rows on subscription events). There is no UNIQUE(user_id)
-- constraint, so the original spec's ON CONFLICT (user_id) DO
-- UPDATE fails with "no unique or exclusion constraint matching
-- the ON CONFLICT specification". DELETE + INSERT achieves the
-- same idempotent intent without requiring a schema change that
-- would break the existing multi-row write paths.

DELETE FROM user_subscriptions
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44';

INSERT INTO user_subscriptions (user_id, tier_id, status, current_period_end)
VALUES (
  'dffba89b-869d-422a-a542-2e2494850b44',
  'pro',
  'active',
  '2099-01-01'
);
