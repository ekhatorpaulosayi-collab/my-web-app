import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

console.log('\n🔄 Creating subscription record for user...\n');

// Get Starter tier ID
const { data: tier } = await supabase
  .from('subscription_tiers')
  .select('id')
  .eq('name', 'Starter')
  .single();

if (!tier) {
  console.log('❌ Starter tier not found');
  process.exit(1);
}

// Create or update subscription
const { data, error } = await supabase
  .from('user_subscriptions')
  .upsert({
    user_id: userId,
    tier_id: tier.id,
    status: 'active',
    billing_cycle: 'annual',
    payment_provider: 'paystack',
    payment_reference: 'SUB_bcsbdxwf2653prk',
    current_period_start: new Date('2026-03-12').toISOString(),
    current_period_end: new Date('2027-03-12').toISOString(),
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id'
  })
  .select();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Subscription created!');
  console.log('   Tier: Starter');
  console.log('   Billing: Annual');
  console.log('   Status: Active');
  console.log('   Valid until: March 12, 2027');
}
