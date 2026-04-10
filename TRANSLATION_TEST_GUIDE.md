# SmartStock Translation Flow Testing Guide

## Summary of Fixes Applied

### 1. Backend - Edge Function (send-agent-message)
- **Issue**: Customer's detected_language wasn't being found when owner replied
- **Fix Applied**:
  - Expanded query to fetch last 5 customer messages instead of 1
  - Removed restrictive `.not('detected_language', 'is', null)` filter
  - Added comprehensive debug logging
  - Location: `/supabase/functions/send-agent-message/index.ts`

### 2. Frontend - Chat Widget
- **Issue**: Customer widget showed English content instead of translated_text
- **Fix Applied**:
  - Changed condition from `msg.is_agent_message && msg.translated_text` to just `msg.translated_text`
  - Now any assistant message with translation shows the translated version
  - Location: `/src/components/AIChatWidget.tsx` (lines ~2477-2491)

## Manual Testing Steps

### Step 1: Access the Test Store
1. Open browser in incognito/private mode
2. Navigate to: https://smartstock-v2.vercel.app/store/test-store
3. You should see the storefront with a chat widget in the bottom right

### Step 2: Send Customer Message in Hausa
1. Click on the chat widget to open it
2. Enter your name when prompted
3. Send the following message in Hausa:
   ```
   Ina son siyan iPhone
   ```
   (Translation: "I want to buy an iPhone")

4. Wait for the AI to respond (it should respond in Hausa automatically)

### Step 3: Agent Takeover
1. In a different browser/tab, log in as the store owner
2. Navigate to Dashboard → Conversations
3. Find the conversation you just created
4. Click "Take Over" button to activate human agent mode
5. The button should change to show agent is active

### Step 4: Send Owner Reply in English
1. Type a reply in English, for example:
   ```
   The iPhone 15 Pro is available for ₦1,500,000. Would you like to proceed with the purchase?
   ```
2. Click Send

### Step 5: Verify Translation in Customer View
1. Go back to the incognito browser with the customer chat
2. Within 3-5 seconds (polling interval), you should see:
   - The owner's message translated to Hausa
   - A small italic text below saying "Translated from English"

### Expected Result
The customer should see something like:
```
iPhone 15 Pro yana samuwa akan ₦1,500,000. Kuna son ci gaba da siyan?
(Translated from English)
```

## Verification Points

### Backend Verification
Check edge function logs:
```bash
# View recent logs (requires Supabase Dashboard access)
# Go to: https://app.supabase.com/project/yzlniqwzqlsftxrtapdl/functions/send-agent-message/logs
```

Look for these log messages:
- `[SendAgentMessage] Starting - conversationId: ...`
- `[SendAgentMessage] Customer messages query result: ...`
- `[SendAgentMessage] Customer language detected: Hausa`
- `[SendAgentMessage] Translation successful: ...`

### Database Verification
In Supabase SQL Editor, run:
```sql
-- Check recent messages with translations
SELECT
    id,
    conversation_id,
    role,
    is_agent_message,
    detected_language,
    LEFT(content, 50) as content_preview,
    LEFT(translated_text, 50) as translation_preview,
    created_at
FROM ai_chat_messages
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND (detected_language IS NOT NULL OR translated_text IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;
```

### Frontend Verification
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for requests to `/rest/v1/ai_chat_messages`
5. Check the response includes `translated_text` field for agent messages

## Troubleshooting

### Issue: Translation not appearing
1. **Check conversation status**:
   - Ensure `is_agent_active = true` in database
   - Verify agent_id is set

2. **Check edge function deployment**:
   ```bash
   supabase functions deploy send-agent-message --project-ref yzlniqwzqlsftxrtapdl
   ```

3. **Check frontend deployment**:
   ```bash
   npm run build && vercel --prod --force --yes
   ```

### Issue: Wrong language detected
1. Check the `detected_language` value in database
2. Ensure customer's first message is in the target language
3. Language detection works best with longer messages

### Issue: Polling not updating
1. Check browser console for errors
2. Verify polling interval is running (should see fetch requests every 3 seconds)
3. Check if conversation_id matches between customer and agent views

## Test Data Cleanup

After testing, clean up test data:
```sql
-- Delete test conversations (be careful with this!)
DELETE FROM ai_chat_messages
WHERE conversation_id IN (
    SELECT id FROM ai_chat_conversations
    WHERE visitor_name = 'Test Customer'
    AND created_at > NOW() - INTERVAL '1 hour'
);

DELETE FROM ai_chat_conversations
WHERE visitor_name = 'Test Customer'
AND created_at > NOW() - INTERVAL '1 hour';
```

## Supported Languages

The system currently supports translation between:
- English ↔ Hausa
- English ↔ Yoruba
- English ↔ Igbo
- English ↔ Nigerian Pidgin

## Success Criteria

✅ Translation is working correctly if:
1. Customer sends message in their language (e.g., Hausa)
2. AI responds in the same language automatically
3. When agent takes over and replies in English
4. Customer sees the translated version in their language
5. "Translated from English" indicator appears below the message

## Additional Notes

- Translation uses OpenAI GPT-4o Mini model
- Translations are cached in `translated_text` column
- Original content is always preserved in `content` column
- Polling interval: 3 seconds active, 5 seconds idle
- Edge functions have 10-second timeout limit

## Contact for Issues

If translations are still not working after following this guide:
1. Check edge function logs in Supabase Dashboard
2. Verify all environment variables are set correctly
3. Ensure OpenAI API key has sufficient credits
4. Check browser console for client-side errors

Last Updated: April 9, 2026
Status: Translation system deployed and ready for testing