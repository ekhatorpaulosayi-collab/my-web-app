// Check and report on RLS policies
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRLS() {
  console.log('🔍 Checking RLS configuration for conversations\n');

  try {
    // Check if RLS is enabled on the tables
    const { data: tables, error: tableError } = await supabase
      .rpc('pg_catalog_pg_class')
      .select('relname, relrowsecurity')
      .in('relname', ['ai_chat_conversations', 'ai_chat_messages']);

    if (!tableError && tables) {
      console.log('📊 RLS Status:');
      tables.forEach(t => {
        console.log(`   - ${t.relname}: RLS ${t.relrowsecurity ? 'ENABLED' : 'DISABLED'}`);
      });
    }

    // Get current RLS policies
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd, qual, with_check')
      .in('tablename', ['ai_chat_conversations', 'ai_chat_messages']);

    if (!policyError && policies) {
      console.log('\n📊 Current RLS Policies:');

      const convPolicies = policies.filter(p => p.tablename === 'ai_chat_conversations');
      const msgPolicies = policies.filter(p => p.tablename === 'ai_chat_messages');

      console.log(`\n   ai_chat_conversations (${convPolicies.length} policies):`);
      if (convPolicies.length === 0) {
        console.log('   ❌ No policies found - only service role can access!');
      } else {
        convPolicies.forEach(p => {
          console.log(`   • ${p.policyname} (${p.cmd})`);
          if (p.qual) console.log(`     Condition: ${p.qual.substring(0, 100)}...`);
        });
      }

      console.log(`\n   ai_chat_messages (${msgPolicies.length} policies):`);
      if (msgPolicies.length === 0) {
        console.log('   ❌ No policies found - only service role can access!');
      } else {
        msgPolicies.forEach(p => {
          console.log(`   • ${p.policyname} (${p.cmd})`);
          if (p.qual) console.log(`     Condition: ${p.qual.substring(0, 100)}...`);
        });
      }

      // If no policies, provide SQL to fix
      if (convPolicies.length === 0 || msgPolicies.length === 0) {
        console.log('\n⚠️ MISSING RLS POLICIES DETECTED!');
        console.log('\n📝 SQL to fix the issue:');
        console.log('```sql');

        if (convPolicies.length === 0) {
          console.log('-- Enable RLS on ai_chat_conversations');
          console.log('ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;');
          console.log('');
          console.log('-- Allow users to see conversations for their stores');
          console.log(`CREATE POLICY "Users can view conversations for their stores"
  ON ai_chat_conversations
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );`);
        }

        if (msgPolicies.length === 0) {
          console.log('');
          console.log('-- Enable RLS on ai_chat_messages');
          console.log('ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;');
          console.log('');
          console.log('-- Allow users to see messages for conversations they can access');
          console.log(`CREATE POLICY "Users can view messages for accessible conversations"
  ON ai_chat_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_chat_conversations
      WHERE store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
      )
    )
  );`);
        }

        console.log('```');
        console.log('\n👉 Run this SQL in your Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');
      } else {
        console.log('\n✅ RLS policies exist for both tables');
      }
    }

    // Test actual data access
    console.log('\n📊 Testing Data Access:');
    const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

    // Get user's store
    const { data: stores } = await supabase
      .from('stores')
      .select('id, business_name')
      .eq('user_id', userId);

    if (stores && stores.length > 0) {
      const storeId = stores[0].id;
      console.log(`   Testing for store: ${stores[0].business_name} (${storeId})`);

      // Count conversations
      const { count: convCount } = await supabase
        .from('ai_chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      console.log(`   - Conversations in database: ${convCount}`);

      // Count messages
      const { data: convIds } = await supabase
        .from('ai_chat_conversations')
        .select('id')
        .eq('store_id', storeId);

      if (convIds && convIds.length > 0) {
        const { count: msgCount } = await supabase
          .from('ai_chat_messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds.map(c => c.id));

        console.log(`   - Messages in database: ${msgCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking RLS:', error);
  }
}

// Run the check
checkRLS().catch(console.error);