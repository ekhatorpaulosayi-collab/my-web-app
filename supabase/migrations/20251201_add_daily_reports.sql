-- ============================================================================
-- DAILY WHATSAPP REPORTS FEATURE
-- Adds report settings for automated daily business reports via WhatsApp
-- ============================================================================

-- Add report_settings column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS report_settings JSONB DEFAULT jsonb_build_object(
    'enabled', false,
    'deliveryTime', '18:00',
    'includeProfit', true,
    'includeStockAlerts', true,
    'includeDebts', true,
    'recipients', '[]'::jsonb
  );

-- Index for querying users with reports enabled
CREATE INDEX IF NOT EXISTS idx_users_reports_enabled
  ON public.users((report_settings->>'enabled'))
  WHERE (report_settings->>'enabled')::boolean = true;

-- Comment
COMMENT ON COLUMN public.users.report_settings IS 'Configuration for automated daily WhatsApp business reports (via Twilio)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Daily WhatsApp Reports migration complete!';
  RAISE NOTICE 'Users can now configure automated daily business reports in settings';
END $$;
