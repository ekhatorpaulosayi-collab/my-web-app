# 🔧 COMPLETE FIX SYSTEM - Agent Messages + WhatsApp Fallback

## 🎯 Two Goals
1. **Fix agent message visibility** - Customers can see agent messages
2. **Add WhatsApp fallback** - Customers can switch to WhatsApp if agent doesn't respond

---

## 📋 PART A: DATABASE SETUP

### ✅ STEP A1: Add WhatsApp Fields to Database
**Run this in Supabase SQL Editor:**

```sql
-- STEP A1: Add WhatsApp fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS wa_fallback_minutes INTEGER DEFAULT 5;

-- Add chat_status field to conversations
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS chat_status VARCHAR(50) DEFAULT 'active';

-- Check if columns were added
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name IN ('whatsapp_number', 'wa_fallback_minutes')
UNION ALL
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'ai_chat_conversations'
AND column_name = 'chat_status';
```

**PASTE RESULT HERE:**
```
[Your result - should show 3 columns added]
```

---

### ✅ STEP A2: Fix RLS and RPC Function
**Run this complete fix:**

```sql
-- STEP A2: Complete RLS and RPC fix
BEGIN;

-- 1. Drop old functions
DROP FUNCTION IF EXISTS send_agent_message(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS send_agent_message(uuid, text, uuid) CASCADE;

-- 2. Create correct function
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
  SET
    updated_at = NOW(),
    is_agent_active = true,
    agent_id = p_agent_id
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix RLS policies
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop all old SELECT policies
DROP POLICY IF EXISTS "Users can view their store messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages in public conversations" ON ai_chat_messages;
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON ai_chat_messages;

-- Create single permissive SELECT policy
CREATE POLICY "Everyone can view all messages"
ON ai_chat_messages FOR SELECT
USING (true);

-- Keep restrictive INSERT policy
DROP POLICY IF EXISTS "Only authenticated can insert messages" ON ai_chat_messages;
CREATE POLICY "Only authenticated can insert messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;

-- Verify the fix
SELECT 'Function exists' as check,
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'send_agent_message') as result
UNION ALL
SELECT 'RLS is permissive' as check,
       EXISTS(SELECT 1 FROM pg_policies
              WHERE tablename = 'ai_chat_messages'
              AND cmd = 'SELECT'
              AND qual = 'true') as result;
```

**PASTE RESULT HERE:**
```
[Should show both checks as 'true']
```

---

### ✅ STEP A3: Test Message Visibility
**Create test conversation and verify visibility:**

```sql
-- STEP A3: Test complete flow
DO $$
DECLARE
  v_conv_id UUID;
  v_msg_id UUID;
BEGIN
  -- Create test conversation
  INSERT INTO ai_chat_conversations (
    session_id, store_id, visitor_name
  ) VALUES (
    'test-' || gen_random_uuid()::text,
    (SELECT uid FROM auth.users LIMIT 1),
    'Test Customer'
  ) RETURNING id INTO v_conv_id;

  -- Send agent message via RPC
  SELECT send_agent_message(
    v_conv_id,
    'TEST: This is an agent message',
    (SELECT id FROM auth.users LIMIT 1)
  ) INTO v_msg_id;

  -- Output the IDs
  RAISE NOTICE 'Conversation ID: %', v_conv_id;
  RAISE NOTICE 'Message ID: %', v_msg_id;
END $$;

-- Now test as anonymous user
BEGIN;
SET LOCAL ROLE anon;

SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ANONYMOUS CAN SEE MESSAGES'
    ELSE '❌ ANONYMOUS CANNOT SEE MESSAGES - FIX NEEDED'
  END as visibility_test
FROM ai_chat_messages
WHERE content LIKE 'TEST:%';

ROLLBACK;
```

**PASTE RESULT HERE:**
```
[Should show ✅ ANONYMOUS CAN SEE MESSAGES]
```

---

## 📋 PART B: FRONTEND IMPLEMENTATION

### ✅ STEP B1: Create WhatsApp Fallback Component
**I'll create this file for you:**

