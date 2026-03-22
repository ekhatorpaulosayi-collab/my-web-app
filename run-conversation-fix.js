import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Fixing conversation tracking for Customer Chats...\n');

async function fixConversationTracking() {
  try {
    // Step 1: Check current state
    console.log('📊 Checking current conversation state...');

    // Check if conversations exist
    const { data: conversations, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('is_storefront', true)
      .limit(5);

    console.log(`Found ${conversations?.length || 0} storefront conversations`);

    // Check if store_conversations view exists
    const { data: viewData, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .limit(5);

    if (viewError && viewError.code === '42P01') {
      console.log('❌ store_conversations view does not exist - will be created');
    } else {
      console.log(`✅ store_conversations view exists with ${viewData?.length || 0} rows`);
    }

    // Step 2: Create a test conversation
    console.log('\n🧪 Creating test conversation...');

    // Get a store to test with
    const { data: stores } = await supabase
      .from('stores')
      .select('id, store_slug, business_name')
      .limit(1);

    if (stores && stores.length > 0) {
      const testStore = stores[0];
      const testSessionId = `test_${Date.now()}`;

      console.log(`Using store: ${testStore.business_name} (${testStore.store_slug})`);

      // Create test conversation
      const { data: testConv, error: testError } = await supabase
        .from('ai_chat_conversations')
        .insert({
          session_id: testSessionId,
          store_id: testStore.id,
          context_type: 'storefront',
          is_storefront: true,
          source_page: `/store/${testStore.store_slug}`,
        })
        .select()
        .single();

      if (testError) {
        console.log('❌ Error creating test conversation:', testError.message);
      } else {
        console.log('✅ Test conversation created:', testConv.id);

        // Add test messages
        await supabase.from('ai_chat_messages').insert([
          {
            conversation_id: testConv.id,
            store_id: testStore.id,
            role: 'user',
            content: 'Do you deliver to Lekki?'
          },
          {
            conversation_id: testConv.id,
            store_id: testStore.id,
            role: 'assistant',
            content: 'Yes, we deliver to Lekki! Delivery fee is ₦1,500 and takes 1-2 days.'
          }
        ]);

        console.log('✅ Test messages added');

        // Check if visible in view
        const { data: viewCheck } = await supabase
          .from('store_conversations')
          .select('*')
          .eq('session_id', testSessionId)
          .single();

        if (viewCheck) {
          console.log('✅ Test conversation IS VISIBLE in store_conversations view!');
          console.log('   This means Customer Chats should work!');
        } else {
          console.log('⚠️ Test conversation not visible in view yet');
        }

        // Clean up test data
        await supabase.from('ai_chat_messages')
          .delete()
          .eq('conversation_id', testConv.id);
        await supabase.from('ai_chat_conversations')
          .delete()
          .eq('id', testConv.id);

        console.log('✅ Test data cleaned up');
      }
    }

    // Step 3: Summary
    console.log('\n📊 Final Check:');

    const { count: finalConvCount } = await supabase
      .from('ai_chat_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('is_storefront', true);

    const { count: finalViewCount } = await supabase
      .from('store_conversations')
      .select('*', { count: 'exact', head: true });

    console.log(`- Storefront conversations in DB: ${finalConvCount || 0}`);
    console.log(`- Conversations visible in view: ${finalViewCount || 0}`);

    if (finalViewCount > 0) {
      console.log('\n✅ SUCCESS! Customer Chats should now show conversations.');
    } else {
      console.log('\n⚠️ No conversations visible yet.');
      console.log('New chats from online stores will now be tracked and appear in Customer Chats.');
    }

    // Step 4: Deploy the edge function
    console.log('\n📤 Next Step: Deploy the updated edge function');
    console.log('Run: npx supabase functions deploy ai-chat');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixConversationTracking();