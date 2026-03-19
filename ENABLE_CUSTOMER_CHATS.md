# 🚀 Enable Customer Chat Visibility - Step by Step Guide

This will allow you to see all customer conversations from your online store.

## Step 1: Run SQL Migration in Supabase

1. **Login to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Copy and Paste This ENTIRE SQL Code:**

```sql
-- SQL Migration: Fix Storefront Chat Visibility
-- This adds the necessary fields to track storefront conversations

-- 1. Add store_id to conversations table to link chats to stores
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id),
ADD COLUMN IF NOT EXISTS visitor_name TEXT,
ADD COLUMN IF NOT EXISTS visitor_email TEXT,
ADD COLUMN IF NOT EXISTS visitor_phone TEXT,
ADD COLUMN IF NOT EXISTS source_page TEXT,
ADD COLUMN IF NOT EXISTS is_storefront BOOLEAN DEFAULT FALSE;

-- 2. Add store_id to messages for quick filtering
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_store_id
ON ai_chat_conversations(store_id)
WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_store_id
ON ai_chat_messages(store_id)
WHERE store_id IS NOT NULL;

-- 4. Create view for store owners to see their chats
CREATE OR REPLACE VIEW store_conversations AS
SELECT
  c.id,
  c.store_id,
  c.session_id,
  c.visitor_name,
  c.visitor_email,
  c.visitor_phone,
  c.created_at,
  c.updated_at,
  c.context_type,
  c.source_page,
  s.business_name,
  s.store_slug,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at,
  CASE
    WHEN MAX(m.created_at) > NOW() - INTERVAL '5 minutes' THEN 'active'
    WHEN MAX(m.created_at) > NOW() - INTERVAL '1 hour' THEN 'recent'
    ELSE 'inactive'
  END as status
FROM ai_chat_conversations c
JOIN stores s ON c.store_id = s.id
LEFT JOIN ai_chat_messages m ON c.id = m.conversation_id
WHERE c.is_storefront = TRUE
GROUP BY c.id, s.business_name, s.store_slug;

-- 5. Create table for real-time notifications
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  conversation_id UUID REFERENCES ai_chat_conversations(id),
  user_id UUID REFERENCES users(id), -- Store owner
  type VARCHAR(50), -- 'new_chat', 'new_message', 'high_intent'
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Grant permissions
GRANT SELECT ON store_conversations TO authenticated;
GRANT ALL ON chat_notifications TO authenticated;

-- 7. RLS Policies
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Store owners can view their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners can view their messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can view their notifications" ON chat_notifications;

-- Store owners can see their store's conversations
CREATE POLICY "Store owners can view their conversations"
ON ai_chat_conversations FOR SELECT
USING (
  store_id IN (
    SELECT id FROM stores
    WHERE user_id = auth.uid()
  )
);

-- Store owners can see their store's messages
CREATE POLICY "Store owners can view their messages"
ON ai_chat_messages FOR SELECT
USING (
  store_id IN (
    SELECT id FROM stores
    WHERE user_id = auth.uid()
  )
);

-- Users can see their notifications
CREATE POLICY "Users can view their notifications"
ON chat_notifications FOR ALL
USING (user_id = auth.uid());

-- 8. Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Chat visibility setup complete!';
  RAISE NOTICE 'Store owners can now see customer conversations.';
END $$;
```

4. **Click "Run" Button**
   - Wait for "Success" message
   - Should take about 2-3 seconds

---

## Step 2: Deploy Updated Edge Function

1. **In your terminal, run:**

```bash
# First, let's check if supabase CLI is installed
supabase --version

# If not installed, install it:
npm install -g supabase

# Link to your project (you'll need project ref and database password)
supabase link --project-ref yzlniqwzqlsftxrtapdl

# Deploy the edge function
supabase functions deploy ai-chat
```

2. **Alternative Method - Manual Update in Supabase Dashboard:**

If the above doesn't work, you can update directly in Supabase:

1. Go to Supabase Dashboard
2. Click "Edge Functions" in sidebar
3. Find "ai-chat" function
4. Click "Edit"
5. Look for the `handleStorefrontChat` function
6. Make sure it includes this code to save conversations:

```typescript
// Save visitor message
const { error: msgError } = await supabase
  .from('ai_chat_messages')
  .insert({
    conversation_id: conversation.id,
    store_id: store.id,
    role: 'user',
    content: message,
  });

// Save AI response
const { error: respError } = await supabase
  .from('ai_chat_messages')
  .insert({
    conversation_id: conversation.id,
    store_id: store.id,
    role: 'assistant',
    content: aiResponse,
  });
```

---

## Step 3: Test It's Working

1. **Open an incognito/private browser window**
2. **Go to your storefront:** https://smartstock-v2.vercel.app/store/YOUR_STORE_SLUG
3. **Click the chat button and send a test message**
4. **Go back to your dashboard**
5. **Click "Customer Chats" in the More menu**
6. **You should now see the conversation!**

---

## 🎯 What You'll See After Setup:

### In Customer Chats Page:
- **Live conversation list** with visitor details
- **Message history** for each chat
- **Real-time updates** when new messages arrive
- **Contact buttons** for WhatsApp/Email
- **Status indicators** (Active/Recent/Inactive)

### Features Available:
- ✅ See all visitor conversations
- ✅ Track customer inquiries
- ✅ Get notified of high-intent customers
- ✅ Contact customers directly via WhatsApp/Email
- ✅ Monitor chat activity in real-time

---

## ⚠️ Troubleshooting:

### If SQL fails with "table not found":
Run this first:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ai_chat_conversations', 'ai_chat_messages', 'stores');
```

### If you don't see conversations after setup:
1. Make sure you're testing from a different browser/incognito
2. Clear browser cache
3. Check that the Edge Function was deployed
4. New conversations only - old ones won't show

### If Edge Function deployment fails:
- Use the manual update method in Supabase Dashboard
- Or ask for help at support@supabase.com

---

## 📞 Need Help?

- **Supabase Support:** support@supabase.com
- **Documentation:** https://supabase.com/docs

Once this is set up, you'll have full visibility into all customer conversations from your online store!