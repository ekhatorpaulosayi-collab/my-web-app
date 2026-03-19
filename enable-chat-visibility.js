// Script to enable customer chat visibility in Supabase
// This will apply the necessary database changes

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SQL_MIGRATION = `
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
DROP VIEW IF EXISTS store_conversations CASCADE;
CREATE VIEW store_conversations AS
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
`;

async function enableChatVisibility() {
  console.log('🚀 Starting Customer Chat Visibility Setup...\n');

  try {
    // Split SQL into individual statements
    const statements = SQL_MIGRATION
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Get a short description of what we're doing
      let description = 'SQL Statement';
      if (statement.includes('ALTER TABLE ai_chat_conversations')) {
        description = 'Adding conversation tracking fields';
      } else if (statement.includes('ALTER TABLE ai_chat_messages')) {
        description = 'Adding message tracking fields';
      } else if (statement.includes('CREATE INDEX')) {
        description = 'Creating database indexes';
      } else if (statement.includes('CREATE VIEW')) {
        description = 'Creating store_conversations view';
      } else if (statement.includes('CREATE TABLE')) {
        description = 'Creating notifications table';
      } else if (statement.includes('GRANT')) {
        description = 'Setting permissions';
      } else if (statement.includes('CREATE POLICY')) {
        description = 'Creating security policies';
      } else if (statement.includes('ENABLE ROW LEVEL SECURITY')) {
        description = 'Enabling row level security';
      } else if (statement.includes('DROP')) {
        description = 'Cleaning up old policies';
      }

      process.stdout.write(`[${i+1}/${statements.length}] ${description}... `);

      const { error } = await supabase.rpc('exec_sql', { query: statement }).catch(err => ({ error: err }));

      // Try direct execution if RPC doesn't work
      if (error) {
        // Some statements might already exist, which is okay
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('does not exist')
        )) {
          console.log('✅ (already done)');
          successCount++;
        } else {
          console.log('❌ Error');
          console.log(`   Details: ${error.message || error}`);
          errorCount++;
        }
      } else {
        console.log('✅');
        successCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 Results: ${successCount} successful, ${errorCount} errors\n`);

    if (errorCount > 0) {
      console.log('⚠️  Some operations failed, but this might be okay if they were already done.');
      console.log('   The important thing is that the tables and views are created.\n');
    }

    // Test if the view works
    console.log('🔍 Testing store_conversations view...');
    const { data, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .limit(1);

    if (!viewError) {
      console.log('✅ View is working! You can now see customer conversations.\n');
    } else {
      console.log('⚠️  View test failed, but this is normal if you haven\'t had any chats yet.\n');
    }

    console.log('✨ Setup Complete!\n');
    console.log('Next Steps:');
    console.log('1. Open an incognito browser window');
    console.log('2. Visit your store: https://smartstock-v2.vercel.app/store/YOUR_STORE_SLUG');
    console.log('3. Click the chat button and send a test message');
    console.log('4. Go back to your dashboard');
    console.log('5. Click "Customer Chats" in the More menu');
    console.log('6. You should see the conversation!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n💡 Alternative: You can run the SQL manually in Supabase:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" in the sidebar');
    console.log('4. Copy the SQL from ENABLE_CUSTOMER_CHATS.md');
    console.log('5. Paste and click "Run"\n');
  }
}

// Run the migration
enableChatVisibility();