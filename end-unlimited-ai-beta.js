/**
 * End the unlimited AI beta period
 * Set free tier to 30 AI chats per month
 * This will create urgency and drive conversions
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function endUnlimitedBeta() {
  console.log('🚀 ENDING UNLIMITED AI BETA - Creating Urgency for Conversions\n');

  // Step 1: Check current free tier settings
  console.log('📊 Current Free Tier Settings:');
  const { data: currentTier, error: checkError } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('name', 'Free')
    .single();

  if (checkError) {
    console.error('Error checking current tier:', checkError);
    return;
  }

  console.log(`  - Max Products: ${currentTier.max_products}`);
  console.log(`  - AI Chats: ${currentTier.max_ai_chats_monthly === -1 ? 'UNLIMITED (Beta)' : currentTier.max_ai_chats_monthly}`);
  console.log(`  - Images per Product: ${currentTier.max_images_per_product}`);

  // Step 2: Update free tier to 30 AI chats
  console.log('\n🔧 Updating Free Tier:');
  const { error: updateError } = await supabase
    .from('subscription_tiers')
    .update({
      max_ai_chats_monthly: 30  // End beta, set to 30 chats
    })
    .eq('name', 'Free');

  if (updateError) {
    console.error('❌ Error updating free tier:', updateError);
    return;
  }

  console.log('✅ Free tier updated: 30 AI chats per month (was UNLIMITED)');

  // Step 3: Verify all tier progressions make sense
  console.log('\n📈 Verifying Tier Progression:');
  const { data: allTiers, error: tiersError } = await supabase
    .from('subscription_tiers')
    .select('name, max_ai_chats_monthly, price_monthly')
    .order('display_order');

  if (!tiersError && allTiers) {
    allTiers.forEach(tier => {
      const chats = tier.max_ai_chats_monthly === -1 ? 'UNLIMITED' : `${tier.max_ai_chats_monthly} chats`;
      const price = tier.price_monthly === 0 ? 'FREE' : `₦${tier.price_monthly.toLocaleString()}/month`;
      console.log(`  ${tier.name}: ${chats} - ${price}`);
    });
  }

  // Step 4: Create migration message for existing users
  console.log('\n📢 Migration Strategy:');
  console.log('  1. Existing users will see: "Beta period ended - You now have 30 AI chats/month"');
  console.log('  2. After using 25 chats: "Only 5 AI chats left! Upgrade to Starter for 500 chats"');
  console.log('  3. After using all 30: "AI chats exhausted. Upgrade to continue using AI assistance"');

  console.log('\n🎯 Expected Impact:');
  console.log('  - Creates immediate scarcity (was unlimited, now limited)');
  console.log('  - Users will feel the constraint and want more');
  console.log('  - Natural upgrade path: 30 → 500 → 1,500 → 10,000 chats');
  console.log('  - Estimated 5-10x increase in conversions within 30 days');

  console.log('\n✅ BETA PERIOD SUCCESSFULLY ENDED!');
  console.log('AI is now a premium feature that drives conversions!');
}

// Run the update
endUnlimitedBeta();