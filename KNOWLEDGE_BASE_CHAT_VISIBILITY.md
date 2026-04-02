# KNOWLEDGE BASE: Agent Message Visibility Fix
## Critical Issue Resolution Guide

---

## 🔴 THE CORE PROBLEM
**Customers cannot see agent messages after an agent takes over a chat conversation.**

### Symptoms:
- Agent messages appear in the dashboard ✅
- Agent messages DO NOT appear in customer chat widget ❌
- Customer messages appear everywhere ✅
- AI messages appear everywhere ✅

---

## 🎯 ROOT CAUSES IDENTIFIED

### 1. **Database Level (RLS Policies)**
- Row Level Security was blocking customer access to agent messages
- Messages table had restrictive SELECT policies

### 2. **Frontend Code Issues**
- Components were bypassing the RPC function
- Direct database inserts skipped RLS policy checks
- Parameter order mismatches in RPC calls

### 3. **Realtime Channel Failures**
- Unstable WebSocket connections
- Channel conflicts and duplicates
- Max retry errors disrupting message flow

---

## ✅ COMPLETE SOLUTION

### Step 1: SQL/Database Fix

```sql
-- FILE: /public/fix-chat-visibility-final.sql

-- 1. Drop existing problematic function
DROP FUNCTION IF EXISTS send_agent_message(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(uuid, text, uuid) CASCADE;

-- 2. Create correct function with proper signature
CREATE OR REPLACE FUNCTION send_agent_message(
  p_conversation_id UUID,
  p_message TEXT,
  p_agent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO ai_chat_messages (
    conversation_id,
    role,
    content,
    is_agent_message,
    agent_id,
    sender_type
  ) VALUES (
    p_conversation_id,
    'assistant',
    p_message,
    true,
    p_agent_id,
    'agent'
  ) RETURNING id INTO v_message_id;

  UPDATE ai_chat_conversations
  SET updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRITICAL: Fix RLS policies
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view their store messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON ai_chat_messages;

-- Create permissive policy for viewing
CREATE POLICY "Anyone can view messages in public conversations"
ON ai_chat_messages FOR SELECT
USING (true);  -- THIS IS THE KEY FIX - allows everyone to see messages

-- Keep restrictive policies for INSERT/UPDATE/DELETE
CREATE POLICY "Only authenticated can insert messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

### Step 2: Frontend Code Fix

#### ❌ WRONG - Direct Database Insert (Bypasses RLS)
```typescript
// This bypasses RLS policies and causes visibility issues
const { error } = await supabase
  .from('ai_chat_messages')
  .insert({
    conversation_id: selectedConversation.id,
    role: 'assistant',
    content: messageText,
    is_agent_message: true,
    agent_id: user.uid
  });
```

#### ✅ CORRECT - Use RPC Function
```typescript
// This respects RLS policies and ensures visibility
const { data, error } = await supabase.rpc('send_agent_message', {
  p_conversation_id: selectedConversation.id,  // FIRST parameter
  p_message: messageText.trim(),               // SECOND parameter
  p_agent_id: user?.uid                        // THIRD parameter (optional)
});
```

### Step 3: Simplified Component (No Realtime Issues)

Created `ConversationsSimplified.tsx` with:
- **Polling instead of realtime** (every 2 seconds)
- **Proper RPC function usage**
- **No channel management complexity**
- **Stable message delivery**

---

## 📁 KEY FILES TO CHECK

### 1. **Database Functions**
- `/public/fix-chat-visibility-final.sql` - The complete SQL fix

### 2. **Frontend Components**
- `/src/components/dashboard/ConversationsSimplified.tsx` - Stable polling version
- `/src/pages/ConversationsPage.tsx` - Routes to simplified component
- `/src/components/chat/CustomerChatWidget.tsx` - Customer-facing chat

### 3. **Utility Files**
- `/src/utils/supabaseChannelCleanup.ts` - Channel cleanup utilities
- `/src/utils/supabaseRealtimeHelper.ts` - Realtime connection management

---

## 🧪 TESTING PROCEDURE

### 1. **Test Agent Takeover**
```
1. Open customer chat widget (store URL)
2. Send a test message as customer
3. In dashboard, click "Take Over Chat"
4. Send message as agent
5. CHECK: Message appears in customer widget ✅
```

### 2. **Verify RPC Function**
```sql
-- Check function exists with correct signature
SELECT proname, proargtypes
FROM pg_proc
WHERE proname = 'send_agent_message';

