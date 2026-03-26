#!/usr/bin/env node

/**
 * Test Script for Chat Takeover & WhatsApp Fallback
 * Run with: node test-chat-takeover.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY
);

async function setupTestData() {
  console.log('🚀 Setting up test data for chat takeover...\n');

  try {
    // 1. Get or create test store
    console.log('1. Setting up test store...');
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (storeError) throw storeError;

    const testStore = stores[0];
    if (!testStore) {
      console.error('❌ No store found. Please create a store first.');
      return;
    }

    console.log(`✅ Using store: ${testStore.name} (${testStore.id})`);

    // 2. Update store with test WhatsApp settings
    console.log('\n2. Configuring WhatsApp fallback settings...');
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        whatsapp_number: '+2348012345678', // Test Nigerian number
        wa_fallback_minutes: 1 // 1 minute for quick testing
      })
      .eq('id', testStore.id);

    if (updateError) throw updateError;
    console.log('✅ WhatsApp settings configured');

    // 3. Create test conversation
    console.log('\n3. Creating test conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('ai_chat_conversations')
      .insert({
        store_id: testStore.id,
        customer_email: 'test@example.com',
        takeover_status: 'ai',
        is_agent_active: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) throw convError;
    console.log(`✅ Test conversation created: ${conversation.id}`);

    // 4. Add test messages
    console.log('\n4. Adding test messages...');
    const messages = [
      {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Hello, I need help with a product',
        created_at: new Date(Date.now() - 60000).toISOString()
      },
      {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Hello! I\'d be happy to help you. What product are you interested in?',
        created_at: new Date(Date.now() - 30000).toISOString()
      },
      {
        conversation_id: conversation.id,
        role: 'user',
        content: 'I want to speak to a human please',
        created_at: new Date().toISOString()
      }
    ];

    const { error: msgError } = await supabase
      .from('ai_chat_messages')
      .insert(messages);

    if (msgError) throw msgError;
    console.log('✅ Test messages added');

    // 5. Provide test instructions
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n🧪 Testing Instructions:\n');
    console.log('1. CUSTOMER SIDE:');
    console.log(`   - Open: https://your-domain.vercel.app/${testStore.slug || testStore.id}`);
    console.log('   - Click the chat widget');
    console.log('   - Type: "I need human help"\n');

    console.log('2. DASHBOARD SIDE:');
    console.log('   - Open: https://your-domain.vercel.app/dashboard');
    console.log('   - Go to Conversations');
    console.log(`   - Find conversation ID: ${conversation.id}`);
    console.log('   - Click "Take Over"\n');

    console.log('3. VERIFY:');
    console.log('   - Only ONE "agent joined" message appears');
    console.log('   - Timer starts when status = "requested"');
    console.log('   - Timer stops when agent takes over');
    console.log('   - After 1 minute, WhatsApp option appears\n');

    console.log('4. TEST SCENARIOS:');
    console.log('   a. Let timer expire → Check WhatsApp modal');
    console.log('   b. Take over before timer → Timer should stop');
    console.log('   c. Remove WhatsApp number → Only "Keep Waiting" shows');

    console.log('\n📊 Monitor in Supabase:');
    console.log(`   SELECT * FROM ai_chat_conversations WHERE id = '${conversation.id}';`);
    console.log(`   SELECT * FROM ai_chat_messages WHERE conversation_id = '${conversation.id}' ORDER BY created_at;`);

    console.log('\n🔍 Debug in Browser Console:');
    console.log(`   localStorage.setItem('test_conversation_id', '${conversation.id}');`);
    console.log(`   localStorage.setItem('test_store_id', '${testStore.id}');`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the setup
setupTestData();