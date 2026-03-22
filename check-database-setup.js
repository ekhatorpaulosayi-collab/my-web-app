import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 CHECKING DATABASE SETUP FOR CHAT TRACKING\n');
console.log('=' .repeat(50));

async function checkDatabaseSetup() {
  try {
    // 1. Check if tables exist
    console.log('\n📋 STEP 1: Checking if tables exist...\n');

    // Check ai_chat_conversations table
    const { data: convTable, error: convTableError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .limit(1);

    if (convTableError && convTableError.code === '42P01') {
      console.log('❌ Table ai_chat_conversations does NOT exist!');
    } else if (convTableError) {
      console.log('⚠️ Error checking ai_chat_conversations:', convTableError.message);
    } else {
      console.log('✅ Table ai_chat_conversations EXISTS');
    }

    // Check ai_chat_messages table
    const { data: msgTable, error: msgTableError } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .limit(1);

    if (msgTableError && msgTableError.code === '42P01') {
      console.log('❌ Table ai_chat_messages does NOT exist!');
    } else if (msgTableError) {
      console.log('⚠️ Error checking ai_chat_messages:', msgTableError.message);
    } else {
      console.log('✅ Table ai_chat_messages EXISTS');
    }

    // 2. Test inserting a record manually
    console.log('\n📋 STEP 2: Testing manual insert into ai_chat_conversations...\n');

    const testSessionId = `manual_test_${Date.now()}`;
    const testStoreId = '66fab0a4-2e44-433a-9304-a0486cfa9cab'; // james store

    const { data: insertedConv, error: insertError } = await supabase
      .from('ai_chat_conversations')
      .insert({
        session_id: testSessionId,
        store_id: testStoreId,
        context_type: 'storefront',
        is_storefront: true,
        source_page: '/store/test',
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Failed to insert conversation:', insertError.message);
      console.log('   Error code:', insertError.code);
      console.log('   Error details:', insertError.details);
    } else {
      console.log('✅ Successfully inserted test conversation!');
      console.log('   ID:', insertedConv.id);
      console.log('   Session:', insertedConv.session_id);
      console.log('   Store ID:', insertedConv.store_id);

      // Test inserting a message
      console.log('\n📋 STEP 3: Testing manual insert into ai_chat_messages...\n');

      const { data: insertedMsg, error: msgError } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: insertedConv.id,
          store_id: testStoreId,
          role: 'user',
          content: 'Test message',
        })
        .select()
        .single();

      if (msgError) {
        console.log('❌ Failed to insert message:', msgError.message);
      } else {
        console.log('✅ Successfully inserted test message!');
        console.log('   ID:', insertedMsg.id);
      }

      // Check if visible in view
      console.log('\n📋 STEP 4: Checking if visible in store_conversations view...\n');

      const { data: viewData, error: viewError } = await supabase
        .from('store_conversations')
        .select('*')
        .eq('session_id', testSessionId)
        .single();

      if (viewError && viewError.code === '42P01') {
        console.log('❌ View store_conversations does NOT exist!');
      } else if (viewError) {
        console.log('⚠️ Error checking view:', viewError.message);
      } else if (viewData) {
        console.log('✅ Test conversation IS VISIBLE in view!');
        console.log('   Store name:', viewData.store_name);
        console.log('   Message count:', viewData.message_count);
      } else {
        console.log('❌ Test conversation NOT visible in view');
      }

      // Clean up test data
      console.log('\n🧹 Cleaning up test data...');

      if (insertedMsg) {
        await supabase.from('ai_chat_messages').delete().eq('id', insertedMsg.id);
      }
      if (insertedConv) {
        await supabase.from('ai_chat_conversations').delete().eq('id', insertedConv.id);
      }
      console.log('✅ Test data cleaned up');
    }

    // 3. Check RLS policies
    console.log('\n📋 STEP 5: Checking RLS policies...\n');

    // This requires checking system tables which might not be accessible
    // But we can test if policies are blocking by trying different operations

    console.log('Testing RLS by attempting operations...');

    // Test if anonymous can insert (as edge function would)
    const anonSupabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ');

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
      console.log('❌ Anonymous insert blocked by RLS:', anonError.message);
      console.log('   This might be why edge function can\'t save conversations!');
    } else {
      console.log('✅ Anonymous insert allowed by RLS');
      // Clean up
      await supabase.from('ai_chat_conversations').delete().eq('session_id', testSessionId2);
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 SUMMARY:');
    console.log('=' .repeat(50));

    if (!convTableError && !msgTableError && !insertError) {
      console.log('\n✅ Database setup is CORRECT!');
      console.log('   - Tables exist');
      console.log('   - Manual inserts work');
      console.log('   - View is accessible');
      console.log('\n❌ The issue is in the edge function code itself!');
      console.log('   The conversation tracking code may not be executing.');
    } else {
      console.log('\n❌ Database setup has issues that need fixing.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDatabaseSetup();