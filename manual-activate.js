import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

const userId = 'd476e06d-468e-480c-9ff4-76f2a2dcf824';

console.log('\n🔧 Manually activating subscription for user...\n');

// Update the existing subscription to active
const { data, error } = await supabase
  .from('user_subscriptions')
  .update({
    status: 'active',
    updated_at: new Date().toISOString()
  })
  .eq('user_id', userId)
  .select();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Subscription activated!');
  console.log('   Tier:', data[0]?.tier_id);
  console.log('   Status:', data[0]?.status);
  console.log('   Reference:', data[0]?.payment_reference);
}

console.log('\n✨ Please refresh the page to see your active subscription.\n');
