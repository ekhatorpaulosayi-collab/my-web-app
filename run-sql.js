import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

// Example SQL commands you can run:

// 1. Check subscription tiers
const { data: tiers, error: tiersError } = await supabase
  .from('subscription_tiers')
  .select('*')
  .order('display_order');

if (tiers) {
  console.log('\n📋 Subscription Tiers:');
  console.log('====================');
  tiers.forEach(tier => {
    console.log(`${tier.name}: ${tier.paystack_plan_code_monthly || 'No plan code'}`);
  });
}

// 2. Check user subscriptions
const { data: subs, error: subsError } = await supabase
  .from('user_subscriptions')
  .select(`
    *,
    subscription_tiers (name)
  `)
  .limit(5);

if (subs) {
  console.log('\n👥 Recent User Subscriptions:');
  console.log('===========================');
  subs.forEach(sub => {
    console.log(`User: ${sub.user_id.slice(0, 8)}... | Tier: ${sub.subscription_tiers?.name} | Status: ${sub.status}`);
  });
}

// 3. Run raw SQL using RPC (if you have a function set up)
// Or you can use the Supabase dashboard SQL editor for raw SQL

console.log('\n💡 TIP: For raw SQL queries, use the Supabase Dashboard:');
console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');