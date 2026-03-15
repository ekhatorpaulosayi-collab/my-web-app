import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkQuotaSystem() {
  console.log('🔍 Checking AI Chat Quota System...\n');

  // 1. Check if tables exist
  console.log('📊 Checking for quota-related tables...');

  const { data: tables, error: tablesError } = await supabase
    .from('ai_chat_conversations')
    .select('id')
    .limit(1);

  if (tablesError) {
    console.log('❌ ai_chat_conversations table not found:', tablesError.message);
  } else {
    console.log('✅ ai_chat_conversations table exists');
  }

  const { data: messages, error: messagesError } = await supabase
    .from('ai_chat_messages')
    .select('id')
    .limit(1);

  if (messagesError) {
    console.log('❌ ai_chat_messages table not found:', messagesError.message);
  } else {
    console.log('✅ ai_chat_messages table exists');
  }

  // 2. Check subscription tiers for AI chat limits
  console.log('\n📋 Checking subscription tiers for AI chat limits...');

  const { data: tiers, error: tiersError } = await supabase
    .from('subscription_tiers')
    .select('name, max_ai_chats_monthly')
    .order('display_order');

  if (tiersError) {
    console.log('❌ Could not fetch subscription tiers:', tiersError.message);
  } else if (tiers) {
    console.log('✅ Subscription tiers with AI chat limits:');
    tiers.forEach(tier => {
      const limit = tier.max_ai_chats_monthly === -1 ? 'UNLIMITED' : tier.max_ai_chats_monthly;
      console.log(`   - ${tier.name}: ${limit} chats/month`);
    });
  }

  // 3. Check if check_chat_quota function exists
  console.log('\n🔧 Checking for check_chat_quota function...');

  // Try to call the function with a dummy UUID
  const testUserId = '00000000-0000-0000-0000-000000000000';

  const { data: quotaCheck, error: quotaError } = await supabase
    .rpc('check_chat_quota', {
      p_user_id: testUserId,
      p_context_type: 'help'
    });

  if (quotaError) {
    if (quotaError.message.includes('does not exist')) {
      console.log('❌ check_chat_quota function NOT FOUND - quota system not deployed!');
    } else {
      console.log('✅ check_chat_quota function exists (test call returned expected error)');
    }
  } else {
    console.log('✅ check_chat_quota function exists and executed');
  }

  // 4. Check recent AI chat messages to see if quotas are being tracked
  console.log('\n📈 Checking recent AI chat activity...');

  const { data: recentChats, error: recentError } = await supabase
    .from('ai_chat_messages')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.log('❌ Could not fetch recent chats:', recentError.message);
  } else if (recentChats && recentChats.length > 0) {
    console.log(`✅ Found ${recentChats.length} recent AI chat messages`);
    const latest = new Date(recentChats[0].created_at);
    console.log(`   Latest chat: ${latest.toLocaleString()}`);
  } else {
    console.log('⚠️  No AI chat messages found - system might not be in use yet');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 QUOTA SYSTEM STATUS SUMMARY:');
  console.log('='.repeat(50));

  if (!tablesError && !messagesError && !quotaError && tiers) {
    console.log('✅ QUOTA SYSTEM IS DEPLOYED AND ACTIVE!');
    console.log('\nLimits per tier:');
    tiers.forEach(tier => {
      const limit = tier.max_ai_chats_monthly === -1 ? 'UNLIMITED' : `${tier.max_ai_chats_monthly} chats/month`;
      console.log(`   ${tier.name}: ${limit}`);
    });
  } else {
    console.log('⚠️  QUOTA SYSTEM PARTIALLY DEPLOYED');
    console.log('\nMissing components:');
    if (tablesError) console.log('   - ai_chat_conversations table');
    if (messagesError) console.log('   - ai_chat_messages table');
    if (quotaError?.message.includes('does not exist')) console.log('   - check_chat_quota function');
  }
}

checkQuotaSystem().catch(console.error);