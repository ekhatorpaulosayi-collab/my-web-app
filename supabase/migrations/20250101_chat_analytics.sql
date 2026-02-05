-- Chat Analytics Table
CREATE TABLE IF NOT EXISTS chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_ip TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'chat_started', 'chat_message', 'limit_reached', 'signup_clicked', 'support_clicked'
  message_count INTEGER DEFAULT 0,
  context_type TEXT, -- 'onboarding', 'help', 'visitor'
  user_type TEXT, -- 'visitor', 'user', 'shopper'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_analytics_visitor_ip ON chat_analytics(visitor_ip);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_session_id ON chat_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_event_type ON chat_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_created_at ON chat_analytics(created_at);

-- RLS Policies
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything
CREATE POLICY "Service role can manage chat_analytics" ON chat_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own analytics
CREATE POLICY "Users can insert own analytics" ON chat_analytics
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

-- Allow business owners to view their analytics
CREATE POLICY "Owners can view analytics" ON chat_analytics
  FOR SELECT USING (true);

-- Chat Rate Limiting Table (IP-based)
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_ip TEXT NOT NULL,
  chat_count INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(visitor_ip)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_visitor_ip ON chat_rate_limits(visitor_ip);
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_last_reset ON chat_rate_limits(last_reset);

-- RLS for rate limits
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits" ON chat_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up old rate limits (daily)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_rate_limits
  WHERE last_reset < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
