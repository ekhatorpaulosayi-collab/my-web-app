import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

console.log('🔍 Testing edge function with debug info...\n');

async function testWithDebug() {
  try {
    // Wait for deployment to propagate
    console.log('⏳ Waiting 10 seconds for deployment to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const testSessionId = `debug_${Date.now()}`;

    console.log('📤 Sending test request...');
    console.log('   Session ID:', testSessionId);
    console.log('   Store slug: paulglobal22\n');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: 'Do you deliver to Lagos?',
        contextType: 'storefront',
        storeSlug: 'paulglobal22',
        sessionId: testSessionId,
        userType: 'visitor',
        storeInfo: {
          businessName: 'james',
        }
      }),
    });

    const result = await response.json();

    console.log('✅ Response received!\n');
    console.log('Status:', response.status);
    console.log('Response preview:', result.response?.substring(0, 100) + '...\n');

    // Check debug info
    if (result.trackingDebug) {
      console.log('📊 TRACKING DEBUG INFO:');
      console.log('=' .repeat(40));
      console.log(JSON.stringify(result.trackingDebug, null, 2));
      console.log('=' .repeat(40) + '\n');

      if (result.trackingDebug.success) {
        console.log('✅✅✅ CONVERSATION TRACKING SUCCESSFUL!');
        console.log('Conversation ID:', result.trackingDebug.conversationId);
        console.log('\n🎉 The fix is working! Conversations are now being tracked.');
      } else {
        console.log('❌ TRACKING FAILED');
        console.log('Error:', result.trackingDebug.error);
        console.log('\nNeed to investigate this error...');
      }
    } else {
      console.log('⚠️ No debug info in response');
      console.log('The edge function may not have deployed correctly.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testWithDebug();