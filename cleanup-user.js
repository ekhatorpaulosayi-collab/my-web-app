import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

const userId = 'd476e06d-468e-480c-9ff4-76f2a2dcf824';

console.log('\n🧹 Cleaning up all subscriptions for user:', userId, '\n');

// Delete ALL subscriptions for this user
const { data, error } = await supabase
  .from('user_subscriptions')
  .delete()
  .eq('user_id', userId)
  .select();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Deleted', data.length, 'subscription(s)');
}

// Now create a FREE tier subscription
console.log('\n📋 Creating FREE tier subscription...\n');

const { data: freeTier } = await supabase
  .from('subscription_tiers')
  .select('id, name')
  .eq('name', 'Free')
  .single();

if (freeTier) {
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
    console.log('❌ Error creating FREE subscription:', insertError.message);
  } else {
    console.log('✅ Created FREE tier subscription');
    console.log('   ID:', newSub.id);
    console.log('   Tier:', freeTier.name);
  }
}

console.log('\n✨ User is now on FREE tier and ready to upgrade!\n');
