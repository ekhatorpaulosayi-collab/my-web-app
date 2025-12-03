-- ================================================================
-- Create Missing WhatsApp AI Tables
-- Copy and paste this in: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql
-- ================================================================

-- 1. WhatsApp Settings Table (stores Twilio credentials per user)
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_whatsapp_number TEXT, -- Format: whatsapp:+14155238886
  business_phone TEXT, -- Their actual WhatsApp Business number
  greeting_message TEXT DEFAULT 'Hello! 👋 I''m your 24/7 AI assistant. Ask me about product prices and availability!',
  out_of_stock_message TEXT DEFAULT 'Sorry, this item is currently out of stock. 😔 Would you like to be notified when it''s back?',
  business_hours_message TEXT DEFAULT 'We''re currently closed. But I can still help you with product information! 🌙',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. WhatsApp Chat Logs Table (conversation history)
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_message TEXT NOT NULL,
  bot_response TEXT,
  products_mentioned UUID[], -- Array of product IDs
  response_time_ms INTEGER, -- How long AI took to respond
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for whatsapp_settings
CREATE POLICY "Users can manage own settings"
  ON whatsapp_settings FOR ALL
  USING (auth.uid() = user_id);

-- 5. RLS Policies for whatsapp_chats
CREATE POLICY "Users can view own chats"
  ON whatsapp_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert chats"
  ON whatsapp_chats FOR INSERT
  WITH CHECK (true); -- Webhook uses service role key

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_user_id ON whatsapp_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_created_at ON whatsapp_chats(created_at DESC);

-- ================================================================
-- Verification Query
-- ================================================================
SELECT
  'whatsapp_settings' as table_name,
  COUNT(*) as row_count
FROM whatsapp_settings
UNION ALL
SELECT
  'whatsapp_chats',
  COUNT(*)
FROM whatsapp_chats;

-- Expected result: Both tables should show 0 rows (newly created)
