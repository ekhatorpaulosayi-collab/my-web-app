import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

console.log('\n🔍 Checking Live Mode Setup\n');
console.log('=' .repeat(80));

// Check subscription tiers
const { data: tiers, error } = await supabase
  .from('subscription_tiers')
  .select('*')
  .order('display_order');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('\n📋 Current Plan Codes in Database:\n');

tiers.forEach(tier => {
  if (tier.name === 'Free') return; // Skip free tier

  console.log(`${tier.name} Plan:`);
  console.log(`  Monthly: ${tier.paystack_plan_code_monthly || '❌ NOT SET'}`);
  console.log(`  Annual:  ${tier.paystack_plan_code_annual || '❌ NOT SET'}`);
  console.log(`  Prices:  ₦${tier.price_monthly}/mo, ₦${tier.price_annual}/yr`);
  console.log('');
});

console.log('=' .repeat(80));
console.log('\n✅ TO CONFIRM YOU\'RE READY FOR LIVE:\n');
console.log('1. Go to: https://dashboard.paystack.com/#/plans');
console.log('2. Make sure you\'re in LIVE mode (check top-right corner)');
console.log('3. Verify the plan codes above match your LIVE plans');
console.log('4. Check that your Vercel environment has: VITE_PAYSTACK_PUBLIC_KEY=pk_live_...');
console.log('5. Check that Supabase Edge Functions have: PAYSTACK_SECRET_KEY=sk_live_...\n');

console.log('🧪 TO TEST LIVE MODE:');
console.log('1. Use a REAL card (you\'ll be charged)');
console.log('2. Start with the cheapest plan (₦5,000)');
console.log('3. Check Paystack dashboard for the transaction');
console.log('4. Verify subscription activates in the app\n');