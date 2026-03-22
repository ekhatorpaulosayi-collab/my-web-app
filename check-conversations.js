import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Checking conversations in database...\n');

async function checkConversations() {
  try {
    // 1. Check all conversations with store_id
    const { data: storeConvs, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .not('store_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (convError) {
      console.log('❌ Error fetching conversations:', convError.message);
    } else {
      console.log(`📊 Found ${storeConvs?.length || 0} conversations with store_id`);
      if (storeConvs && storeConvs.length > 0) {
        console.log('Latest conversation:', {
          id: storeConvs[0].id,
          store_id: storeConvs[0].store_id,
          is_storefront: storeConvs[0].is_storefront,
          session_id: storeConvs[0].session_id,
          created_at: storeConvs[0].created_at
        });
      }
    }

    // 2. Check storefront conversations
    const { data: storefrontConvs, error: sfError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('is_storefront', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (sfError) {
      console.log('❌ Error fetching storefront conversations:', sfError.message);
    } else {
      console.log(`\n🛍️ Found ${storefrontConvs?.length || 0} storefront conversations`);
      if (storefrontConvs && storefrontConvs.length > 0) {
        console.log('Latest storefront conversation:', {
          id: storefrontConvs[0].id,
          store_id: storefrontConvs[0].store_id,
          is_storefront: storefrontConvs[0].is_storefront,
          session_id: storefrontConvs[0].session_id,
          created_at: storefrontConvs[0].created_at
        });
      }
    }

    // 3. Check if store_conversations view exists
    const { data: viewData, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .limit(5);

    if (viewError) {
      console.log('\n⚠️ store_conversations view error:', viewError.message);
      if (viewError.code === '42P01') {
        console.log('   View does not exist - needs to be created!');
      }
    } else {
      console.log(`\n✅ store_conversations view has ${viewData?.length || 0} rows`);
      if (viewData && viewData.length > 0) {
        console.log('Sample row:', viewData[0]);
      }
    }

    // 4. Check all recent conversations (regardless of type)
    const { data: allConvs, error: allError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allError && allConvs) {
      console.log(`\n📋 Total recent conversations: ${allConvs.length}`);
      console.log('Context types:', [...new Set(allConvs.map(c => c.context_type))]);
      console.log('Has store_id:', allConvs.filter(c => c.store_id).length);
      console.log('Is storefront:', allConvs.filter(c => c.is_storefront).length);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkConversations();