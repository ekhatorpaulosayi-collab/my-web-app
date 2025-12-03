-- ================================================
-- ERROR MONITORING & LOGIN TRACKING TABLES
-- For monitoring login issues and tracking errors
-- ================================================

-- Table: error_logs
-- Tracks all errors that occur in the application
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL CHECK (error_type IN ('auth', 'network', 'api', 'ui', 'unknown')),
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  page_url TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: login_attempts
-- Tracks all login attempts (successful and failed)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_code TEXT,
  ip_address TEXT,
  user_agent TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS error_logs_insert_policy ON error_logs;
DROP POLICY IF EXISTS error_logs_select_own ON error_logs;
DROP POLICY IF EXISTS error_logs_select_all_admin ON error_logs;
DROP POLICY IF EXISTS error_logs_update_admin ON error_logs;

DROP POLICY IF EXISTS login_attempts_insert_policy ON login_attempts;
DROP POLICY IF EXISTS login_attempts_select_own ON login_attempts;
DROP POLICY IF EXISTS login_attempts_select_all_admin ON login_attempts;

-- Policies for error_logs
-- Anyone can insert errors (for error tracking)
CREATE POLICY error_logs_insert_policy ON error_logs
  FOR INSERT
  WITH CHECK (true);

-- Users can see their own errors
CREATE POLICY error_logs_select_own ON error_logs
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admin users can see all errors (you'll need to add admin check)
CREATE POLICY error_logs_select_all_admin ON error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.user_id = auth.uid()
      AND stores.is_admin = true
    )
  );

-- Admin users can update/resolve errors
CREATE POLICY error_logs_update_admin ON error_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.user_id = auth.uid()
      AND stores.is_admin = true
    )
  );

-- Policies for login_attempts
-- Anyone can insert login attempts
CREATE POLICY login_attempts_insert_policy ON login_attempts
  FOR INSERT
  WITH CHECK (true);

-- Users can see their own login attempts
CREATE POLICY login_attempts_select_own ON login_attempts
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admin users can see all login attempts
CREATE POLICY login_attempts_select_all_admin ON login_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.user_id = auth.uid()
      AND stores.is_admin = true
    )
  );

-- Add is_admin column to stores table if it doesn't exist
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on error_logs
DROP TRIGGER IF EXISTS update_error_logs_updated_at ON error_logs;
CREATE TRIGGER update_error_logs_updated_at
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE error_logs IS 'Logs all errors that occur in the application for monitoring and debugging';
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (successful and failed) for security monitoring';

COMMENT ON COLUMN error_logs.error_type IS 'Type of error: auth, network, api, ui, or unknown';
COMMENT ON COLUMN error_logs.severity IS 'Severity level: low, medium, high, or critical';
COMMENT ON COLUMN error_logs.context IS 'Additional context data about the error (JSON)';
COMMENT ON COLUMN error_logs.resolved IS 'Whether the error has been resolved or acknowledged';

COMMENT ON COLUMN login_attempts.attempt_number IS 'Number of failed attempts in the last hour for this email';
COMMENT ON COLUMN login_attempts.success IS 'Whether the login attempt was successful';

-- Sample query: Get error statistics for the last 24 hours
/*
SELECT
  error_type,
  severity,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM error_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY error_type, severity
ORDER BY count DESC;
*/

-- Sample query: Get failed login attempts in last hour
/*
SELECT
  email,
  COUNT(*) as failed_attempts,
  MAX(timestamp) as last_attempt
FROM login_attempts
WHERE
  success = false
  AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;
*/

-- Sample query: Get recent critical errors
/*
SELECT
  id,
  error_type,
  error_message,
  user_email,
  page_url,
  timestamp
FROM error_logs
WHERE
  severity = 'critical'
  AND timestamp >= NOW() - INTERVAL '24 hours'
  AND resolved = false
ORDER BY timestamp DESC
LIMIT 20;
*/
