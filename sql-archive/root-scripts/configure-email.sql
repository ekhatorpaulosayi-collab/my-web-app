-- =====================================================
-- SUPABASE EMAIL CONFIGURATION SQL SCRIPT
-- Run this in Supabase SQL Editor to configure URLs
-- =====================================================

-- This script configures the redirect URLs and site URL
-- Note: SMTP settings must still be configured manually in the dashboard
-- because they're not accessible via SQL

-- Step 1: Configure allowed redirect URLs for auth
-- These URLs will be whitelisted for email confirmation and password reset
INSERT INTO auth.config (parameter, value)
VALUES
  ('redirect_urls', 'http://localhost:4000/**, http://localhost:4000/auth/confirm, http://localhost:4000/auth/callback, http://localhost:4000/update-password')
ON CONFLICT (parameter)
DO UPDATE SET value = EXCLUDED.value;

-- Step 2: Configure site URL
INSERT INTO auth.config (parameter, value)
VALUES
  ('site_url', 'http://localhost:4000')
ON CONFLICT (parameter)
DO UPDATE SET value = EXCLUDED.value;

-- Step 3: Optionally disable email confirmation (users can login immediately)
-- Uncomment the line below if you want to disable email confirmation
-- UPDATE auth.config SET value = 'false' WHERE parameter = 'enable_email_confirmations';

-- =====================================================
-- VERIFICATION QUERY
-- Run this to verify your settings were applied
-- =====================================================
SELECT parameter, value
FROM auth.config
WHERE parameter IN ('redirect_urls', 'site_url', 'enable_email_confirmations');

-- =====================================================
-- Done! You should see:
-- redirect_urls | http://localhost:4000/**, ...
-- site_url | http://localhost:4000
-- enable_email_confirmations | true (or false if you disabled it)
-- =====================================================
