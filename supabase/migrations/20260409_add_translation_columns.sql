-- Add translation columns to ai_chat_messages table
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS translated_text TEXT,
ADD COLUMN IF NOT EXISTS detected_language VARCHAR(50);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_detected_language
ON ai_chat_messages(detected_language)
WHERE detected_language IS NOT NULL;

-- Add comment to columns
COMMENT ON COLUMN ai_chat_messages.translated_text IS 'Translated version of the message for multi-language support';
COMMENT ON COLUMN ai_chat_messages.detected_language IS 'Detected or source language of the message (e.g., en, yoruba, igbo, hausa)';