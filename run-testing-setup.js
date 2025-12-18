/**
 * Script to make all subscription tiers FREE for testing phase
 * This only updates the database - no code changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeAllTiersFree() {
  console.log('🧪 TESTING PHASE SETUP\n');
  console.log('Step 1: Making all subscription tiers FREE...\n');

  // Update all tiers to have 0 pricing
  const { data: updateData, error: updateError } = await supabase
    .from('subscription_tiers')
    .update({
      price_monthly: 0,
      price_annual: 0,
      updated_at: new Date().toISOString()
    })
    .in('id', ['free', 'starter', 'pro', 'business'])
    .select();

  if (updateError) {
    console.error('❌ Error updating tiers:', updateError);
    return;
  }

  console.log('✅ All tiers are now FREE!\n');

  // Fetch and display updated tiers
  const { data: tiers, error: fetchError } = await supabase
    .from('subscription_tiers')
    .select('id, name, price_monthly, price_annual, max_products, max_users, max_ai_chats_monthly')
    .order('display_order');

  if (fetchError) {
    console.error('❌ Error fetching tiers:', fetchError);
    return;
  }

  console.log('📊 Current Tier Pricing:\n');
  tiers.forEach(tier => {
    console.log(`${tier.name.toUpperCase()} (${tier.id}):`);
    console.log(`  💰 Monthly: ₦${tier.price_monthly.toLocaleString()}`);
    console.log(`  💰 Annual: ₦${tier.price_annual.toLocaleString()}`);
    console.log(`  📦 Products: ${tier.max_products || 'Unlimited'}`);
    console.log(`  👥 Users: ${tier.max_users}`);
    console.log(`  🤖 AI Chats: ${tier.max_ai_chats_monthly}/month`);
    console.log('');
  });

  console.log('\n✨ Testing phase setup complete!');
  console.log('All users can now access any tier for FREE.\n');
}

async function upgradeAllUsersToPro() {
  console.log('Step 2: Upgrading all users to PRO tier...\n');

  const { data: upgraded, error } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: 'pro',
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('tier_id', 'free')
    .select();

  if (error) {
    console.error('❌ Error upgrading users:', error);
    return;
  }

  console.log(`✅ Upgraded ${upgraded?.length || 0} users to PRO tier!\n`);

  // Show current user subscriptions
  const { data: users, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('user_id, tier_id, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!fetchError && users) {
    console.log('📊 Recent User Subscriptions:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.user_id.substring(0, 8)}... → ${user.tier_id.toUpperCase()} (${user.status})`);
    });
  }
}

// Run both steps
async function main() {
  try {
    await makeAllTiersFree();
    await upgradeAllUsersToPro();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL DONE!');
    console.log('='.repeat(60));
    console.log('\n📝 NEXT STEPS:');
    console.log('1. All tiers are now FREE (₦0)');
    console.log('2. All existing users upgraded to PRO tier');
    console.log('3. New users can select any tier for free');
    console.log('4. Your landing page pricing display unchanged');
    console.log('\n⚠️  TO RESTORE ORIGINAL PRICING LATER:');
    console.log('Run the SQL file: restore-original-pricing.sql');
    console.log('');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

main();