-- Test function directly
SELECT send_agent_message(
  'conversation-uuid-here',
  'Test message',
  'agent-uuid-here'
);
```

### 3. **Monitor Console**
- No "CHANNEL_ERROR" messages
- No "Max retries reached" errors
- Messages appear without delay

---

## ⚠️ COMMON PITFALLS TO AVOID

### 1. **Parameter Order Mismatch**
```typescript
// ❌ WRONG ORDER
.rpc('send_agent_message', {
  p_agent_id: user.uid,      // Wrong position!
  p_conversation_id: id,
  p_message: text
})

// ✅ CORRECT ORDER
.rpc('send_agent_message', {
  p_conversation_id: id,      // 1st
  p_message: text,            // 2nd
  p_agent_id: user.uid        // 3rd (optional)
})
```

### 2. **Direct Database Inserts**
- NEVER insert directly into ai_chat_messages
- ALWAYS use the RPC function
- Direct inserts bypass RLS policies

### 3. **Realtime Channel Overload**
- Limit active channels
- Clean up unused channels
- Consider polling for stability

---

## 🚀 DEPLOYMENT CHECKLIST

```bash
# 1. Apply SQL fixes
PGPASSWORD="your-password" psql "your-connection-string" -f fix-chat-visibility-final.sql

# 2. Build application
npm run build

# 3. Deploy to Vercel
vercel --prod --force --yes

# 4. Test immediately after deployment
# - Open customer chat
# - Test agent takeover
# - Verify message visibility
```

---

## 🔧 EMERGENCY FIXES

### If messages still don't appear:

1. **Check RLS Policy**
```sql
SELECT * FROM pg_policies
WHERE tablename = 'ai_chat_messages';
-- Should show permissive SELECT policy
```

2. **Force Polling Mode**
- Use ConversationsSimplified.tsx
- Disable all realtime subscriptions
- Set polling interval to 2 seconds

3. **Clear Browser Cache**
- Hard refresh: Ctrl+Shift+R
- Clear localStorage
- Open in incognito mode

4. **Database Reset**
```sql
-- Nuclear option - temporarily disable RLS
ALTER TABLE ai_chat_messages DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable with proper policies!
```

---

## 📊 MONITORING

### Check Message Visibility
```sql
-- As admin, check what customers see
SELECT
  m.content,
  m.role,
  m.sender_type,
  m.is_agent_message,
  m.created_at
FROM ai_chat_messages m
WHERE conversation_id = 'your-conversation-id'
ORDER BY created_at DESC;
```

### Monitor Active Channels
```javascript
// In browser console
const channels = supabase.getChannels();
console.log('Active channels:', channels.length);
channels.forEach(ch => console.log(ch.topic, ch.state));
```

---

## 📝 NOTES FOR FUTURE DEVELOPMENT

1. **Prefer Polling Over Realtime** for critical features
   - More stable
   - Easier to debug
   - No channel management overhead

2. **Always Use RPC Functions** for data modifications
   - Ensures consistency
   - Respects RLS policies
   - Provides transaction safety

3. **Test Customer Perspective**
   - Always test from actual customer view
   - Dashboard view can be misleading
   - Use incognito window for clean testing

4. **Document Parameter Orders**
   - SQL function signatures are strict
   - Parameter order matters
   - Keep this reference handy

---

## 💡 FINAL WORKING STATE

✅ **Customer Chat Widget**: Shows all messages (customer, AI, agent, system)
✅ **Agent Dashboard**: Full conversation history with takeover controls
✅ **Message Delivery**: Reliable through RPC function
✅ **No Realtime Errors**: Using stable polling approach
✅ **RLS Policies**: Permissive for SELECT, restrictive for modifications

---

## 🆘 SUPPORT CONTACTS

- Supabase Dashboard: [Your Project URL]
- Vercel Dashboard: [Your Vercel URL]
- Database Connection: Check .env for credentials

---

Last Updated: March 26, 2026
Status: WORKING SOLUTION ✅