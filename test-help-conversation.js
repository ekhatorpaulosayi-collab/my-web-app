// Test if help context conversations are being saved
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testHelpConversation() {
  console.log('🧪 Testing Help Context Conversation Creation...\n');

  try {
    // Get a test user
    const { data: users } = await supabase
      .from('stores')
      .select('user_id')
      .limit(1)
      .single();

    if (!users || !users.user_id) {
      console.log('❌ No user found to test with');
      return;
    }

    const userId = users.user_id;
    console.log('✅ Using user:', userId);

    // Generate unique session ID
    const sessionId = `test-help-${Date.now()}`;
    console.log('📝 Session ID:', sessionId);

    // Simulate what the chat widget sends
    const payload = {
      message: 'TEST: How do I add products to my inventory?',
      contextType: 'help', // This is what the app uses!
      sessionId: sessionId,
      userType: 'user',
      appContext: {
        hasProducts: true,
        hasSales: false,
        hasOnlineStore: false
      }
    };

    console.log('\n📤 Sending message with help context...');

    // Call the edge function directly
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'x-user-id': userId // Simulate authenticated user
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.response) {
      console.log('✅ AI responded:', result.response.substring(0, 100) + '...');
    } else {
      console.log('⚠️ No AI response received');
    }

    // Wait a moment for database writes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if conversation was created
    console.log('\n🔍 Checking if conversation was saved...');
    const { data: conversations, error } = await supabase
      .from('ai_chat_conversations')
      .select(`
        *,
        ai_chat_messages (
          id,
          role,
          content
        )
      `)
      .eq('session_id', sessionId);

    if (error) {
      console.log('❌ Error checking conversation:', error.message);
      return;
    }

    if (conversations && conversations.length > 0) {
      const conversation = conversations[0];
      console.log('\n✅ SUCCESS! Conversation was saved!');
      console.log('   - ID:', conversation.id);
      console.log('   - Context:', conversation.context_type);
      console.log('   - User ID:', conversation.user_id || 'Not set');
      console.log('   - Store ID:', conversation.store_id || 'Not linked');
      console.log('   - Messages:', conversation.ai_chat_messages?.length || 0);

      if (conversation.ai_chat_messages && conversation.ai_chat_messages.length > 0) {
        console.log('\n📝 Messages in conversation:');
        conversation.ai_chat_messages.forEach((msg, i) => {
          console.log(`   ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
        });
      }

      if (!conversation.store_id) {
        console.log('\n⚠️ WARNING: Conversation not linked to store!');
        console.log('   This might be why it\'s not showing in Conversations page');
      }
    } else {
      console.log('\n❌ FAILED: Conversation was NOT saved');
      console.log('   The edge function is not creating conversations for help context');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHelpConversation().catch(console.error);