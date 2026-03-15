import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

const userId = 'd476e06d-468e-480c-9ff4-76f2a2dcf824';

console.log('\n🔄 Syncing Starter subscription from Paystack...\n');

// Delete all existing subscriptions
const { error: deleteError } = await supabase
  .from('user_subscriptions')
  .delete()
  .eq('user_id', userId);

console.log('✅ Cleared old subscriptions');

// Get Starter tier
const { data: starterTier } = await supabase
  .from('subscription_tiers')
  .select('id, name')
  .eq('name', 'Starter')
  .single();

if (!starterTier) {
  console.log('❌ Starter tier not found');
  process.exit(1);
}

// Create Starter subscription
const { data: newSub, error: insertError } = await supabase
  .from('user_subscriptions')
  .insert({
    user_id: userId,
    tier_id: starterTier.id,
    status: 'active',
    billing_cycle: 'monthly',
    payment_provider: 'paystack',
    payment_reference: 'SUB_6ue06190jcn6dl1',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })
  .select()
  .single();

if (insertError) {
  console.log('❌ Error creating subscription:', insertError.message);
} else {
  console.log('✅ Starter subscription synced successfully!');
  console.log('   Tier:', starterTier.name);
  console.log('   Status: active');
  console.log('   Reference: SUB_6ue06190jcn6dl1');
}

console.log('\n🔄 Please refresh the page to see your Starter subscription.\n');