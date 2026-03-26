-- Add WhatsApp fallback timer configuration to stores
-- This allows each store to set their own timer for when to offer WhatsApp as alternative

-- Add wa_fallback_minutes column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS wa_fallback_minutes INTEGER DEFAULT 5
  CHECK (wa_fallback_minutes >= 1 AND wa_fallback_minutes <= 30);

-- Add comment for documentation
COMMENT ON COLUMN stores.wa_fallback_minutes IS
  'Minutes to wait before offering WhatsApp fallback option when store owner is not responding (1-30 minutes, default 5)';

-- Add new status for chat conversations
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS moved_to_whatsapp_at TIMESTAMPTZ;

-- Add index for tracking WhatsApp transfers
CREATE INDEX IF NOT EXISTS idx_chat_whatsapp_transfers
ON ai_chat_conversations(moved_to_whatsapp_at)
WHERE moved_to_whatsapp_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_chat_conversations.moved_to_whatsapp_at IS
  'Timestamp when customer chose to move conversation to WhatsApp';

-- Update the status enum to include 'moved_to_whatsapp'
-- First, check if we need to add it
DO $$
BEGIN
  -- Check if 'moved_to_whatsapp' already exists in the enum values
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'chat_status'
    )
    AND enumlabel = 'moved_to_whatsapp'
  ) THEN
    -- If status column is using text type (not enum), we just need to ensure it can accept the new value
    -- No action needed as text accepts any value
    NULL;
  END IF;
END $$;

-- Grant permissions
GRANT UPDATE (wa_fallback_minutes) ON stores TO authenticated;
GRANT SELECT (wa_fallback_minutes) ON stores TO anon;