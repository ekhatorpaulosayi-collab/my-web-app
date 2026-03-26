-- WhatsApp AI Integration Tables
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. WhatsApp Configuration Table
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE,
  provider TEXT DEFAULT 'baileys' CHECK (provider IN ('baileys', 'green_api', 'meta_api')),
  status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'pending_scan', 'active', 'error', 'suspended')),
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'basic', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{
    "ai_mode": "auto_all",
    "business_hours": null,
    "greeting": "Welcome! How can I help you today?",
    "language": "en",
    "max_messages_per_day": 100
  }'::jsonb,
  green_api_instance TEXT,
  green_api_token TEXT,
  activation_date TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id)
);

-- 2. WhatsApp Messages Log
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  message_type TEXT CHECK (message_type IN ('incoming', 'outgoing')),
  message_text TEXT,
  ai_response TEXT,
  handled_by TEXT DEFAULT 'ai' CHECK (handled_by IN ('ai', 'owner', 'system')),
  confidence_score DECIMAL(3,2),
  requires_human BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes after table creation
CREATE INDEX IF NOT EXISTS idx_store_customer ON whatsapp_messages (store_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_created_at ON whatsapp_messages (created_at DESC);

-- 3. WhatsApp AI Analytics
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_messages INTEGER DEFAULT 0,
  ai_handled INTEGER DEFAULT 0,
  owner_handled INTEGER DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  potential_sales_value DECIMAL(10,2),
  conversion_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, date)
);

-- 4. WhatsApp Templates (for common responses)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  trigger_keyword TEXT NOT NULL,
  response_template TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, trigger_keyword)
);

-- 5. Green API Pool Management
CREATE TABLE IF NOT EXISTS green_api_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id TEXT UNIQUE NOT NULL,
  api_token TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'error')),
  current_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  total_connections INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WhatsApp Customer Preferences
CREATE TABLE IF NOT EXISTS whatsapp_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  last_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  preferences JSONB DEFAULT '{}'::jsonb,
  total_messages INTEGER DEFAULT 0,
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_status ON whatsapp_config(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_store ON whatsapp_config(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_store_date ON whatsapp_messages(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_store_date ON whatsapp_analytics(store_id, date DESC);

-- Create RLS policies
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Store owners can only see their own WhatsApp data
CREATE POLICY "Store owners can view own WhatsApp config"
  ON whatsapp_config FOR ALL
  USING (auth.uid()::text IN (
    SELECT user_id FROM stores WHERE id = store_id
  ));

CREATE POLICY "Store owners can view own WhatsApp messages"
  ON whatsapp_messages FOR SELECT
  USING (auth.uid()::text IN (
    SELECT user_id FROM stores WHERE id = store_id
  ));

CREATE POLICY "Store owners can view own WhatsApp analytics"
  ON whatsapp_analytics FOR SELECT
  USING (auth.uid()::text IN (
    SELECT user_id FROM stores WHERE id = store_id
  ));

CREATE POLICY "Store owners can manage own templates"
  ON whatsapp_templates FOR ALL
  USING (auth.uid()::text IN (
    SELECT user_id FROM stores WHERE id = store_id
  ));

-- Function to track message
CREATE OR REPLACE FUNCTION track_whatsapp_message(
  p_store_id UUID,
  p_customer_phone TEXT,
  p_message_text TEXT,
  p_ai_response TEXT,
  p_handled_by TEXT DEFAULT 'ai'
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO whatsapp_messages (
    store_id, customer_phone, message_type,
    message_text, ai_response, handled_by
  )
  VALUES (
    p_store_id, p_customer_phone, 'incoming',
    p_message_text, p_ai_response, p_handled_by
  )
  RETURNING id INTO v_message_id;

  -- Update last message timestamp
  UPDATE whatsapp_config
  SET last_message_at = NOW()
  WHERE store_id = p_store_id;

  -- Update analytics
  INSERT INTO whatsapp_analytics (store_id, date, total_messages, ai_handled)
  VALUES (p_store_id, CURRENT_DATE, 1, CASE WHEN p_handled_by = 'ai' THEN 1 ELSE 0 END)
  ON CONFLICT (store_id, date) DO UPDATE
  SET
    total_messages = whatsapp_analytics.total_messages + 1,
    ai_handled = whatsapp_analytics.ai_handled + CASE WHEN p_handled_by = 'ai' THEN 1 ELSE 0 END;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add debug logging function
CREATE OR REPLACE FUNCTION log_whatsapp_debug(
  p_store_id UUID,
  p_event_type TEXT,
  p_details JSONB
)
RETURNS VOID AS $$
BEGIN
  -- Log to a debug table (create if needed for troubleshooting)
  INSERT INTO whatsapp_debug_log (store_id, event_type, details, created_at)
  VALUES (p_store_id, p_event_type, p_details, NOW());
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail to not break main flow
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Create debug log table
CREATE TABLE IF NOT EXISTS whatsapp_debug_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  event_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON whatsapp_config TO authenticated;
GRANT SELECT, INSERT ON whatsapp_messages TO authenticated;
GRANT SELECT ON whatsapp_analytics TO authenticated;
GRANT ALL ON whatsapp_templates TO authenticated;
GRANT EXECUTE ON FUNCTION track_whatsapp_message TO authenticated;
GRANT EXECUTE ON FUNCTION log_whatsapp_debug TO authenticated;