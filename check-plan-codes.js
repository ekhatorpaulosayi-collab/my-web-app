function requireAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    console.error("Set SUPABASE_ANON_KEY to your project's anon key from the dashboard.");
    process.exit(1);
  }
  return key;
}

import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const key = requireAnonKey();

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('subscription_tiers')
  .select('id, name, paystack_plan_code_monthly, paystack_plan_code_annual')
  .eq('is_active', true)
  .order('display_order');

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('\n📋 Subscription Tiers and Plan Codes:\n');
  data.forEach(tier => {
    console.log(`${tier.name}:`);
    console.log(`  Monthly Code: ${tier.paystack_plan_code_monthly || '⚠️  NOT SET'}`);
    console.log(`  Annual Code:  ${tier.paystack_plan_code_annual || '⚠️  NOT SET'}`);
    console.log('');
  });
}
