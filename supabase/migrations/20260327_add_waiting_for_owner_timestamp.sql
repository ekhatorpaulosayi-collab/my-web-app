-- Add waiting_for_owner_since timestamp to track when customer requested human agent
-- This allows the WhatsApp fallback timer to resume from the correct time after page refresh

ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS waiting_for_owner_since TIMESTAMPTZ;

-- Add index for queries filtering by waiting status
CREATE INDEX IF NOT EXISTS idx_chat_waiting_for_owner
ON ai_chat_conversations(waiting_for_owner_since)
WHERE waiting_for_owner_since IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_chat_conversations.waiting_for_owner_since IS
  'Timestamp when customer requested to speak with store owner - used for WhatsApp fallback timer calculation';

-- Grant permissions
GRANT UPDATE (waiting_for_owner_since) ON ai_chat_conversations TO authenticated;
GRANT SELECT (waiting_for_owner_since) ON ai_chat_conversations TO anon;