import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

// Get Starter tier
const { data: tier, error: tierError } = await supabase
  .from('subscription_tiers')
  .select('id, name')
  .eq('name', 'Starter')
  .single();

if (tierError) {
  console.log('Tier error:', tierError);
  process.exit(1);
}

console.log('Found tier:', tier);

// Insert subscription
const { data: sub, error: subError } = await supabase
  .from('user_subscriptions')
  .insert({
    user_id: userId,
    tier_id: tier.id,
    status: 'active',
    billing_cycle: 'annual',
    payment_provider: 'paystack',
    payment_reference: 'SUB_bcsbdxwf2653prk',
    current_period_start: '2026-03-12T06:00:00Z',
    current_period_end: '2027-03-12T06:00:00Z'
  })
  .select();

if (subError) {
  console.log('❌ Sub error:', subError.message);
} else {
  console.log('✅ Success!', sub);
}
