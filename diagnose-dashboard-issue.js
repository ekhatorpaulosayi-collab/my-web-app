import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 DIAGNOSING DASHBOARD CONVERSATION ISSUE\n');
console.log('=' .repeat(60));
console.log('Store URL: https://www.storehouse.ng/store/johnaccessories');
console.log('=' .repeat(60));

async function diagnoseIssue() {
  try {
    const storeSlug = 'johnaccessories';

    // Step 1: Find the store and its owner
    console.log('\n📋 STEP 1: Finding store and owner...');

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('store_slug', storeSlug)
      .single();

    if (storeError || !store) {
      console.log('❌ Store not found!');
      return;
    }

    console.log('✅ Store found:');
    console.log(`   Business Name: ${store.business_name}`);
    console.log(`   Store ID: ${store.id}`);
    console.log(`   User ID (Owner): ${store.user_id}`);

    // Step 2: Get user details
    console.log('\n📋 STEP 2: Getting owner details...');

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', store.user_id)
      .single();

    if (user) {
      console.log('✅ Owner found:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Created: ${user.created_at}`);
    } else {
      console.log('❌ Owner not found in users table');
    }

    // Step 3: Check conversations in the database
    console.log('\n📋 STEP 3: Checking conversations in database...');

    const { data: dbConversations, error: dbError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_storefront', true)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.log('❌ Error fetching conversations:', dbError.message);
    } else {
      console.log(`✅ Found ${dbConversations?.length || 0} conversation(s) in ai_chat_conversations`);

      if (dbConversations && dbConversations.length > 0) {
        dbConversations.forEach((conv, idx) => {
          console.log(`\n   Conversation ${idx + 1}:`);
          console.log(`     ID: ${conv.id}`);
          console.log(`     Session: ${conv.session_id}`);
          console.log(`     Created: ${conv.created_at}`);
          console.log(`     Source: ${conv.source_page}`);
        });
      }
    }

    // Step 4: Check the store_conversations view
    console.log('\n📋 STEP 4: Checking store_conversations view...');

    const { data: viewConversations, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .eq('store_id', store.id)
      .order('last_message_at', { ascending: false });

    if (viewError) {
      console.log('❌ Error fetching from view:', viewError.message);

      if (viewError.code === '42P01') {
        console.log('\n⚠️ The store_conversations view does not exist!');
        console.log('This is why conversations are not showing in the dashboard.');
      }
    } else {
      console.log(`✅ Found ${viewConversations?.length || 0} conversation(s) in store_conversations view`);

      if (viewConversations && viewConversations.length > 0) {
        viewConversations.forEach((conv, idx) => {
          console.log(`\n   View Conversation ${idx + 1}:`);
          console.log(`     Session: ${conv.session_id}`);
          console.log(`     Messages: ${conv.message_count}`);
          console.log(`     Status: ${conv.status}`);
          console.log(`     Last Message: ${conv.last_message_at}`);
        });
      }
    }

    // Step 5: Simulate exactly what the frontend does
    console.log('\n📋 STEP 5: Simulating frontend query...');
    console.log(`   (As if logged in as user: ${store.user_id})`);

    // This is EXACTLY what ConversationsViewerSafe.tsx does
    const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // First get store for user
    const { data: frontendStore, error: fsError } = await anonSupabase
      .from('stores')
      .select('id')
      .eq('user_id', store.user_id)
      .single();

    if (fsError || !frontendStore) {
      console.log('❌ Frontend would not find store for user');
      console.log('   Error:', fsError?.message);
    } else {
      console.log('✅ Frontend found store ID:', frontendStore.id);

      // Then fetch conversations
      const { data: frontendConvs, error: fcError } = await anonSupabase
        .from('store_conversations')
        .select('*')
        .eq('store_id', frontendStore.id)
        .order('last_message_at', { ascending: false });

      if (fcError) {
        console.log('❌ Frontend query failed:', fcError.message);

        if (fcError.code === '42P01') {
          console.log('\n🔧 SOLUTION: The store_conversations view is missing!');
        }
      } else {
        console.log(`✅ Frontend would see ${frontendConvs?.length || 0} conversation(s)`);

        if (frontendConvs && frontendConvs.length === 0) {
          console.log('\n⚠️ Frontend sees 0 conversations even though they exist!');
          console.log('   Possible causes:');
          console.log('   1. RLS policies blocking access');
          console.log('   2. View definition is incorrect');
          console.log('   3. Data not properly linked');
        }
      }
    }

    // Step 6: Check RLS policies
    console.log('\n📋 STEP 6: Checking RLS policies...');

    // Test if anonymous user can read from store_conversations
    const { data: rlsTest, error: rlsError } = await anonSupabase
      .from('store_conversations')
      .select('id')
      .limit(1);

    if (rlsError) {
      if (rlsError.message.includes('row-level security')) {
        console.log('❌ RLS is blocking anonymous access to store_conversations');
        console.log('   This would prevent the frontend from seeing conversations');
      } else {
        console.log('❌ Error testing RLS:', rlsError.message);
      }
    } else {
      console.log('✅ Anonymous users can read from store_conversations');
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(60));

    if (viewError?.code === '42P01') {
      console.log('\n❌ MAIN ISSUE: The store_conversations view does not exist!');
      console.log('\n🔧 TO FIX: Create the view in Supabase SQL Editor:');
      console.log('\n```sql');
      console.log(`CREATE OR REPLACE VIEW store_conversations AS
SELECT
  c.id,
  c.session_id,
  c.store_id,
  c.user_id,
  c.context_type,
  c.is_storefront,
  c.source_page,
  c.visitor_name,
  c.visitor_email,
  c.visitor_phone,
  c.created_at,
  c.updated_at,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at,
  CASE
    WHEN MAX(m.created_at) > NOW() - INTERVAL '1 hour' THEN 'active'
    WHEN MAX(m.created_at) > NOW() - INTERVAL '24 hours' THEN 'recent'
    ELSE 'inactive'
  END as status
FROM ai_chat_conversations c
LEFT JOIN ai_chat_messages m ON m.conversation_id = c.id
WHERE c.is_storefront = true
GROUP BY
  c.id, c.session_id, c.store_id, c.user_id,
  c.context_type, c.is_storefront, c.source_page,
  c.visitor_name, c.visitor_email, c.visitor_phone,
  c.created_at, c.updated_at;`);
      console.log('```');
    } else if (viewConversations && viewConversations.length > 0) {
      console.log('\n✅ Conversations exist and are visible in the view');
      console.log('✅ The backend is working correctly');
      console.log('\n📝 TO SEE CONVERSATIONS:');
      console.log(`1. Make sure you're logged in with: ${user?.email}`);
      console.log('2. Go to Customer Conversations page');
      console.log('3. Refresh the page (Ctrl+F5 for hard refresh)');
    } else {
      console.log('\n⚠️ No conversations found for this store');
      console.log('Try sending a new chat message on the storefront');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

diagnoseIssue();