import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🧪 FINAL TEST: Chat Tracking from Online Stores\n');
console.log('=' .repeat(50));

async function testChatTracking() {
  try {
    // Step 1: Get a store to test with
    console.log('\n📍 Step 1: Finding a store to test with...');
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, store_slug, business_name')
      .limit(1);

    if (storeError || !stores || stores.length === 0) {
      console.log('❌ No stores found');
      return;
    }

    const testStore = stores[0];
    console.log(`✅ Found store: ${testStore.business_name} (${testStore.store_slug})`);

    // Step 2: Generate unique sessionId
    const testSessionId = `final_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`\n📍 Step 2: Using session ID: ${testSessionId}`);

    // Step 3: Send a chat message WITH sessionId
    console.log('\n📍 Step 3: Sending chat message to edge function...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'What are your delivery options?',
        contextType: 'storefront',
        storeSlug: testStore.store_slug,
        sessionId: testSessionId,  // IMPORTANT: Sending sessionId
        userType: 'visitor',
        storeInfo: {
          businessName: testStore.business_name,
        }
      }),
    });

    const chatResponse = await response.json();
    console.log('✅ Chat response received');
    console.log('   Response preview:', chatResponse.response?.substring(0, 100) + '...');

    // Step 4: Wait for database writes
    console.log('\n⏳ Waiting 3 seconds for database writes...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Check if conversation was saved
    console.log('\n📍 Step 4: Checking if conversation was saved...');

    // Check ai_chat_conversations table
    const { data: savedConvs, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', testSessionId);

    const savedConv = savedConvs && savedConvs.length > 0 ? savedConvs[0] : null;

    if (savedConv) {
      console.log('✅ Conversation SAVED in ai_chat_conversations!');
      console.log('   Details:', {
        id: savedConv.id,
        store_id: savedConv.store_id,
        is_storefront: savedConv.is_storefront,
        context_type: savedConv.context_type,
      });

      // Check messages
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', savedConv.id);

      console.log(`   Messages saved: ${messages?.length || 0}`);
    } else {
      console.log('❌ NO conversation saved in ai_chat_conversations');
    }

    // Step 6: Check if visible in store_conversations view
    console.log('\n📍 Step 5: Checking if visible in Customer Chats view...');
    const { data: viewData, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .eq('session_id', testSessionId);

    if (viewData && viewData.length > 0) {
      console.log('✅ Conversation IS VISIBLE in store_conversations view!');
      console.log('   This will appear in the Customer Chats dashboard');
      console.log('   View data:', {
        store_name: viewData[0].store_name,
        message_count: viewData[0].message_count,
        last_message: viewData[0].last_message?.substring(0, 50) + '...',
      });
    } else {
      console.log('❌ Conversation NOT visible in store_conversations view');
      console.log('   This is why it doesn\'t appear in Customer Chats');
    }

    // Step 7: Clean up test data
    console.log('\n📍 Step 6: Cleaning up test data...');
    if (savedConv) {
      await supabase.from('ai_chat_messages').delete().eq('conversation_id', savedConv.id);
      await supabase.from('ai_chat_conversations').delete().eq('id', savedConv.id);
      console.log('✅ Test data cleaned up');
    }

    // SUMMARY
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('=' .repeat(50));

    if (savedConv && viewData && viewData.length > 0) {
      console.log('\n✅✅✅ SUCCESS! CHAT TRACKING IS WORKING! ✅✅✅');
      console.log('\nWhat this means:');
      console.log('1. Conversations from online stores ARE being saved');
      console.log('2. They ARE visible in the store_conversations view');
      console.log('3. They WILL appear in the Customer Chats dashboard');
      console.log('\n🎉 The fix is COMPLETE and WORKING!');
    } else {
      console.log('\n❌ CHAT TRACKING NOT FULLY WORKING');
      console.log('\nIssues found:');
      if (!savedConv) {
        console.log('- Conversations not being saved to database');
        console.log('  → Edge function may need redeployment');
      }
      if (savedConv && (!viewData || viewData.length === 0)) {
        console.log('- Conversations saved but not visible in view');
        console.log('  → Database view may need recreation');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testChatTracking();