```bash
# Run this command to create the component
cat > /home/ekhator1/smartstock-v2/src/components/chat/WhatsAppFallback.tsx << 'EOF'
[Component code will be inserted]
EOF
```

### ✅ STEP B2: Update Customer Chat Widget
**Check current chat widget:**

```bash
# Check if CustomerChatWidget exists
ls -la /home/ekhator1/smartstock-v2/src/components/chat/CustomerChatWidget.tsx
```

**PASTE RESULT HERE:**
```
[File listing result]
```

---

### ✅ STEP B3: Integration Points
**We need to update these files:**

1. **CustomerChatWidget.tsx** - Add WhatsApp fallback
2. **ConversationsSimplified.tsx** - Show moved_to_whatsapp status
3. **Store Settings** - Add WhatsApp number input

---

## 📋 PART C: LIVE TESTING

### ✅ STEP C1: Set Store WhatsApp Number
**Run in Supabase SQL Editor (use your store ID):**

```sql
-- STEP C1: Set WhatsApp for testing
UPDATE stores
SET
  whatsapp_number = '+447459044300',  -- Your WhatsApp number
  wa_fallback_minutes = 1  -- 1 minute for testing
WHERE id = (SELECT uid FROM auth.users LIMIT 1);

-- Verify
SELECT id, name, whatsapp_number, wa_fallback_minutes
FROM stores
WHERE whatsapp_number IS NOT NULL;
```

**PASTE RESULT HERE:**
```
[Your store with WhatsApp settings]
```

---

### ✅ STEP C2: Test Complete Flow

#### Test Scenario 1: Agent Takes Over (Happy Path)
1. Customer sends message
2. Agent takes over within 1 minute
3. Agent message appears in customer view
4. No WhatsApp prompt shown

#### Test Scenario 2: WhatsApp Fallback (Timeout Path)
1. Customer sends message
2. Wait 1 minute (no agent takeover)
3. WhatsApp dialog appears
4. Customer can:
   - Keep waiting (timer resets)
   - Switch to WhatsApp (opens wa.me link)

**TEST RESULTS:**
```
Scenario 1: [PASS/FAIL] - Agent message visible? [YES/NO]
Scenario 2: [PASS/FAIL] - WhatsApp dialog shown? [YES/NO]
WhatsApp link works? [YES/NO]
```

---

## 🚨 QUICK FIXES

### Fix 1: If Agent Messages Not Visible
```sql
-- Emergency fix - disable RLS temporarily
ALTER TABLE ai_chat_messages DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable with proper policy!
```

### Fix 2: If WhatsApp Dialog Not Showing
```javascript
// Check in browser console
const { data } = await supabase
  .from('stores')
  .select('whatsapp_number, wa_fallback_minutes')
  .single();
console.log('Store WhatsApp settings:', data);
```

### Fix 3: Force Update Conversation Status
```sql
-- Manually set to moved_to_whatsapp
UPDATE ai_chat_conversations
SET chat_status = 'moved_to_whatsapp'
WHERE id = 'YOUR-CONVERSATION-ID';
```

---

## 📝 IMPLEMENTATION CHECKLIST

Database:
- [ ] WhatsApp fields added to stores table
- [ ] chat_status field added to conversations
- [ ] RPC function works correctly
- [ ] RLS policies are permissive for SELECT

Frontend:
- [ ] WhatsAppFallback component created
- [ ] CustomerChatWidget imports fallback
- [ ] Timer starts on customer message
- [ ] Timer cancels on agent takeover
- [ ] WhatsApp dialog appears after timeout
- [ ] wa.me link opens correctly

Testing:
- [ ] Agent messages visible to customers
- [ ] WhatsApp fallback triggers correctly
- [ ] Status updates to moved_to_whatsapp
- [ ] Store owner sees status in dashboard

---

## 🎯 READY TO START?

Begin with **STEP A1** and paste your results. I'll guide you through each step!

---

Last Updated: March 26, 2026
Version: Complete Fix with WhatsApp Fallback