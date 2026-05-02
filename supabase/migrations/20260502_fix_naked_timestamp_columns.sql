-- Migration: fix naked timestamp columns (TIMESTAMP -> TIMESTAMPTZ)
--
-- APPLIED: 2026-05-02 directly via Supabase SQL Editor.
-- This file is checked in for repeatability and fresh-environment seeding;
-- it should be a no-op on the production database where the columns are
-- already TIMESTAMPTZ.
--
-- Background: 39 columns across 14 tables were originally declared
-- `timestamp without time zone`. Application code writes ISO strings via
-- `new Date().toISOString()` (always UTC), but PostgREST returned those
-- columns as naked ISO strings without a tz suffix. Browsers in non-UTC
-- locales (e.g. BST = UTC+1) then misparsed the strings as local time,
-- producing a ~60-minute skew on the conversations dashboard.
--
-- Fix: convert each affected column to TIMESTAMPTZ, treating the existing
-- naive value as UTC (which is what the writers always intended). After
-- this, PostgREST serializes with proper `+00:00` (or `Z`) suffixes.
--
-- The store_conversations view is dropped and recreated because it
-- depends on columns being altered.
--
-- See CLAUDE.md > "TIMESTAMP HANDLING (post-2026-05-02)" for the
-- frontend-side implications and the parseUtc helper that remains in
-- place as a defensive band-aid for at least one stable release.

BEGIN;

-- 1. Drop the dependent view (will recreate at end)
DROP VIEW IF EXISTS store_conversations;

-- 2. Convert all 39 naked-timestamp columns to timestamptz, treating
--    existing values as UTC (which is what the application code writes).

ALTER TABLE affiliate_clicks
  ALTER COLUMN clicked_at TYPE timestamptz USING clicked_at AT TIME ZONE 'UTC';

ALTER TABLE affiliate_payouts
  ALTER COLUMN approved_at TYPE timestamptz USING approved_at AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN requested_at TYPE timestamptz USING requested_at AT TIME ZONE 'UTC';

ALTER TABLE affiliate_sales
  ALTER COLUMN confirmation_date TYPE timestamptz USING confirmation_date AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN payout_date TYPE timestamptz USING payout_date AT TIME ZONE 'UTC',
  ALTER COLUMN sale_date TYPE timestamptz USING sale_date AT TIME ZONE 'UTC';

ALTER TABLE affiliates
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE ai_chat_conversations
  ALTER COLUMN agent_takeover_at TYPE timestamptz USING agent_takeover_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE ai_chat_messages
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE ai_chat_rate_limits
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN hour_bucket TYPE timestamptz USING hour_bucket AT TIME ZONE 'UTC';

ALTER TABLE ai_chat_usage
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_chat_at TYPE timestamptz USING last_chat_at AT TIME ZONE 'UTC',
  ALTER COLUMN tier_started_at TYPE timestamptz USING tier_started_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE product_images
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE subscription_tiers
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE user_onboarding_preferences
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN onboarding_completed_at TYPE timestamptz USING onboarding_completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE user_subscriptions
  ALTER COLUMN ai_chats_reset_at TYPE timestamptz USING ai_chats_reset_at AT TIME ZONE 'UTC',
  ALTER COLUMN cancelled_at TYPE timestamptz USING cancelled_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN current_period_end TYPE timestamptz USING current_period_end AT TIME ZONE 'UTC',
  ALTER COLUMN current_period_start TYPE timestamptz USING current_period_start AT TIME ZONE 'UTC',
  ALTER COLUMN free_tier_started_at TYPE timestamptz USING free_tier_started_at AT TIME ZONE 'UTC',
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN trial_ends_at TYPE timestamptz USING trial_ends_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE whatsapp_chats
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE whatsapp_settings
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 3. Recreate the store_conversations view (identical definition)
CREATE VIEW store_conversations AS
  SELECT c.id,
    c.store_id,
    c.session_id,
    c.visitor_name,
    c.visitor_email,
    c.visitor_phone,
    c.created_at,
    c.updated_at,
    c.context_type,
    c.source_page,
    s.business_name,
    s.store_slug,
    count(m.id) AS message_count,
    max(m.created_at) AS last_message_at,
    CASE
      WHEN max(m.created_at) > (now() - '00:05:00'::interval) THEN 'active'::text
      WHEN max(m.created_at) > (now() - '01:00:00'::interval) THEN 'recent'::text
      ELSE 'inactive'::text
    END AS status
  FROM ai_chat_conversations c
    JOIN stores s ON c.store_id = s.id
    LEFT JOIN ai_chat_messages m ON c.id = m.conversation_id
  WHERE c.is_storefront = true
  GROUP BY c.id, s.business_name, s.store_slug;

COMMIT;
