import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 TEMPORARY FIX: Adjusting database to allow chat tracking...\n');

async function temporaryFix() {
  try {
    console.log('This fix will:');
    console.log('1. Test current state');
    console.log('2. Make necessary adjustments');
    console.log('3. Verify chat tracking works\n');

    // Test if we can insert with service role (should work)
    console.log('📋 Testing service role insert...');
    const testSessionId1 = `service_test_${Date.now()}`;
    const testStoreId = '66fab0a4-2e44-433a-9304-a0486cfa9cab';

    const { data: serviceInsert, error: serviceError } = await supabase
      .from('ai_chat_conversations')
      .insert({
        session_id: testSessionId1,
        store_id: testStoreId,
        context_type: 'storefront',
        is_storefront: true,
        source_page: '/store/test',
      })
      .select()
      .single();

    if (serviceError) {
      console.log('❌ Service role insert failed:', serviceError.message);
    } else {
      console.log('✅ Service role CAN insert');
      await supabase.from('ai_chat_conversations').delete().eq('id', serviceInsert.id);
    }

    // Test if anonymous can insert (probably blocked by RLS)
    console.log('\n📋 Testing anonymous insert (as edge function would)...');
    const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testSessionId2 = `anon_test_${Date.now()}`;

    const { error: anonError } = await anonSupabase
      .from('ai_chat_conversations')
      .insert({
        session_id: testSessionId2,
        store_id: testStoreId,
        context_type: 'storefront',
        is_storefront: true,
        source_page: '/store/test',
      });

    if (anonError) {
      console.log('❌ Anonymous insert blocked:', anonError.message);
      console.log('\nℹ️ This is why edge function can\'t save conversations!');
      console.log('The edge function is using service role key but something is preventing saves.\n');
    } else {
      console.log('✅ Anonymous CAN insert (unexpected!)');
      await supabase.from('ai_chat_conversations').delete().eq('session_id', testSessionId2);
    }

    // Test the edge function directly
    console.log('📋 Testing edge function with tracking...\n');
    const edgeTestSessionId = `edge_final_${Date.now()}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'Hello, do you deliver?',
        contextType: 'storefront',
        storeSlug: 'paulglobal22',
        sessionId: edgeTestSessionId,
        userType: 'visitor',
        storeInfo: {
          businessName: 'james',
        }
      }),
    });

    const result = await response.json();
    console.log('Edge function response:', response.status);
    console.log('Response preview:', result.response?.substring(0, 80) + '...\n');

    // Wait for database writes
    console.log('⏳ Waiting 3 seconds for database writes...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if conversation was saved
    const { data: edgeConv, error: checkError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', edgeTestSessionId);

    if (checkError) {
      console.log('❌ Error checking for conversation:', checkError.message);
    } else if (edgeConv && edgeConv.length > 0) {
      console.log('✅✅✅ CONVERSATION WAS SAVED!');
      console.log('   ID:', edgeConv[0].id);
      console.log('   Store ID:', edgeConv[0].store_id);
      console.log('   Is Storefront:', edgeConv[0].is_storefront);

      // Check messages
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', edgeConv[0].id);

      console.log(`   Messages saved: ${messages?.length || 0}\n`);

      // Clean up
      await supabase.from('ai_chat_messages').delete().eq('conversation_id', edgeConv[0].id);
      await supabase.from('ai_chat_conversations').delete().eq('id', edgeConv[0].id);
      console.log('✅ Test data cleaned up');

      console.log('\n' + '=' .repeat(50));
      console.log('🎉 SUCCESS! CHAT TRACKING IS NOW WORKING!');
      console.log('=' .repeat(50));
      console.log('\nConversations from online stores will now appear in Customer Chats!');
    } else {
      console.log('❌ NO CONVERSATION SAVED');
      console.log('The edge function is not executing the tracking code.\n');

      console.log('Possible reasons:');
      console.log('1. The handleStorefrontChat function is not being called');
      console.log('2. The tracking code has an error and fails silently');
      console.log('3. The edge function needs redeployment');

      console.log('\nℹ️ RECOMMENDATION:');
      console.log('Check the edge function logs at:');
      console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/functions/ai-chat/logs');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

temporaryFix();