import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Debugging stores table and conversation tracking...\n');

async function debug() {
  try {
    // Check stores table structure
    console.log('📋 Checking stores with store_slug = paulglobal22:');
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('store_slug', 'paulglobal22');

    if (error) {
      console.log('Error:', error);
    } else {
      console.log(`Found ${stores?.length || 0} stores with this slug`);
      if (stores && stores.length > 0) {
        stores.forEach((store, i) => {
          console.log(`\nStore ${i + 1}:`, {
            id: store.id,
            business_name: store.business_name,
            store_slug: store.store_slug,
            user_id: store.user_id,
          });
        });
      }
    }

    // Check if there are any conversations at all
    console.log('\n📊 Checking all storefront conversations:');
    const { data: allConvs, count } = await supabase
      .from('ai_chat_conversations')
      .select('*', { count: 'exact' })
      .eq('is_storefront', true)
      .limit(5);

    console.log(`Total storefront conversations: ${count || 0}`);
    if (allConvs && allConvs.length > 0) {
      console.log('Sample conversations:', allConvs.map(c => ({
        id: c.id,
        session_id: c.session_id,
        store_id: c.store_id,
        created_at: c.created_at,
      })));
    }

    // Check if any conversations have store_id
    const { count: withStoreId } = await supabase
      .from('ai_chat_conversations')
      .select('*', { count: 'exact', head: true })
      .not('store_id', 'is', null);

    console.log(`\nConversations with store_id: ${withStoreId || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

debug();