import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

console.log('\n📋 Checking current subscription...\n');

const { data, error } = await supabase
  .from('user_subscriptions')
  .select(`
    *,
    subscription_tiers (name, price_monthly, price_annual)
  `)
  .eq('user_id', userId)
  .single();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ SUBSCRIPTION FOUND:\n');
  console.log('Tier:', data.subscription_tiers?.name);
  console.log('Status:', data.status);
  console.log('Billing:', data.billing_cycle);
  console.log('Provider:', data.payment_provider);
  console.log('Payment Reference:', data.payment_reference);
  console.log('Started:', new Date(data.started_at).toLocaleDateString());
  console.log('Current Period:', new Date(data.current_period_start).toLocaleDateString(), '-', new Date(data.current_period_end).toLocaleDateString());
  console.log('\nFull data:', JSON.stringify(data, null, 2));
}
