import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🧪 COMPREHENSIVE CHAT TRACKING TEST\n');
console.log('=' .repeat(50));

async function testChatTracking() {
  try {
    // Step 1: Get a store to test with
    console.log('\n📍 Step 1: Finding a store to test with...');
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, store_slug, business_name, user_id')
      .limit(1);

    if (storeError || !stores || stores.length === 0) {
      console.log('❌ No stores found in database');
      return;
    }

    const testStore = stores[0];
    console.log(`✅ Found store: ${testStore.business_name} (${testStore.store_slug})`);
    console.log(`   Store ID: ${testStore.id}`);

    // Step 2: Generate a unique session ID for testing
    const testSessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log(`\n📍 Step 2: Using test session ID: ${testSessionId}`);

    // Step 3: Send a test chat message
    console.log('\n📍 Step 3: Sending test chat message to edge function...');

    const testMessage = 'Hello, I need help with products';

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: testMessage,
        contextType: 'storefront',
        storeSlug: testStore.store_slug,
        sessionId: testSessionId,
        userType: 'visitor',
        storeInfo: {
          businessName: testStore.business_name,
        }
      }),
    });

    const chatResponse = await response.json();
    console.log('✅ Chat response received:', {
      status: response.status,
      hasResponse: !!chatResponse.response,
      responseLength: chatResponse.response?.length || 0,
      response: chatResponse.response?.substring(0, 100),
      error: chatResponse.error
    });

    // Check for any error in the response
    if (chatResponse.error) {
      console.log('⚠️ Edge function returned an error:', chatResponse.error);
    }

    // Wait a moment for database writes
    console.log('\n⏳ Waiting 2 seconds for database writes...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Check if conversation was saved
    console.log('\n📍 Step 4: Checking if conversation was saved...');
    const { data: savedConvs, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', testSessionId);

    const savedConv = savedConvs && savedConvs.length > 0 ? savedConvs[0] : null;

    if (convError) {
      console.log('❌ Error checking conversations:', convError.message);
    } else if (!savedConv) {
      console.log(`❌ NO conversation saved! Found ${savedConvs?.length || 0} conversations with this session_id`);
    } else if (savedConv) {
      console.log('✅ Conversation SAVED successfully!');
      console.log('   Details:', {
        id: savedConv.id,
        store_id: savedConv.store_id,
        context_type: savedConv.context_type,
        is_storefront: savedConv.is_storefront,
        session_id: savedConv.session_id,
        source_page: savedConv.source_page
      });

      // Check if store_id matches
      if (savedConv.store_id === testStore.id) {
        console.log('   ✅ store_id matches correctly!');
      } else {
        console.log(`   ❌ store_id mismatch! Expected: ${testStore.id}, Got: ${savedConv.store_id}`);
      }

      // Check if marked as storefront
      if (savedConv.is_storefront === true) {
        console.log('   ✅ is_storefront = true');
      } else {
        console.log(`   ❌ is_storefront = ${savedConv.is_storefront} (should be true)`);
      }

      // Step 5: Check if messages were saved
      console.log('\n📍 Step 5: Checking if messages were saved...');
      const { data: messages, error: msgError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', savedConv.id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.log('❌ Error fetching messages:', msgError.message);
      } else {
        console.log(`✅ Found ${messages?.length || 0} messages`);
        messages?.forEach((msg, i) => {
          console.log(`   Message ${i + 1}: ${msg.role} - ${msg.content?.substring(0, 50)}...`);
          console.log(`   Has store_id: ${msg.store_id ? 'Yes' : 'No'}`);
        });
      }
    }

    // Step 6: Check if visible in store_conversations view
    console.log('\n📍 Step 6: Checking store_conversations view...');
    const { data: viewData, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .eq('session_id', testSessionId);

    if (viewError) {
      console.log('❌ Error checking view:', viewError.message);
    } else if (viewData && viewData.length > 0) {
      console.log('✅ Conversation IS VISIBLE in store_conversations view!');
      console.log('   This should appear in Customer Chats page');
    } else {
      console.log('❌ Conversation NOT visible in store_conversations view');
      console.log('   This is why it doesn\'t appear in Customer Chats');
    }

    // Step 7: Clean up test data
    console.log('\n📍 Step 7: Cleaning up test data...');
    if (savedConv) {
      // Delete messages first
      await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('conversation_id', savedConv.id);

      // Then delete conversation
      await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', savedConv.id);

      console.log('✅ Test data cleaned up');
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('=' .repeat(50));

    if (savedConv && savedConv.store_id && savedConv.is_storefront) {
      console.log('✅ TRACKING IS WORKING! Conversations are being saved correctly.');
      console.log('\nIf you still don\'t see them in Customer Chats, the issue might be:');
      console.log('1. The view needs to be refreshed');
      console.log('2. There\'s a permission issue');
      console.log('3. The frontend is filtering them out somehow');
    } else {
      console.log('❌ TRACKING IS NOT WORKING PROPERLY');
      console.log('\nThe edge function is not saving conversations correctly.');
      console.log('This needs to be fixed in the edge function code.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

testChatTracking();