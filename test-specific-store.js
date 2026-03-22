import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Testing chat tracking for store: paul-pahhggygggffffg\n');
console.log('=' .repeat(50));

async function testSpecificStore() {
  try {
    // Step 1: Check if the store exists
    const storeSlug = 'paul-pahhggygggffffg';
    console.log(`\n📋 Checking if store with slug "${storeSlug}" exists...`);

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('store_slug', storeSlug)
      .single();

    if (storeError || !store) {
      console.log(`❌ Store not found with slug: ${storeSlug}`);
      console.log('Error:', storeError?.message);

      // Check all stores to find the correct slug
      console.log('\n📋 Listing all available stores:');
      const { data: allStores } = await supabase
        .from('stores')
        .select('id, store_slug, business_name, user_id')
        .limit(10);

      if (allStores && allStores.length > 0) {
        allStores.forEach(s => {
          console.log(`  - ${s.business_name}: ${s.store_slug} (ID: ${s.id})`);
        });
      }
      return;
    }

    console.log(`✅ Store found!`);
    console.log(`   ID: ${store.id}`);
    console.log(`   Business Name: ${store.business_name}`);
    console.log(`   User ID: ${store.user_id}`);

    // Step 2: Test edge function with this specific store
    const testSessionId = `test_${storeSlug}_${Date.now()}`;
    console.log(`\n📤 Testing edge function with store slug: ${storeSlug}`);
    console.log(`   Session ID: ${testSessionId}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'Do you deliver?',
        contextType: 'storefront',
        storeSlug: storeSlug,
        sessionId: testSessionId,
        userType: 'visitor',
        storeInfo: {
          businessName: store.business_name,
        }
      }),
    });

    const result = await response.json();
    console.log('\n✅ Edge function responded');
    console.log('   Status:', response.status);

    if (result.trackingDebug) {
      console.log('\n📊 TRACKING DEBUG INFO:');
      console.log(JSON.stringify(result.trackingDebug, null, 2));

      if (!result.trackingDebug.success) {
        console.log('\n❌ Tracking failed:', result.trackingDebug.error);
      }
    }

    // Step 3: Check if conversation was saved
    console.log('\n⏳ Waiting 3 seconds for database writes...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`\n📋 Checking if conversation was saved...`);
    const { data: conversations, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', testSessionId);

    if (convError) {
      console.log('❌ Error checking conversations:', convError.message);
      return;
    }

    if (conversations && conversations.length > 0) {
      console.log(`✅ Conversation saved! Found ${conversations.length} record(s)`);
      const conv = conversations[0];
      console.log(`   ID: ${conv.id}`);
      console.log(`   Store ID: ${conv.store_id}`);
      console.log(`   Is Storefront: ${conv.is_storefront}`);
      console.log(`   Source Page: ${conv.source_page}`);

      // Check messages
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conv.id);

      console.log(`   Messages: ${messages?.length || 0}`);

      // Step 4: Check if it appears in store_conversations view
      console.log(`\n📋 Checking store_conversations view...`);
      const { data: storeConvs, error: viewError } = await supabase
        .from('store_conversations')
        .select('*')
        .eq('store_id', store.id);

      if (viewError) {
        console.log('❌ Error checking store_conversations:', viewError.message);
      } else if (storeConvs && storeConvs.length > 0) {
        console.log(`✅ Found ${storeConvs.length} conversation(s) in store view`);
        // Check if our test conversation is there
        const ourConv = storeConvs.find(c => c.session_id === testSessionId);
        if (ourConv) {
          console.log('✅ Our test conversation appears in the view!');
        } else {
          console.log('❌ Our test conversation NOT in the view');
          console.log('\nAll conversations in view:');
          storeConvs.forEach(c => {
            console.log(`  - Session: ${c.session_id}, Created: ${c.created_at}`);
          });
        }
      } else {
        console.log('❌ No conversations found in store_conversations view');
      }

      // Clean up test data
      console.log('\n🧹 Cleaning up test data...');
      await supabase.from('ai_chat_messages').delete().eq('conversation_id', conv.id);
      await supabase.from('ai_chat_conversations').delete().eq('id', conv.id);
      console.log('✅ Test data cleaned up');

    } else {
      console.log('❌ No conversation saved!');
      console.log('The edge function is not saving conversations.');
    }

    // Step 5: Check recent conversations for this store
    console.log(`\n📋 Checking recent conversations for store ${store.id}...`);
    const { data: recentConvs } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_storefront', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentConvs && recentConvs.length > 0) {
      console.log(`Found ${recentConvs.length} recent storefront conversation(s):`);
      recentConvs.forEach(c => {
        console.log(`  - Session: ${c.session_id}`);
        console.log(`    Created: ${c.created_at}`);
        console.log(`    Source: ${c.source_page}`);
      });
    } else {
      console.log('No recent storefront conversations found for this store');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSpecificStore();