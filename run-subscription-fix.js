import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Fixing subscription issue for new users...\n');

async function runFix() {
  try {
    // Step 1: Check current state
    console.log('📊 Checking current state...');

    // Count users without subscriptions
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const userIds = allUsers?.users?.map(u => u.id) || [];

    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('user_id');

    const subscribedUserIds = new Set(subscriptions?.map(s => s.user_id) || []);
    const usersWithoutSub = userIds.filter(id => !subscribedUserIds.has(id));

    console.log(`Total users: ${userIds.length}`);
    console.log(`Users without subscription: ${usersWithoutSub.length}`);

    if (usersWithoutSub.length > 0) {
      console.log('\n🔨 Creating free subscriptions for users without one...');

      // Create subscriptions for users who don't have one
      for (const userId of usersWithoutSub) {
        try {
          const { error } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              tier_id: 'free',
              billing_cycle: 'monthly',
              status: 'active',
              started_at: new Date().toISOString(),
              current_period_start: new Date().toISOString(),
              ai_chats_used_this_month: 0
            });

          if (!error) {
            console.log(`✅ Created subscription for user: ${userId}`);
          } else if (error.code !== '23505') { // Ignore duplicate key errors
            console.log(`⚠️ Failed for user ${userId}:`, error.message);
          }
        } catch (err) {
          console.log(`⚠️ Error for user ${userId}:`, err.message);
        }
      }
    }

    // Step 2: Test with a sample user
    console.log('\n🧪 Testing product limit check...');

    if (userIds.length > 0) {
      const testUserId = userIds[0];

      // Test the can_add_product function
      const { data, error } = await supabase.rpc('can_add_product', {
        p_user_id: testUserId
      });

      if (error) {
        console.log('❌ Error calling can_add_product:', error.message);
      } else {
        console.log('✅ can_add_product response:', data);

        if (data?.allowed) {
          console.log(`   User can add products (limit: ${data.limit || 'unlimited'})`);
        } else {
          console.log(`   User cannot add products: ${data.reason}`);
        }
      }
    }

    // Step 3: Final verification
    console.log('\n📊 Final verification...');

    const { data: finalSubs } = await supabase
      .from('user_subscriptions')
      .select('user_id');

    const finalSubbedUsers = new Set(finalSubs?.map(s => s.user_id) || []);
    const finalUsersWithoutSub = userIds.filter(id => !finalSubbedUsers.has(id));

    console.log(`Users without subscription after fix: ${finalUsersWithoutSub.length}`);

    if (finalUsersWithoutSub.length === 0) {
      console.log('\n✅ SUCCESS! All users now have subscriptions.');
      console.log('New users should now be able to add products immediately.');
    } else {
      console.log('\n⚠️ Some users still without subscriptions.');
      console.log('IDs:', finalUsersWithoutSub);
    }

  } catch (error) {
    console.error('❌ Error running fix:', error);
  }
}

runFix();