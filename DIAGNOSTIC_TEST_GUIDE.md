# 🔬 DIAGNOSTIC TEST GUIDE: Agent Message Visibility
## Complete Testing & Troubleshooting Guide

---

## 🎯 OBJECTIVE
**Verify that customers can see agent messages after agent takeover.**

---

## 📋 PRE-TEST CHECKLIST

### 1. Verify Deployment
```bash
# Check latest deployment URL
echo "Latest deployment: https://smartstock-v2-3p3grphn1-pauls-projects-cfe953d7.vercel.app"
```

### 2. Clear Test Environment
- Open Chrome Incognito window (Ctrl+Shift+N)
- Or clear browser data: Settings → Privacy → Clear browsing data
- This ensures no cached data interferes

### 3. Have Two Browser Windows Ready
- **Window 1**: Customer view (store URL)
- **Window 2**: Admin dashboard (/dashboard/conversations)

---

## 🧪 SYSTEMATIC TEST PROCEDURE

### PHASE 1: Database Function Verification

#### Test 1.1: Check RPC Function Exists
```sql
-- Run in Supabase SQL Editor
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'send_agent_message';
```
**✅ PASS**: Should return function with arguments: `(p_conversation_id uuid, p_message text, p_agent_id uuid)`
**❌ FAIL**: No rows returned or wrong argument order

#### Test 1.2: Check RLS Policies
```sql
-- Run in Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'ai_chat_messages'
ORDER BY cmd;
```
**✅ PASS**: Should have a SELECT policy with `qual = true` (permissive)
**❌ FAIL**: SELECT policy is restrictive or missing

#### Test 1.3: Test Direct Function Call
```sql
-- Run in Supabase SQL Editor (use a real conversation ID)
SELECT send_agent_message(
  'YOUR-CONVERSATION-ID'::uuid,
  'Test message from SQL',
  'YOUR-USER-ID'::uuid
);
```
**✅ PASS**: Returns a UUID (message ID)
**❌ FAIL**: Error or NULL returned

---

### PHASE 2: Frontend Component Check

#### Test 2.1: Verify Correct Component is Loaded
1. Open browser DevTools (F12)
2. Go to Network tab
3. Load `/dashboard/conversations`
4. Search for "ConversationsSimplified" in loaded files

**✅ PASS**: ConversationsSimplified.tsx is loaded
**❌ FAIL**: ConversationsPageFixed.tsx or other component loaded

#### Test 2.2: Check Console for Errors
1. Open Console tab in DevTools
2. Look for errors:

**✅ PASS**: No errors related to:
- Supabase channels
- RPC functions
- Message sending

**❌ FAIL**: Errors like:
- "CHANNEL_ERROR"
- "Max retries reached"
- "RPC function not found"
- "Permission denied"

---

### PHASE 3: Live Message Flow Test

#### Test 3.1: Customer Initiates Chat
1. **Customer Window**: Go to `/store/paulglobal` (or your store)
2. Open chat widget (bottom-right)
3. Send message: "Test customer message"
4. Note the timestamp

**✅ PASS**: Message appears instantly, AI responds
**❌ FAIL**: Message doesn't appear or errors occur

#### Test 3.2: Agent Takes Over
1. **Admin Window**: Go to `/dashboard/conversations`
2. Click on the new conversation
3. Verify you see the customer message
4. Click "Take Over Chat" button

**✅ PASS**:
- Button changes to "End Takeover"
- System message appears in chat
**❌ FAIL**:
- Button doesn't change
- No system message
- Console errors

#### Test 3.3: Agent Sends Message
1. **Admin Window**: Type "Hello from agent"
2. Click Send
3. Note exact time sent

**✅ PASS**: Message appears in admin view with green background
**❌ FAIL**: Message doesn't appear or shows error

#### Test 3.4: Customer Sees Agent Message
1. **Customer Window**: Wait 2-3 seconds
2. Check for new messages

**✅ PASS**: Agent message appears with:
- Green background
- "👤 Agent" label
- Correct content
- Within 3 seconds

**❌ FAIL**:
- No new message appears
- Only system message visible
- Wrong formatting

---

## 🔍 DIAGNOSTIC QUERIES

### Query 1: Check Message Insertion
```sql
-- Run immediately after sending agent message
SELECT
  id,
  content,
  role,
  sender_type,
  is_agent_message,
  agent_id,
  created_at
FROM ai_chat_messages
WHERE conversation_id = 'YOUR-CONVERSATION-ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Query 2: Verify Message Visibility
```sql
-- Check what an anonymous user would see
SET ROLE anon;
SELECT content, sender_type
FROM ai_chat_messages
WHERE conversation_id = 'YOUR-CONVERSATION-ID';
RESET ROLE;
```

### Query 3: Check Conversation State
```sql
SELECT
  id,
  is_agent_active,
  agent_id,
  takeover_status,
  updated_at
