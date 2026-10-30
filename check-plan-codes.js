import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const key = 'public-anon-placeholder';

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
