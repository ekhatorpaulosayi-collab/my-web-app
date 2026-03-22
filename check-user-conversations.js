// Check conversations for specific user
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUserConversations() {
  const userId = 'dffba89b-869d-422a-a542-2e2494850b44';
  console.log('🔍 Checking conversations for user:', userId);
  console.log('   Email: ekhatorpaulosayi@gmail.com\n');

  try {
    // 1. First, find this user's store
    console.log('📊 Finding user\'s store...');
    const { data: userStores, error: storeError } = await supabase
      .from('stores')
      .select('id, business_name')
      .eq('user_id', userId);

    if (storeError) {
      console.error('❌ Error fetching store:', storeError);
      return;
    }

    if (!userStores || userStores.length === 0) {
      console.log('❌ No store found for this user!');
      console.log('   This is why conversations aren\'t showing');
      return;
    }

    console.log(`✅ Found ${userStores.length} store(s) for user:`);
    userStores.forEach(store => {
      console.log(`   - Store ID: ${store.id}`);
      console.log(`   - Business: ${store.business_name}`);
    });

    const storeIds = userStores.map(s => s.id);

    // 2. Check conversations linked to these stores
    console.log('\n📋 Checking conversations for these stores...');
    const { data: conversations, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('id, session_id, context_type, is_storefront, store_id, created_at, visitor_name, visitor_email')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log('❌ No conversations found for these stores');

      // Check if there are ANY conversations in the system
      const { count: totalConv } = await supabase
        .from('ai_chat_conversations')
        .select('*', { count: 'exact' });

      console.log(`\n📊 Total conversations in system: ${totalConv}`);

      // Check recent conversations without store_id filter
      const { data: recentConv } = await supabase
        .from('ai_chat_conversations')
        .select('store_id, context_type')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentConv && recentConv.length > 0) {
        console.log('\n🔍 Recent conversations (not linked to your store):');
        recentConv.forEach((c, i) => {
          console.log(`   ${i + 1}. Store: ${c.store_id?.substring(0, 8)}... Context: ${c.context_type}`);
        });
      }
    } else {
      console.log(`\n✅ Found ${conversations.length} conversations for your store(s):`);
      conversations.forEach((conv, i) => {
        console.log(`\n   ${i + 1}. Conversation ${conv.id.substring(0, 8)}...`);
        console.log(`      Session: ${conv.session_id}`);
        console.log(`      Context: ${conv.context_type}`);
        console.log(`      Is Storefront: ${conv.is_storefront ? 'Yes' : 'No'}`);
        console.log(`      Visitor: ${conv.visitor_name || conv.visitor_email || 'Anonymous'}`);
        console.log(`      Created: ${new Date(conv.created_at).toLocaleString()}`);
      });
    }

    // 3. Check if conversations page query would work
    console.log('\n🧪 Testing the exact query used by Conversations page...');
    const { data: pageQuery, error: pageError } = await supabase
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

    if (pageError) {
      console.log('❌ Page query failed:', pageError);
    } else if (pageQuery && pageQuery.length > 0) {
      console.log(`✅ Page query would return ${pageQuery.length} conversations`);
    } else {
      console.log('❌ Page query returns no results');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkUserConversations().catch(console.error);