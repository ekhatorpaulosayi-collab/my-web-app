import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

console.log('🚀 Deploying Edge Function to Supabase...\n');

async function deployEdgeFunction() {
  try {
    // Read the edge function code
    const functionCode = fs.readFileSync('./supabase/functions/ai-chat/index.ts', 'utf8');
    console.log('📄 Edge function code loaded (', functionCode.length, 'characters)');

    // Unfortunately, Supabase doesn't provide a direct API for deploying functions
    // We need to use the Supabase CLI or dashboard

    console.log('\n⚠️ Automatic deployment via API is not available.');
    console.log('\n📋 Please follow these steps to deploy manually:\n');
    console.log('1. Install Supabase CLI locally:');
    console.log('   npm install supabase --save-dev\n');

    console.log('2. Link your project:');
    console.log('   npx supabase link --project-ref yzlniqwzqlsftxrtapdl\n');

    console.log('3. Deploy the function:');
    console.log('   npx supabase functions deploy ai-chat\n');

    console.log('\n🌐 OR use the Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/functions/ai-chat\n');

    console.log('The edge function code has been updated in:');
    console.log('   ./supabase/functions/ai-chat/index.ts');
    console.log('\nKey changes made:');
    console.log('   ✅ Added sessionId parameter extraction');
    console.log('   ✅ Added conversation tracking for storefront');
    console.log('   ✅ Saves both user and assistant messages');

    // Test if the current edge function has sessionId support
    console.log('\n🧪 Testing current edge function...');

    const testSessionId = `deploy_test_${Date.now()}`;
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        message: 'test',
        contextType: 'storefront',
        storeSlug: 'test',
        sessionId: testSessionId,
        userType: 'visitor',
      }),
    });

    const result = await response.json();
    console.log('Edge function responded:', response.status);

    // Check if conversation was saved
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: convs } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', testSessionId);

    if (convs && convs.length > 0) {
      console.log('✅ Edge function IS saving conversations!');

      // Clean up test
      await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('session_id', testSessionId);
    } else {
      console.log('❌ Edge function NOT saving conversations yet');
      console.log('   Deploy is needed!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

deployEdgeFunction();