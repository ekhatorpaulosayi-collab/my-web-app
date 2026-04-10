-- Create business_summaries table for AI Business Advisor feature
CREATE TABLE IF NOT EXISTS business_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('daily', 'weekly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary_text text NOT NULL,
  data_snapshot jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, period, period_start)
);

-- Enable RLS
ALTER TABLE business_summaries ENABLE ROW LEVEL SECURITY;

-- Create policy for owners to view their store summaries
CREATE POLICY "Users view own store summaries" ON business_summaries
  FOR SELECT
  USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );

-- Add indexes for performance
CREATE INDEX idx_business_summaries_store_id ON business_summaries(store_id);
CREATE INDEX idx_business_summaries_period ON business_summaries(period, period_start DESC);

-- Grant permissions
GRANT SELECT ON business_summaries TO authenticated;

-- Comments for cron job setup (to be added in Supabase dashboard)
COMMENT ON TABLE business_summaries IS 'Stores AI-generated business summaries for Pro and Business tier users';

/*
-- Cron jobs to be set up in Supabase dashboard (requires pg_cron extension):

-- Daily summaries at 9pm WAT (20:00 UTC) for all active Pro/Business stores
SELECT cron.schedule('daily-business-summaries', '0 20 * * *', $$
  SELECT net.http_post(
    url := 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/generate-business-summary',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('store_id', s.id, 'period', 'daily')
  )
  FROM stores s
  JOIN user_subscriptions us ON us.user_id = s.user_id
  JOIN subscription_tiers st ON st.id = us.tier_id
  WHERE st.name IN ('Pro', 'Business')
  AND us.status = 'active';
$$);

-- Weekly summaries at 9pm WAT on Sundays (20:00 UTC)
SELECT cron.schedule('weekly-business-summaries', '0 20 * * 0', $$
  SELECT net.http_post(
    url := 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/generate-business-summary',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('store_id', s.id, 'period', 'weekly')
  )
  FROM stores s
  JOIN user_subscriptions us ON us.user_id = s.user_id
  JOIN subscription_tiers st ON st.id = us.tier_id
  WHERE st.name IN ('Pro', 'Business')
  AND us.status = 'active';
$$);
*/