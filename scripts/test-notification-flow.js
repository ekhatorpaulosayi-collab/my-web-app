#!/usr/bin/env node

/**
 * Test Script for Owner Notification Flow
 *
 * This script helps verify the complete notification chain is working:
 * 1. Database update when "Talk to Store Owner" is clicked
 * 2. Owner notification polling finds waiting conversations
 * 3. Dashboard shows waiting customer banner
 * 4. Sound notification triggers
 *
 * Usage: node scripts/test-notification-flow.js <conversation_id>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNotificationFlow(conversationId) {
  console.log('\n========================================');
  console.log('🔍 OWNER NOTIFICATION FLOW TEST');
  console.log('========================================\n');

  try {
    // Step 1: Check conversation state
    console.log('📋 Step 1: Checking conversation state...');
    const { data: conversation, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('id', conversationId || '')
      .single();

    if (convError || !conversation) {
      console.error('❌ Conversation not found:', conversationId);
      if (!conversationId) {
        console.log('\n💡 TIP: Provide a conversation ID as argument');
        console.log('   Usage: node scripts/test-notification-flow.js <conversation_id>\n');

        // List recent conversations
        const { data: recentConvs } = await supabase
          .from('ai_chat_conversations')
          .select('id, visitor_name, updated_at, store_id')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (recentConvs?.length > 0) {
          console.log('📋 Recent conversations:');
          recentConvs.forEach(c => {
            console.log(`   - ${c.id}: ${c.visitor_name || 'Unknown'} (${c.updated_at})`);
          });
        }
      }
      return;
    }

    console.log('✅ Found conversation:', conversation.id);
    console.log('   - Visitor:', conversation.visitor_name || 'Unknown');
    console.log('   - Store ID:', conversation.store_id);
    console.log('   - Takeover status:', conversation.takeover_status || 'none');
    console.log('   - Is agent active:', conversation.is_agent_active);
    console.log('   - Waiting since:', conversation.waiting_for_owner_since || 'NOT SET');

    // Step 2: Check if waiting for owner
    console.log('\n📋 Step 2: Checking waiting status...');
    if (conversation.waiting_for_owner_since && !conversation.is_agent_active) {
      console.log('✅ Conversation IS waiting for owner!');
      console.log('   - Waiting since:', new Date(conversation.waiting_for_owner_since).toLocaleString());

      const waitingMs = Date.now() - new Date(conversation.waiting_for_owner_since).getTime();
      const waitingMins = Math.floor(waitingMs / 60000);
      const waitingSecs = Math.floor((waitingMs % 60000) / 1000);
      console.log(`   - Time waiting: ${waitingMins}m ${waitingSecs}s`);
    } else {
      console.log('⚠️ Conversation NOT waiting for owner');
      console.log('   - waiting_for_owner_since:', conversation.waiting_for_owner_since || 'null');
      console.log('   - is_agent_active:', conversation.is_agent_active);
      console.log('\n💡 To test, click "Talk to Store Owner" button in the chat widget');
    }

    // Step 3: Check store configuration
    console.log('\n📋 Step 3: Checking store configuration...');
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', conversation.store_id)
      .single();

    if (store) {
      console.log('✅ Found store:', store.name || store.id);
      console.log('   - Owner ID:', store.user_id);
      console.log('   - WhatsApp:', store.whatsapp_number || 'Not configured');
      console.log('   - Fallback mins:', store.wa_fallback_minutes || 5);
    } else {
      console.log('⚠️ Store not found for ID:', conversation.store_id);
    }

    // Step 4: Simulate owner notification query
    console.log('\n📋 Step 4: Simulating owner notification query...');
    const userId = store?.user_id || conversation.store_id;

    // Get user's stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId);

    const storeIds = stores?.map(s => s.id) || [userId];
    console.log('   - Checking stores:', storeIds.join(', '));

    // Query waiting conversations
    const { data: waitingConvs, error: waitingError } = await supabase
      .from('ai_chat_conversations')
      .select(`
        id,
        store_id,
        visitor_name,
        takeover_status,
        waiting_for_owner_since,
        updated_at
      `)
      .in('store_id', storeIds)
      .not('waiting_for_owner_since', 'is', null)
      .eq('is_agent_active', false)
      .order('waiting_for_owner_since', { ascending: true });

    if (waitingError) {
      console.error('❌ Query error:', waitingError);
    } else if (waitingConvs?.length > 0) {
      console.log(`✅ Found ${waitingConvs.length} waiting conversation(s):`);
      waitingConvs.forEach(wc => {
        const waitingMs = Date.now() - new Date(wc.waiting_for_owner_since).getTime();
        const waitingMins = Math.floor(waitingMs / 60000);
        console.log(`   - ${wc.visitor_name || 'Unknown'}: waiting ${waitingMins} minutes`);
      });
    } else {
      console.log('⚠️ No waiting conversations found');
      console.log('   Check that waiting_for_owner_since is set and is_agent_active is false');
    }

    // Step 5: Check recent messages
    console.log('\n📋 Step 5: Checking recent messages...');
    const { data: messages } = await supabase
      .from('ai_chat_messages')
      .select('role, content, created_at, is_agent_message')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messages?.length > 0) {
      console.log(`✅ Found ${messages.length} recent messages:`);
      messages.reverse().forEach(m => {
        const role = m.is_agent_message ? 'AGENT' : m.role.toUpperCase();
        const preview = m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '');
        console.log(`   [${role}]: ${preview}`);
      });
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');

    const isWaiting = conversation.waiting_for_owner_since && !conversation.is_agent_active;
    if (isWaiting) {
      console.log('✅ Notification flow should be ACTIVE');
      console.log('   - Customer clicked "Talk to Store Owner"');
      console.log('   - waiting_for_owner_since is set');
      console.log('   - is_agent_active is false');
      console.log('   - Dashboard should show red banner');
      console.log('   - Sound should play every 15 seconds');
    } else {
      console.log('⚠️ Notification flow is INACTIVE');
      console.log('   - Customer needs to click "Talk to Store Owner" button');
      console.log('   - OR agent has already taken over');
    }

    console.log('\n💡 Debug logs are enabled in production');
    console.log('   Check browser console for:');
    console.log('   - 🔍 [DEBUG-*] messages from ownerNotificationService');
    console.log('   - 🔔 Notification trigger logs');
    console.log('   - 🔊 Sound playback logs\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Parse command line arguments
const conversationId = process.argv[2];
checkNotificationFlow(conversationId);