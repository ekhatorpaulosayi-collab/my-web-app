-- =====================================================
-- AI CHAT TRACKING TABLES
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new
-- =====================================================

-- STEP 1: Create AI Chat Usage Tracking Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  chat_count integer DEFAULT 0,
  tier_limit integer NOT NULL,
  tier_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_period
ON ai_chat_usage(user_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_store
ON ai_chat_usage(store_id);

-- STEP 2: Create Chat Messages History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  role text CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  tokens_used integer DEFAULT 0,
  context_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user
ON ai_chat_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
ON ai_chat_messages(session_id, created_at);

-- STEP 3: Create Response Cache Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash text UNIQUE NOT NULL,
  query_text text NOT NULL,
  response text NOT NULL,
  context_type text,
  language text,
  hit_count integer DEFAULT 0,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Add index for cache lookups
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hash
ON ai_response_cache(query_hash);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires
ON ai_response_cache(expires_at);

-- STEP 4: Create Analytics Events Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  session_id text,
  visitor_ip text,
  context_type text,
  response_time_ms integer,
  tokens_used integer,
  cache_hit boolean DEFAULT false,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_user
ON ai_chat_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_event
ON ai_chat_analytics(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_store
ON ai_chat_analytics(store_id, created_at DESC);

-- STEP 5: Create Visitor Rate Limits Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_rate_limits (
  visitor_ip text PRIMARY KEY,
  chat_count integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for cleanup
CREATE INDEX IF NOT EXISTS idx_ai_chat_rate_limits_reset
ON ai_chat_rate_limits(last_reset);

-- STEP 6: Enable Row Level Security (RLS)
-- =====================================================

-- AI Chat Usage
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON ai_chat_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage all usage" ON ai_chat_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Chat Messages
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON ai_chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON ai_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage all messages" ON ai_chat_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Response Cache (public read, system write)
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache" ON ai_response_cache
  FOR SELECT USING (true);

CREATE POLICY "System can manage cache" ON ai_response_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Analytics
ALTER TABLE ai_chat_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics" ON ai_chat_analytics
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can manage all analytics" ON ai_chat_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Rate Limits (system only)
ALTER TABLE ai_chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits" ON ai_chat_rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- STEP 7: Create Helper Functions
-- =====================================================

-- Function to get current month's usage
CREATE OR REPLACE FUNCTION get_ai_chat_usage(p_user_id uuid)
RETURNS TABLE (
  chat_count integer,
  tier_limit integer,
  remaining integer,
  percentage_used numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(u.chat_count, 0) as chat_count,
    COALESCE(u.tier_limit, 10) as tier_limit,
    COALESCE(u.tier_limit - u.chat_count, 10) as remaining,
    CASE
      WHEN u.tier_limit > 0 THEN ROUND((u.chat_count::numeric / u.tier_limit::numeric) * 100, 2)
      ELSE 0
    END as percentage_used
  FROM ai_chat_usage u
  WHERE u.user_id = p_user_id
    AND u.period_start = date_trunc('month', CURRENT_DATE)::date
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_ai_chat_usage(
  p_user_id uuid,
  p_store_id uuid,
  p_tier_name text,
  p_tier_limit integer
) RETURNS boolean AS $$
DECLARE
  v_current_count integer;
  v_period_start date;
  v_period_end date;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE)::date;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

  -- Insert or update usage record
  INSERT INTO ai_chat_usage (
    user_id, store_id, period_start, period_end,
    chat_count, tier_limit, tier_name
  ) VALUES (
    p_user_id, p_store_id, v_period_start, v_period_end,
    1, p_tier_limit, p_tier_name
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    chat_count = ai_chat_usage.chat_count + 1,
    updated_at = now()
  RETURNING chat_count INTO v_current_count;

  -- Return true if under limit, false if exceeded
  RETURN v_current_count <= p_tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset visitor rate limits (cleanup old entries)
CREATE OR REPLACE FUNCTION cleanup_visitor_rate_limits()
RETURNS void AS $$
BEGIN
  -- Reset counts older than 24 hours
  UPDATE ai_chat_rate_limits
  SET chat_count = 0, last_reset = now()
  WHERE last_reset < now() - interval '24 hours';

  -- Delete entries older than 7 days with no activity
  DELETE FROM ai_chat_rate_limits
  WHERE updated_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_response_cache
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 8: Create Scheduled Jobs (Optional - requires pg_cron extension)
-- =====================================================
-- Uncomment these if you have pg_cron enabled in Supabase

/*
-- Schedule hourly cleanup of rate limits
SELECT cron.schedule(
  'cleanup-visitor-rate-limits',
  '0 * * * *',
  'SELECT cleanup_visitor_rate_limits();'
);

-- Schedule daily cleanup of expired cache
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 0 * * *',
  'SELECT cleanup_expired_cache();'
);
*/

-- STEP 9: Create Views for Easy Querying
-- =====================================================

-- Current month usage summary
CREATE OR REPLACE VIEW ai_chat_usage_summary AS
SELECT
  u.user_id,
  u.store_id,
  u.tier_name,
  u.chat_count,
  u.tier_limit,
  u.tier_limit - u.chat_count as remaining,
  ROUND((u.chat_count::numeric / NULLIF(u.tier_limit, 0)::numeric) * 100, 2) as percentage_used,
  u.period_start,
  u.period_end
FROM ai_chat_usage u
WHERE u.period_start = date_trunc('month', CURRENT_DATE)::date;

-- Daily usage stats
CREATE OR REPLACE VIEW ai_chat_daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_chats,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(tokens_used) as avg_tokens,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    (SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::numeric /
     NULLIF(COUNT(*), 0)::numeric) * 100, 2
  ) as cache_hit_rate
FROM ai_chat_analytics
WHERE event_type = 'chat_completion'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- STEP 10: Grant Permissions
-- =====================================================

-- Grant usage on all tables to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ai_chat_usage_summary TO authenticated;
GRANT SELECT ON ai_chat_daily_stats TO authenticated;

-- STEP 11: Verify Installation
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'AI Chat Tracking Tables Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - ai_chat_usage (tracking monthly usage)';
  RAISE NOTICE '  - ai_chat_messages (storing chat history)';
  RAISE NOTICE '  - ai_response_cache (caching common responses)';
  RAISE NOTICE '  - ai_chat_analytics (tracking events)';
  RAISE NOTICE '  - ai_chat_rate_limits (visitor limits)';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - get_ai_chat_usage()';
  RAISE NOTICE '  - increment_ai_chat_usage()';
  RAISE NOTICE '  - cleanup_visitor_rate_limits()';
  RAISE NOTICE '  - cleanup_expired_cache()';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - ai_chat_usage_summary';
  RAISE NOTICE '  - ai_chat_daily_stats';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update the ai-chat Edge Function to use these tables';
  RAISE NOTICE '  2. Implement the analytics dashboard';
  RAISE NOTICE '  3. Set up caching logic';
END $$;