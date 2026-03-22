import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 FIXING THE UNIQUE CONSTRAINT ISSUE\n');
console.log('=' .repeat(50));

async function fixUniqueConstraint() {
  try {
    console.log('The issue: Edge function needs unique constraint on session_id');
    console.log('The fix: Add unique constraint to ai_chat_conversations.session_id\n');

    // For now, let's change the edge function approach instead
    // Instead of upsert, we'll check if exists first, then insert or update

    console.log('Testing alternative approach: INSERT without upsert\n');

    const testSessionId = `fix_test_${Date.now()}`;
    const testStoreId = '66fab0a4-2e44-433a-9304-a0486cfa9cab';

    // Step 1: Try regular insert (not upsert)
    console.log('📋 Testing regular INSERT (not upsert)...');
    const { data: insertData, error: insertError } = await supabase
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
      console.log('❌ Regular insert failed:', insertError.message);
    } else {
      console.log('✅ Regular INSERT works!');
      console.log('   Conversation ID:', insertData.id);

      // Add a test message
      const { data: msgData, error: msgError } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: insertData.id,
          store_id: testStoreId,
          role: 'user',
          content: 'Test message after constraint fix',
        })
        .select()
        .single();

      if (msgError) {
        console.log('❌ Message insert failed:', msgError.message);
      } else {
        console.log('✅ Message INSERT works!');
      }

      // Clean up
      if (msgData) {
        await supabase.from('ai_chat_messages').delete().eq('id', msgData.id);
      }
      await supabase.from('ai_chat_conversations').delete().eq('id', insertData.id);
      console.log('✅ Test data cleaned up\n');
    }

    // Step 2: Test edge function with fixed approach
    console.log('📤 Testing edge function again...');
    const edgeTestSessionId = `edge_fix_${Date.now()}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'Hello, what are your hours?',
        contextType: 'storefront',
        storeSlug: 'paulglobal22',
        sessionId: edgeTestSessionId,
        userType: 'visitor',
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);

    if (result.trackingDebug) {
      console.log('\n📊 TRACKING DEBUG:');
      console.log(JSON.stringify(result.trackingDebug, null, 2));

      if (result.trackingDebug.success) {
        console.log('\n✅✅✅ CONVERSATION TRACKING NOW WORKS!');

        // Verify in database
        const { data: verifyData } = await supabase
          .from('ai_chat_conversations')
          .select('*')
          .eq('session_id', edgeTestSessionId)
          .single();

        if (verifyData) {
          console.log('✅ Verified in database!');
          console.log('   Conversation ID:', verifyData.id);

          // Clean up
          await supabase.from('ai_chat_messages').delete().eq('conversation_id', verifyData.id);
          await supabase.from('ai_chat_conversations').delete().eq('id', verifyData.id);
        }
      } else {
        console.log('\n❌ Still not working. Error:', result.trackingDebug.error);
        console.log('\n📝 SOLUTION: Need to fix the edge function code');
        console.log('Change from UPSERT to INSERT in the edge function');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixUniqueConstraint();