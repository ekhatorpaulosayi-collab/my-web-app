-- Check if translation columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_chat_messages'
AND column_name IN ('translated_text', 'detected_language');