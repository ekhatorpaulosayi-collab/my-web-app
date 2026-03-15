import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

// Get Pro tier ID
const { data: tier } = await supabase
  .from('subscription_tiers')
  .select('id, name')
  .eq('name', 'Pro')
  .single();

console.log('\n🔄 Upgrading subscription to Pro...\n');

// Update subscription
const { data, error } = await supabase
  .from('user_subscriptions')
  .update({
    tier_id: tier.id,
    status: 'active',
    billing_cycle: 'monthly',
    payment_provider: 'paystack',
    payment_reference: 'SUB_on7cf5llwagv00j',
    current_period_start: new Date('2026-03-14').toISOString(),
    current_period_end: new Date('2026-04-14').toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq('user_id', userId)
  .select();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ UPGRADE COMPLETE!');
  console.log('   Tier: Pro');
  console.log('   Billing: Monthly (₦10,000/month)');
  console.log('   Status: Active');
  console.log('   Next Payment: April 14, 2026');
}
