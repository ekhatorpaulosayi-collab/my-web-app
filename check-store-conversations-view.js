import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Checking store_conversations view...\n');
console.log('=' .repeat(50));

async function checkView() {
  try {
    // Step 1: Check if view exists by trying to select from it
    console.log('\n📋 Testing if store_conversations view exists...');

    const { data: viewData, error: viewError } = await supabase
      .from('store_conversations')
      .select('*')
      .limit(1);

    if (viewError) {
      if (viewError.code === '42P01') {
        console.log('❌ View "store_conversations" does not exist!');
        console.log('\n📝 Creating the view...\n');

        // Create the view
        const createViewSQL = `
          CREATE OR REPLACE VIEW store_conversations AS
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
            c.created_at, c.updated_at;
        `;

        // Execute SQL using RPC
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: createViewSQL
        });

        if (createError) {
          console.log('❌ Failed to create view with RPC:', createError.message);

          // Try alternative: create a simple function to check data
          console.log('\n📋 Checking raw conversation data instead...');
        } else {
          console.log('✅ View created successfully!');
        }
      } else {
        console.log('❌ Error accessing view:', viewError.message);
      }
    } else {
      console.log('✅ View exists and is accessible');
      console.log(`   Found ${viewData?.length || 0} conversation(s) in view`);
    }

    // Step 2: Check actual conversation data
    console.log('\n📋 Checking actual ai_chat_conversations table...');

    const { data: conversations, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('is_storefront', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (convError) {
      console.log('❌ Error fetching conversations:', convError.message);
    } else if (conversations && conversations.length > 0) {
      console.log(`✅ Found ${conversations.length} storefront conversation(s)`);

      conversations.forEach(conv => {
        console.log(`\n  Conversation: ${conv.id}`);
        console.log(`    Session: ${conv.session_id}`);
        console.log(`    Store ID: ${conv.store_id}`);
        console.log(`    Created: ${conv.created_at}`);
        console.log(`    Source: ${conv.source_page}`);
      });

      // Step 3: Check if these conversations have messages
      console.log('\n📋 Checking messages for conversations...');

      for (const conv of conversations.slice(0, 2)) {
        const { data: messages, error: msgError } = await supabase
          .from('ai_chat_messages')
          .select('id, role, created_at')
          .eq('conversation_id', conv.id);

        if (msgError) {
          console.log(`  ❌ Error fetching messages for ${conv.id}:`, msgError.message);
        } else {
          console.log(`  Conversation ${conv.session_id?.substring(0, 20)}: ${messages?.length || 0} messages`);
        }
      }

      // Step 4: Test what the frontend would see
      console.log('\n📋 Testing frontend query (for paulglobal store)...');

      // Get the store ID for paulglobal
      const { data: store } = await supabase
        .from('stores')
        .select('id, user_id, business_name')
        .eq('store_slug', 'paul-pahhggygggffffg')
        .single();

      if (store) {
        console.log(`\nStore: ${store.business_name}`);
        console.log(`Store ID: ${store.id}`);
        console.log(`User ID: ${store.user_id}`);

        // Try the exact query the frontend uses
        const { data: frontendData, error: frontendError } = await supabase
          .from('store_conversations')
          .select('*')
          .eq('store_id', store.id)
          .order('last_message_at', { ascending: false });

        if (frontendError) {
          console.log('\n❌ Frontend query failed:', frontendError.message);

          if (frontendError.code === '42P01') {
            console.log('\n🔧 The view needs to be created in the database!');
            console.log('\n📝 SOLUTION: Run the SQL migration to create the view:');
            console.log('\n```sql');
            console.log(createViewSQL);
            console.log('```');
          }
        } else {
          console.log(`\n✅ Frontend query successful!`);
          console.log(`   Found ${frontendData?.length || 0} conversation(s) for this store`);

          if (frontendData && frontendData.length > 0) {
            console.log('\n✅✅✅ CONVERSATIONS SHOULD BE VISIBLE IN DASHBOARD!');
          } else {
            console.log('\n⚠️ No conversations found for this specific store');
            console.log('   But conversations exist in the database');
            console.log('   Checking if store_id matches...');

            // Check if conversations have the correct store_id
            const { data: storeConvs } = await supabase
              .from('ai_chat_conversations')
              .select('id, session_id, store_id')
              .eq('store_id', store.id)
              .eq('is_storefront', true);

            if (storeConvs && storeConvs.length > 0) {
              console.log(`\n✅ Found ${storeConvs.length} conversations with matching store_id`);
            } else {
              console.log('\n❌ No conversations with matching store_id');
              console.log('   The edge function might not be saving the correct store_id');
            }
          }
        }
      }
    } else {
      console.log('❌ No storefront conversations found');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkView();