-- Add kill switch column to stores table
-- This allows disabling chat widget globally in case of emergency

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS chat_widget_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN stores.chat_widget_enabled IS 'Kill switch for chat widget - set to false to disable chat globally in emergencies';

-- Verify column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name = 'chat_widget_enabled';