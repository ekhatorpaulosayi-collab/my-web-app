-- Direct SQL test for translation flow
-- Test the complete flow with real data

-- Get the most recent conversation with agent activity
SELECT
    c.id as conversation_id,
    c.is_agent_active,
    c.agent_id,
    c.store_id,
    c.created_at as conv_created,
    COUNT(m.id) as message_count,
    COUNT(CASE WHEN m.role = 'user' THEN 1 END) as customer_messages,
    COUNT(CASE WHEN m.is_agent_message = true THEN 1 END) as agent_messages
FROM ai_chat_conversations c
LEFT JOIN ai_chat_messages m ON m.conversation_id = c.id
WHERE c.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 5;

-- Check messages with translation details
SELECT
    m.id,
    m.conversation_id,
    m.role,
    m.sender_type,
    m.is_agent_message,
    LEFT(m.content, 50) as content_preview,
    m.detected_language,
    CASE
        WHEN m.translated_text IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END as has_translation,
    LEFT(m.translated_text, 50) as translation_preview,
    m.created_at
FROM ai_chat_messages m
WHERE m.conversation_id IN (
    SELECT id FROM ai_chat_conversations
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 5
)
ORDER BY m.conversation_id, m.created_at;

-- Check specifically for Hausa conversations
SELECT
    m.conversation_id,
    m.role,
    m.detected_language,
    LEFT(m.content, 100) as content,
    LEFT(m.translated_text, 100) as translated
FROM ai_chat_messages m
WHERE m.detected_language = 'Hausa'
   OR m.detected_language = 'ha'
   OR LOWER(m.content) LIKE '%ina son%'
ORDER BY m.created_at DESC
LIMIT 10;