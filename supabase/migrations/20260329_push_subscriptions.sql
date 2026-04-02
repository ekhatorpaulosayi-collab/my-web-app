-- Create push_subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT,
  browser_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- RLS: owners can only see/manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can create own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
ON push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Add quiet hours columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS push_quiet_start TIME,
ADD COLUMN IF NOT EXISTS push_quiet_end TIME,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Function to clean up expired subscriptions (410/404 responses)
CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions(subscription_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE push_subscriptions
  SET is_active = false
  WHERE id = subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active push subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.endpoint,
    ps.p256dh,
    ps.auth
  FROM push_subscriptions ps
  JOIN stores s ON s.user_id = ps.user_id
  WHERE ps.user_id = target_user_id
    AND ps.is_active = true
    AND s.push_notifications_enabled = true
    AND (
      -- Check if current time is outside quiet hours
      s.push_quiet_start IS NULL
      OR s.push_quiet_end IS NULL
      OR NOT (
        CASE
          WHEN s.push_quiet_start <= s.push_quiet_end THEN
            CURRENT_TIME BETWEEN s.push_quiet_start AND s.push_quiet_end
          ELSE -- Quiet hours span midnight
            CURRENT_TIME >= s.push_quiet_start OR CURRENT_TIME <= s.push_quiet_end
        END
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON push_subscriptions TO authenticated;
GRANT SELECT ON push_subscriptions TO anon; -- For debugging, can remove in production