// Test script to verify conversation creation is working
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConversationCreation() {
  console.log('🚀 Testing conversation creation...\n');

  // 1. Sign in as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'olaniyiekhator@gmail.com',
    password: 'Godisgood1.'
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    return;
  }

  console.log('✅ Signed in successfully');
  const userId = authData.user.id;
  const sessionId = `test-session-${Date.now()}`;

  // 2. Send a test message to the AI chat
  console.log('\n📨 Sending test message to AI chat...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'Hello, I need help with my store setup',
        contextType: 'help',
        sessionId: sessionId,
        userType: 'user',
        appContext: {
          hasProducts: true,
          hasSales: true,
          hasOnlineStore: true
        }
      })
    });

    const result = await response.json();
    console.log('✅ AI Response received:', result.response?.substring(0, 100) + '...');

    // 3. Check if conversation was created
    console.log('\n🔍 Checking if conversation was created...');

    const { data: conversations, error: convError } = await supabase
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
      .eq('session_id', sessionId)
      .single();

    if (convError) {
      console.error('❌ Error fetching conversation:', convError.message);
      return;
    }

    if (conversations) {
      console.log('✅ Conversation created successfully!');
      console.log('   - Conversation ID:', conversations.id);
      console.log('   - User ID:', conversations.user_id);
      console.log('   - Store ID:', conversations.store_id);
      console.log('   - Context Type:', conversations.context_type);
      console.log('   - Messages:', conversations.ai_chat_messages?.length || 0);

      if (conversations.ai_chat_messages && conversations.ai_chat_messages.length > 0) {
        console.log('\n📝 Messages in conversation:');
        conversations.ai_chat_messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
        });
      }

      // 4. Check if conversation appears in user's store conversations
      console.log('\n🏪 Checking if conversation is linked to user\'s store...');

      const { data: userStores } = await supabase
        .from('stores')
        .select('id, businessName')
        .or(`user_id.eq.${userId},created_by.eq.${userId}`)
        .limit(1)
        .single();

      if (userStores && conversations.store_id === userStores.id) {
        console.log('✅ Conversation correctly linked to store:', userStores.businessName);
      } else if (conversations.store_id) {
        console.log('⚠️ Conversation linked to different store ID:', conversations.store_id);
      } else {
        console.log('❌ Conversation not linked to any store');
      }
    } else {
      console.log('❌ No conversation found');
    }

  } catch (error) {
    console.error('❌ Error calling AI chat:', error);
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Test completed!');
}

// Run the test
testConversationCreation().catch(console.error);