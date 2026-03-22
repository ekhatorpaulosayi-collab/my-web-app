import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Checking stores and testing chat tracking...\n');

async function checkAndTest() {
  try {
    // Step 1: Check all stores with slugs
    console.log('📋 Stores in database:');
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, business_name, store_slug')
      .not('store_slug', 'is', null)
      .limit(5);

    if (error || !stores || stores.length === 0) {
      console.log('❌ No stores with slugs found');
      return;
    }

    stores.forEach(store => {
      console.log(`   - ${store.business_name}: ${store.store_slug} (ID: ${store.id})`);
    });

    // Use the first store for testing
    const testStore = stores[0];
    console.log(`\n🧪 Testing with store: ${testStore.business_name} (${testStore.store_slug})`);

    // Generate unique sessionId
    const testSessionId = `debug_${Date.now()}`;
    console.log(`Session ID: ${testSessionId}`);

    // Step 2: Test the edge function
    console.log('\n📤 Sending test message to edge function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'Do you have this in stock?',
        contextType: 'storefront',
        storeSlug: testStore.store_slug,
        sessionId: testSessionId,
        userType: 'visitor',
        storeInfo: {
          businessName: testStore.business_name,
        }
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response preview:', result.response?.substring(0, 100) + '...');

    // Step 3: Wait and check database
    console.log('\n⏳ Waiting 5 seconds for database writes...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if conversation was saved
    console.log('\n🔍 Checking database for conversation...');

    // Check raw table
    const { data: conv, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', testSessionId)
      .single();

    if (conv) {
      console.log('✅ CONVERSATION FOUND!');
      console.log('   Conversation ID:', conv.id);
      console.log('   Store ID:', conv.store_id);
      console.log('   Is Storefront:', conv.is_storefront);
      console.log('   Context Type:', conv.context_type);

      // Check messages
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conv.id);

      console.log(`   Messages: ${messages?.length || 0}`);

      // Check view
      const { data: viewData } = await supabase
        .from('store_conversations')
        .select('*')
        .eq('session_id', testSessionId)
        .single();

      if (viewData) {
        console.log('\n✅ VISIBLE IN CUSTOMER CHATS VIEW!');
      } else {
        console.log('\n❌ Not visible in view yet');
      }

      // Clean up
      await supabase.from('ai_chat_messages').delete().eq('conversation_id', conv.id);
      await supabase.from('ai_chat_conversations').delete().eq('id', conv.id);
      console.log('\n🧹 Test data cleaned up');

    } else {
      console.log('❌ No conversation found');
      console.log('   Error:', convError?.message);

      // Debug: Check if store exists with this slug
      const { data: storeCheck } = await supabase
        .from('stores')
        .select('id')
        .eq('store_slug', testStore.store_slug)
        .single();

      if (storeCheck) {
        console.log(`   Store exists with slug: ${testStore.store_slug}`);
      } else {
        console.log(`   ❌ Store NOT found with slug: ${testStore.store_slug}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndTest();