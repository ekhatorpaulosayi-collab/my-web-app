-- ============================================================================
-- CHAT ABUSE LOGGING
-- Track off-topic, jailbreak, spam attempts for monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_abuse_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('off_topic', 'jailbreak', 'spam', 'suspicious_response')),
  message TEXT NOT NULL,
  blocked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_chat_abuse_log_ip
  ON public.chat_abuse_log(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_abuse_log_type
  ON public.chat_abuse_log(message_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_abuse_log_user
  ON public.chat_abuse_log(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.chat_abuse_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view abuse logs (for monitoring)
DROP POLICY IF EXISTS "Only authenticated users can view abuse logs" ON public.chat_abuse_log;
CREATE POLICY "Only authenticated users can view abuse logs"
  ON public.chat_abuse_log
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can insert (for logging from Edge Functions)
DROP POLICY IF EXISTS "Service role can insert abuse logs" ON public.chat_abuse_log;
CREATE POLICY "Service role can insert abuse logs"
  ON public.chat_abuse_log
  FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.chat_abuse_log IS 'Logs of chat widget abuse attempts (off-topic, jailbreak, spam)';
COMMENT ON COLUMN public.chat_abuse_log.message_type IS 'Type of abuse: off_topic, jailbreak, spam, suspicious_response';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Chat abuse logging table created!';
  RAISE NOTICE 'Monitor abuse with: SELECT * FROM chat_abuse_log ORDER BY created_at DESC LIMIT 50;';
END $$;
