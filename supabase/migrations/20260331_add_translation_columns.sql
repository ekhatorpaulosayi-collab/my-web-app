-- Add translation columns to ai_chat_messages for multilingual support during human takeover
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS translated_text TEXT DEFAULT NULL;

-- Add index for language detection queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_detected_language
ON ai_chat_messages(detected_language)
WHERE detected_language IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_chat_messages.detected_language IS 'Detected language of the message (e.g., English, Hausa, Yoruba, Igbo, Pidgin, French)';
COMMENT ON COLUMN ai_chat_messages.translated_text IS 'Translated version of the message for cross-language communication during human takeover';