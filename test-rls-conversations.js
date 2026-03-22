// Test RLS policies for conversations
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

async function testRLS() {
  console.log('🔍 Testing RLS policies for conversations\n');

  // Test 1: Service role (should work)
  console.log('📊 Test 1: Using Service Role (bypasses RLS)...');
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: serviceData, error: serviceError } = await serviceClient
    .from('ai_chat_conversations')
    .select('id, context_type')
    .eq('store_id', 'd93cd891-7e0a-47a8-9963-5e2a00a2591f')
    .limit(5);

  if (serviceError) {
    console.log('❌ Service role query failed:', serviceError.message);
  } else {
    console.log(`✅ Service role found ${serviceData?.length || 0} conversations`);
  }

  // Test 2: Anon client with auth (simulating frontend)
  console.log('\n📊 Test 2: Using Anon Key with Auth (simulating frontend)...');
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in as the user
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: 'ekhatorpaulosayi@gmail.com',
    password: 'Godisgood1.'
  });

  if (authError) {
    console.log('❌ Authentication failed:', authError.message);
    return;
  }

  console.log('✅ Authenticated as:', authData.user.email);
  console.log('   User ID:', authData.user.id);

  // Now try to fetch conversations (exactly as frontend does)

  // First get user's stores
  const { data: userStores, error: storeError } = await anonClient
    .from('stores')
    .select('id, business_name')
    .eq('user_id', authData.user.id);

  if (storeError) {
    console.log('❌ Failed to fetch stores:', storeError.message);
  } else if (!userStores || userStores.length === 0) {
    console.log('❌ No stores found for user');
  } else {
    console.log(`✅ Found ${userStores.length} store(s):`);
    userStores.forEach(s => console.log(`   - ${s.business_name} (${s.id})`));

    const storeIds = userStores.map(s => s.id);

    // Try to fetch conversations
    const { data: convData, error: convError } = await anonClient
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
      console.log('\n❌ Failed to fetch conversations:', convError.message);
      console.log('   This is likely an RLS policy issue!');

      // Try without the join to isolate the problem
      console.log('\n🔍 Trying without message join...');
      const { data: simpleData, error: simpleError } = await anonClient
        .from('ai_chat_conversations')
        .select('id, context_type, store_id')
        .in('store_id', storeIds)
        .limit(5);

      if (simpleError) {
        console.log('❌ Simple query also failed:', simpleError.message);
        console.log('   RLS policy is blocking conversation access!');
      } else if (simpleData) {
        console.log(`✅ Simple query worked, found ${simpleData.length} conversations`);
        console.log('   Issue is with the message join or messages RLS');
      }
    } else {
      console.log(`\n✅ Successfully fetched ${convData?.length || 0} conversations`);
      if (convData && convData.length > 0) {
        convData.forEach((c, i) => {
          console.log(`   ${i + 1}. Context: ${c.context_type}, Messages: ${c.ai_chat_messages?.length || 0}`);
        });
      }
    }
  }

  // Test 3: Check RLS policies directly
  console.log('\n📊 Test 3: Checking RLS policy configuration...');
  const { data: policies, error: policyError } = await serviceClient
    .from('pg_policies')
    .select('*')
    .or('tablename.eq.ai_chat_conversations,tablename.eq.ai_chat_messages');

  if (!policyError && policies) {
    console.log('✅ Found RLS policies:');
    const convPolicies = policies.filter(p => p.tablename === 'ai_chat_conversations');
    const msgPolicies = policies.filter(p => p.tablename === 'ai_chat_messages');

    console.log(`   - ai_chat_conversations: ${convPolicies.length} policies`);
    convPolicies.forEach(p => {
      console.log(`     • ${p.policyname} (${p.cmd})`);
    });

    console.log(`   - ai_chat_messages: ${msgPolicies.length} policies`);
    msgPolicies.forEach(p => {
      console.log(`     • ${p.policyname} (${p.cmd})`);
    });

    if (convPolicies.length === 0) {
      console.log('\n⚠️ No RLS policies for ai_chat_conversations!');
      console.log('   This means only service role can access the table');
    }
  }
}

// Run the test
testRLS().catch(console.error);