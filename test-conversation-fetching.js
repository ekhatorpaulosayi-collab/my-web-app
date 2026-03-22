// Test conversation fetching exactly as the frontend does it
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConversationFetching() {
  const userId = 'dffba89b-869d-422a-a542-2e2494850b44'; // ekhatorpaulosayi@gmail.com
  console.log('🔍 Testing conversation fetching for user:', userId);
  console.log('   This simulates what CleanConversations.tsx does\n');

  try {
    // Step 1: Get user's stores (like the frontend does)
    console.log('📊 Step 1: Fetching user stores...');
    const { data: userStores, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId);

    if (storeError) {
      console.error('❌ Error fetching stores:', storeError);
      return;
    }

    if (!userStores || userStores.length === 0) {
      console.log('❌ No stores found for user');
      return;
    }

    console.log(`✅ Found ${userStores.length} store(s):`);
    userStores.forEach((store, i) => {
      console.log(`   ${i + 1}. Store ID: ${store.id}`);
    });

    const storeIds = userStores.map(s => s.id);

    // Step 2: Fetch conversations (exactly as frontend does)
    console.log('\n📋 Step 2: Fetching conversations for these stores...');
    const { data: conversations, error: convError } = await supabase
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

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log('❌ No conversations found');

      // Debug: Check if there are ANY conversations
      const { data: allConvs, count } = await supabase
        .from('ai_chat_conversations')
        .select('*', { count: 'exact' })
        .in('store_id', storeIds);

      console.log(`\n📊 Total conversations for these stores: ${count}`);

      if (allConvs && allConvs.length > 0) {
        console.log('⚠️ Conversations exist but query failed!');
        console.log('   Trying without message join...');

        // Try without joining messages
        const { data: simpleConvs, error: simpleError } = await supabase
          .from('ai_chat_conversations')
          .select('*')
          .in('store_id', storeIds)
          .order('updated_at', { ascending: false });

        if (simpleError) {
          console.log('❌ Simple query also failed:', simpleError);
        } else if (simpleConvs) {
          console.log(`✅ Simple query returned ${simpleConvs.length} conversations`);
          console.log('   Issue is with the join or messages table');
        }
      }
      return;
    }

    // Display results
    console.log(`\n✅ Successfully fetched ${conversations.length} conversation(s):`);
    conversations.forEach((conv, i) => {
      console.log(`\n   ${i + 1}. Conversation ${conv.id.substring(0, 8)}...`);
      console.log(`      Session: ${conv.session_id}`);
      console.log(`      Context: ${conv.context_type || 'Not set'}`);
      console.log(`      Store ID: ${conv.store_id?.substring(0, 8)}...`);
      console.log(`      Visitor: ${conv.visitor_name || conv.visitor_email || 'Anonymous'}`);
      console.log(`      Messages: ${conv.ai_chat_messages?.length || 0}`);
      console.log(`      Created: ${new Date(conv.created_at).toLocaleString()}`);
      console.log(`      Updated: ${new Date(conv.updated_at).toLocaleString()}`);

      if (conv.ai_chat_messages && conv.ai_chat_messages.length > 0) {
        console.log('      First message:', conv.ai_chat_messages[0].content.substring(0, 50) + '...');
      }
    });

    // Step 3: Filter by context types (as frontend does)
    console.log('\n📊 Step 3: Filtering by context types...');
    const storefrontConvs = conversations.filter(c => c.context_type === 'storefront' || c.is_storefront);
    const helpConvs = conversations.filter(c => c.context_type === 'help' && !c.is_storefront);

    console.log(`   - Storefront conversations: ${storefrontConvs.length}`);
    console.log(`   - Help/Dashboard conversations: ${helpConvs.length}`);

    // Step 4: Check data structure
    console.log('\n🔍 Step 4: Checking data structure...');
    if (conversations.length > 0) {
      const sample = conversations[0];
      console.log('   Sample conversation structure:');
      console.log('   Fields:', Object.keys(sample).join(', '));

      if (!sample.visitor_name && !sample.visitor_email) {
        console.log('   ⚠️ No visitor info - might show as "Anonymous"');
      }
      if (!sample.context_type && !sample.is_storefront) {
        console.log('   ⚠️ No context info - might not display correctly');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testConversationFetching().catch(console.error);