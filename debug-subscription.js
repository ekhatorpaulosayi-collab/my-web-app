import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

console.log('\n🔍 Fetching ALL user subscriptions...\n');

const { data, error } = await supabase
  .from('user_subscriptions')
  .select(`
    user_id,
    tier_id,
    status,
    payment_provider,
    payment_reference,
    subscription_tiers (name)
  `)
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log(`Found ${data.length} subscriptions:\n`);

  data.forEach((sub, index) => {
    console.log(`${index + 1}. User: ${sub.user_id.substring(0, 8)}...`);
    console.log(`   Tier: ${sub.subscription_tiers?.name}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Provider: ${sub.payment_provider || 'NONE'}`);
    console.log(`   Reference: ${sub.payment_reference || 'NONE'}`);
    console.log('');
  });
}