FROM ai_chat_conversations
WHERE id = 'YOUR-CONVERSATION-ID';
```

---

## 🐛 FAILURE POINT ANALYSIS

### Scenario A: "Message in DB but not visible to customer"

**Symptoms**:
- Query 1 shows message exists ✅
- Admin sees message ✅
- Customer doesn't see message ❌

**Root Cause**: RLS policy issue
**Fix**:
```sql
-- Emergency fix
DROP POLICY IF EXISTS "Anyone can view messages in public conversations" ON ai_chat_messages;
CREATE POLICY "Anyone can view messages in public conversations"
ON ai_chat_messages FOR SELECT
USING (true);
```

---

### Scenario B: "Message not in database"

**Symptoms**:
- Query 1 shows no new message ❌
- Admin shows "sending..." then error ❌
- Console shows RPC error ❌

**Root Cause**: RPC function issue
**Fix**:
1. Check function signature matches
2. Re-run SQL fix file
3. Verify frontend uses correct parameters

---

### Scenario C: "Polling not working"

**Symptoms**:
- Message in DB ✅
- No realtime errors ✅
- Customer doesn't see until refresh ❌

**Root Cause**: Polling interval issue
**Fix**:
```javascript
// In ConversationsSimplified.tsx, verify:
pollingInterval.current = setInterval(() => {
  loadMessages();
}, 2000); // Should be 2 seconds
```

---

### Scenario D: "Wrong component loaded"

**Symptoms**:
- Everything seems to work ✅
- But uses realtime (channels) ❌
- Errors appear after time ❌

**Root Cause**: ConversationsPageFixed still active
**Fix**:
```typescript
// In ConversationsPage.tsx should be:
import ConversationsSimplified from '../components/dashboard/ConversationsSimplified';
// NOT ConversationsPageFixed
```

---

## 📊 TEST RESULTS TEMPLATE

Copy and fill this out:

```
TEST RESULTS - [DATE/TIME]
========================

Database Tests:
□ RPC function exists: [PASS/FAIL]
□ RLS policies correct: [PASS/FAIL]
□ Direct function call works: [PASS/FAIL]

Frontend Tests:
□ Correct component loaded: [PASS/FAIL]
□ No console errors: [PASS/FAIL]

Message Flow:
□ Customer message works: [PASS/FAIL]
□ Agent takeover works: [PASS/FAIL]
□ Agent message sends: [PASS/FAIL]
□ Customer sees agent message: [PASS/FAIL]

Timing:
- Message appears in: [X] seconds
- Using: [Polling/Realtime]

Failed at Step: [DESCRIBE]
Error Message: [PASTE ERROR]
```

---

## 🚨 EMERGENCY FIXES

### Fix 1: Force Disable RLS (Temporary)
```sql
-- DANGER: Only for testing!
ALTER TABLE ai_chat_messages DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable!
```

### Fix 2: Direct Database Insert Test
```sql
-- Bypass RPC to test visibility
INSERT INTO ai_chat_messages (
  conversation_id,
  role,
  content,
  is_agent_message,
  sender_type,
  agent_id
) VALUES (
  'YOUR-CONVERSATION-ID',
  'assistant',
  'Direct test message',
  true,
  'agent',
  'YOUR-AGENT-ID'
);
```

### Fix 3: Browser Console Test
```javascript
// Run in customer window console
// Check if polling is active
const intervals = [];
const originalSetInterval = window.setInterval;
window.setInterval = function(fn, delay) {
  intervals.push({fn: fn.toString(), delay});
  return originalSetInterval.apply(window, arguments);
};
console.log('Active intervals:', intervals);
```

---

## ✅ SUCCESS CRITERIA

The test is successful when:

1. **Customer sees ALL messages**:
   - Their own messages
   - AI responses
   - System notifications
   - **Agent messages** (CRITICAL)

2. **Timing is acceptable**:
   - Messages appear within 3 seconds
   - No delay longer than polling interval (2s)

3. **No errors in console**:
   - No channel errors
   - No RPC errors
   - No permission errors

4. **Messages persist**:
   - Survive page refresh
   - Visible in new sessions
   - Consistent across views

---

## 📝 NOTES

- Always test in incognito/private browsing
- Test with actual store URL, not localhost
- Check both desktop and mobile views
- Document any console errors exactly
- Save conversation IDs for debugging

---

Last Updated: March 26, 2026
Status: Complete Diagnostic Guide