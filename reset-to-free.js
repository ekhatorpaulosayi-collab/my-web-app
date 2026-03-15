import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

const userId = 'd476e06d-468e-480c-9ff4-76f2a2dcf824';

console.log('\n🔄 Resetting user to FREE tier...\n');

// Step 1: Delete ALL existing subscriptions
console.log('1️⃣ Deleting all existing subscriptions...');
const { error: deleteError } = await supabase
  .from('user_subscriptions')
  .delete()
  .eq('user_id', userId);

if (deleteError) {
  console.log('❌ Delete error:', deleteError.message);
  process.exit(1);
}

console.log('✅ Deleted all subscriptions');

// Step 2: Get FREE tier
console.log('\n2️⃣ Getting FREE tier...');
const { data: freeTier, error: tierError } = await supabase
  .from('subscription_tiers')
  .select('id, name')
  .eq('name', 'Free')
  .single();

if (tierError || !freeTier) {
  console.log('❌ Could not find FREE tier:', tierError?.message);
  process.exit(1);
}

console.log('✅ Found FREE tier:', freeTier.name);

// Step 3: Create FREE subscription
console.log('\n3️⃣ Creating FREE tier subscription...');
const { data: newSub, error: insertError } = await supabase
  .from('user_subscriptions')
  .insert({
    user_id: userId,
    tier_id: freeTier.id,
    status: 'active',
    billing_cycle: 'monthly'
  })
  .select()
  .single();

if (insertError) {
  console.log('❌ Insert error:', insertError.message);
  process.exit(1);
}

console.log('✅ Created FREE tier subscription');
console.log('   ID:', newSub.id);
console.log('   Status:', newSub.status);

console.log('\n✨ User is now on FREE tier and ready to upgrade!');
console.log('🔄 Please refresh the page.\n');
