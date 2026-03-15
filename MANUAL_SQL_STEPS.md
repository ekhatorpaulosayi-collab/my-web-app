# 📋 Manual SQL Steps for AI Tracking Tables

Since automatic SQL execution is having connection issues, please follow these manual steps:

## Step 1: Open Supabase SQL Editor

**Click this link to open the SQL editor:**
```
https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new
```

## Step 2: Copy and Run This SQL

Copy ALL of this SQL and paste it into the SQL editor, then click "Run":

```sql
-- ========================================
-- AI CHAT TRACKING TABLES - COMPLETE SETUP
-- ========================================

-- 1. Create ai_chat_usage table
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

CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_period
ON ai_chat_usage(user_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_store
ON ai_chat_usage(store_id);

-- 2. Create ai_chat_messages table
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

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user
ON ai_chat_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
ON ai_chat_messages(session_id, created_at);

-- 3. Create ai_response_cache table
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

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hash
ON ai_response_cache(query_hash);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires
ON ai_response_cache(expires_at);

-- 4. Create ai_chat_analytics table
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

CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_user
ON ai_chat_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_event
ON ai_chat_analytics(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_store
ON ai_chat_analytics(store_id, created_at DESC);

-- 5. Create ai_chat_rate_limits table
CREATE TABLE IF NOT EXISTS ai_chat_rate_limits (
  visitor_ip text PRIMARY KEY,
  chat_count integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_rate_limits_reset
ON ai_chat_rate_limits(last_reset);

-- 6. Enable Row Level Security
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
CREATE POLICY "Users can view their own usage" ON ai_chat_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage all usage" ON ai_chat_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own messages" ON ai_chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON ai_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage all messages" ON ai_chat_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Anyone can read cache" ON ai_response_cache
  FOR SELECT USING (true);

CREATE POLICY "System can manage cache" ON ai_response_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own analytics" ON ai_chat_analytics
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can manage all analytics" ON ai_chat_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "System can manage rate limits" ON ai_chat_rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 8. Create Helper Functions
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

  RETURN v_current_count <= p_tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Success Message
DO $$
BEGIN
  RAISE NOTICE '✅ AI Chat Tracking Tables Created Successfully!';
END $$;
```

## Step 3: Verify Tables Were Created

After running the above SQL, run this verification query:

```sql
-- VERIFICATION QUERY
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ai_chat%'
ORDER BY table_name;
```

**You should see 5 tables:**
- ai_chat_analytics
- ai_chat_messages
- ai_chat_rate_limits
- ai_response_cache
- ai_chat_usage

## Step 4: Test One Table

Run this test query to make sure everything works:

```sql
-- TEST QUERY
SELECT * FROM ai_chat_usage LIMIT 1;
```

This should return either:
- An empty result (which is fine - table exists but no data yet)
- Or an error if the table doesn't exist

## ✅ Success Indicators

You'll know it worked if:
1. You see a green success message in Supabase
2. The verification query shows 5 tables
3. The test query doesn't error

## 🚨 If You Get Errors

If you see "table already exists" errors, that's OK! It means some tables were already created.

If you see other errors, let me know the exact error message.

---

**Please run the SQL above now and let me know when you see the 5 tables!**