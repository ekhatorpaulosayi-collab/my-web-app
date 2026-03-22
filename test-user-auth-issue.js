import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 TESTING USER AUTH AND STORE MAPPING\n');
console.log('=' .repeat(60));

async function testUserAuth() {
  try {
    // Step 1: Get auth user by email
    const email = 'ekhatorpaulosayi@gmail.com';
    console.log(`\n📋 Looking up auth user with email: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('❌ Error getting auth users:', authError);
      return;
    }

    const authUser = authData.users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ No auth user found with that email');
      return;
    }

    console.log('✅ Auth user found:');
    console.log(`   Auth UID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Created: ${authUser.created_at}`);

    // Step 2: Check users table
    console.log(`\n📋 Checking users table for ID: ${authUser.id}`);

    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (dbUserError) {
      console.log('❌ User not in users table:', dbUserError.message);

      // Try to find by email
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userByEmail) {
        console.log(`⚠️ Found user by email but with different ID: ${userByEmail.id}`);
        console.log('   THIS IS THE PROBLEM - Auth UID doesn\'t match users table ID!');
      }
    } else {
      console.log('✅ User found in users table:');
      console.log(`   DB User ID: ${dbUser.id}`);
      console.log(`   Email: ${dbUser.email}`);
    }

    // Step 3: Check stores table
    console.log(`\n📋 Checking stores with auth UID: ${authUser.id}`);

    const { data: storeByAuth } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (storeByAuth) {
      console.log('✅ Store found with auth UID:');
      console.log(`   Store: ${storeByAuth.business_name}`);
      console.log(`   Store ID: ${storeByAuth.id}`);
    } else {
      console.log('❌ No store found with auth UID');

      // Try to find store by email through users table
      console.log('\n📋 Looking for store through users table...');

      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userByEmail) {
        const { data: storeByUser } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', userByEmail.id)
          .single();

        if (storeByUser) {
          console.log('✅ Store found through user table:');
          console.log(`   Store: ${storeByUser.business_name}`);
          console.log(`   Store ID: ${storeByUser.id}`);
          console.log(`   Owner ID in DB: ${storeByUser.user_id}`);
          console.log(`   Auth UID: ${authUser.id}`);

          if (storeByUser.user_id !== authUser.id) {
            console.log('\n❗❗❗ FOUND THE ISSUE:');
            console.log('The store.user_id doesn\'t match auth.uid()!');
            console.log(`Store has user_id: ${storeByUser.user_id}`);
            console.log(`But auth UID is: ${authUser.id}`);

            console.log('\n🔧 FIXING THE MISMATCH...');

            // Fix the store user_id
            const { error: updateError } = await supabase
              .from('stores')
              .update({ user_id: authUser.id })
              .eq('id', storeByUser.id);

            if (updateError) {
              console.log('❌ Failed to update store:', updateError.message);
            } else {
              console.log('✅ Store user_id updated to match auth UID!');
            }

            // Also update users table if needed
            const { error: userUpdateError } = await supabase
              .from('users')
              .update({ id: authUser.id })
              .eq('email', email);

            if (!userUpdateError) {
              console.log('✅ Users table updated!');
            }
          }
        }
      }
    }

    // Step 4: Test if conversations would now be visible
    console.log('\n📋 Testing if conversations are accessible...');

    const { data: testStore } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (testStore) {
      const { data: conversations } = await supabase
        .from('store_conversations')
        .select('*')
        .eq('store_id', testStore.id);

      console.log(`\n✅ With corrected user_id, you should see: ${conversations?.length || 0} conversation(s)`);

      if (conversations && conversations.length > 0) {
        console.log('\n🎉 CONVERSATIONS SHOULD NOW BE VISIBLE IN YOUR DASHBOARD!');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testUserAuth();