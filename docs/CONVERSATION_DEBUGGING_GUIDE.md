# Conversation Chat Widget Debugging Guide

## Overview
This guide provides comprehensive debugging tools and procedures for troubleshooting the AI chat widget and conversation tracking system.

## Common Issues & Solutions

### 1. Conversations Not Showing in Dashboard

**Symptoms:**
- Chat widget works but conversations don't appear in dashboard
- "No conversations yet" message despite active chats

**Root Causes:**
1. RLS (Row Level Security) policies blocking access
2. Conversations not being saved to database
3. Store ID not being linked to conversations
4. Frontend not fetching data correctly

**Quick Fix Steps:**

1. **Check if conversations exist in database:**
```bash
node check-user-conversations.js
```

2. **Test RLS policies:**
```bash
node test-rls-conversations.js
```

3. **Fix RLS policies if needed:**
```sql
-- Run in Supabase SQL Editor
-- File: fix-rls-policies.sql
```

### 2. Chat Messages Not Saving

**Symptoms:**
- Users can send messages but they don't persist
- AI responds but conversation history is lost

**Debugging Script:**
```bash
node test-help-conversation.js
```

### 3. Storefront Conversations Not Tracking

**Symptoms:**
- Customer chats on storefront not appearing
- Anonymous visitors not being tracked

**Debugging Script:**
```bash
node test-conversation-fetching.js
```

## Debugging Scripts

### 1. check-user-conversations.js
```javascript
// Check conversations for specific user
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUserConversations() {
  const userId = 'dffba89b-869d-422a-a542-2e2494850b44'; // Replace with user ID
  console.log('🔍 Checking conversations for user:', userId);

  // 1. Find user's store
  const { data: userStores } = await supabase
    .from('stores')
    .select('id, business_name')
    .eq('user_id', userId);

  if (!userStores || userStores.length === 0) {
    console.log('❌ No store found for this user!');
    return;
  }

  console.log(`✅ Found ${userStores.length} store(s)`);
  const storeIds = userStores.map(s => s.id);

  // 2. Check conversations
  const { data: conversations } = await supabase
    .from('ai_chat_conversations')
    .select('*')
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });

  console.log(`\n✅ Found ${conversations?.length || 0} conversations`);
}

checkUserConversations().catch(console.error);
```

### 2. test-conversation-fetching.js
```javascript
// Simulates exactly what the frontend does
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConversationFetching() {
  const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

  // Get user's stores
  const { data: userStores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userId);

  const storeIds = userStores.map(s => s.id);

  // Fetch conversations (exactly as frontend)
  const { data: conversations, error } = await supabase
    .from('ai_chat_conversations')
    .select(`
      *,
      ai_chat_messages (
        id,
        role,
        content,
        created_at
      )
    `)
    .in('store_id', storeIds)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ Error fetching conversations:', error);
  } else {
    console.log(`✅ Fetched ${conversations?.length || 0} conversations`);
  }
}

testConversationFetching().catch(console.error);
```

### 3. check-fix-rls.js
```javascript
// Check and diagnose RLS policy issues
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRLS() {
  console.log('🔍 Checking RLS configuration...\n');

  // Get current RLS policies
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, cmd')
    .in('tablename', ['ai_chat_conversations', 'ai_chat_messages']);

  const convPolicies = policies?.filter(p => p.tablename === 'ai_chat_conversations') || [];
  const msgPolicies = policies?.filter(p => p.tablename === 'ai_chat_messages') || [];

  console.log(`ai_chat_conversations: ${convPolicies.length} policies`);
  console.log(`ai_chat_messages: ${msgPolicies.length} policies`);

  if (convPolicies.length === 0 || msgPolicies.length === 0) {
    console.log('\n⚠️ MISSING RLS POLICIES DETECTED!');
    console.log('Run fix-rls-policies.sql in Supabase SQL Editor');
  }
}

checkRLS().catch(console.error);
```

## SQL Fixes

### fix-rls-policies.sql
```sql
-- Complete RLS fix for conversation visibility

-- Enable RLS
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Store owners view their conversations" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Allow public conversation creation" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Allow conversation updates" ON ai_chat_conversations;
DROP POLICY IF EXISTS "Store owners view their messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Allow public message creation" ON ai_chat_messages;

-- Create working policies
CREATE POLICY "Store owners view their conversations"
  ON ai_chat_conversations FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Allow public conversation creation"
  ON ai_chat_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow conversation updates"
  ON ai_chat_conversations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Store owners view their messages"
  ON ai_chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_chat_conversations
      WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow public message creation"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (true);
```

## Edge Function Fixes

### Key areas in supabase/functions/ai-chat/index.ts:

1. **Ensure conversation is created for all contexts:**
```typescript
// Save conversation for ALL authenticated users
if (userId && store) {
  const conversationData = {
    user_id: userId,
    session_id: sessionId,
    context_type: contextType || 'help',
    store_id: store.id,
    is_storefront: contextType === 'storefront',
    source_page: headers.get('referer') || undefined
  };

  const { data: conversation } = await supabase
    .from('ai_chat_conversations')
    .upsert(conversationData)
    .select()
    .single();
}
```

2. **Save both user and assistant messages:**
```typescript
// Save user message
await supabase
  .from('ai_chat_messages')
  .insert({
    conversation_id: conversation.id,
    role: 'user',
    content: message
  });

// Save assistant response
await supabase
  .from('ai_chat_messages')
  .insert({
    conversation_id: conversation.id,
    role: 'assistant',
    content: aiResponse
  });
```

## Frontend Debugging

### Add debug logging to CleanConversations.tsx:
```typescript
const loadConversations = async () => {
  console.log('[ConversationsPage] Loading conversations for user:', user?.uid);

  // Get user's stores
  const { data: userStores, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', user?.uid);

  console.log('[ConversationsPage] User stores:', userStores);

  // Fetch conversations
  const { data, error } = await supabase
    .from('ai_chat_conversations')
    .select(`
      *,
      ai_chat_messages (
        id,
        role,
        content,
        created_at
      )
    `)
    .in('store_id', storeIds)
    .order('updated_at', { ascending: false });

  console.log('[ConversationsPage] Conversations:', data);
  console.log('[ConversationsPage] Error:', error);
};
```

## Build & Deploy Issues

### Clear cache and rebuild:
```bash
# Clear Vite cache
rm -rf node_modules/.vite
rm -rf dist

# Rebuild
npm run build

# Deploy
vercel --prod --yes
```

## Quick Diagnostic Checklist

1. **Check conversations exist:**
   ```bash
   node check-user-conversations.js
   ```

2. **Verify RLS policies:**
   ```bash
   node check-fix-rls.js
   ```

3. **Test as authenticated user:**
   ```bash
   node test-rls-conversations.js
   ```

4. **Check edge function logs:**
   - Go to Supabase Dashboard > Functions
   - View logs for `ai-chat` function

5. **Verify frontend is updated:**
   - Check browser console for [ConversationsPage] debug logs
   - Clear browser cache if needed

## Emergency Recovery

If conversations completely stop working:

1. **Run full RLS reset:**
   ```sql
   -- In Supabase SQL Editor
   -- Run contents of fix-rls-policies.sql
   ```

2. **Redeploy edge function:**
   ```bash
   supabase functions deploy ai-chat
   ```

3. **Clear and rebuild frontend:**
   ```bash
   rm -rf node_modules/.vite dist
   npm run build
   vercel --prod --yes
   ```

## Support Contacts

- Supabase Dashboard: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl
- SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new
- Edge Function Logs: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/functions/ai-chat/logs

## Test User Credentials
- Email: ekhatorpaulosayi@gmail.com
- User ID: dffba89b-869d-422a-a542-2e2494850b44
- Store: paulglobal (d93cd891-7e0a-47a8-9963-5e2a00a2591f)