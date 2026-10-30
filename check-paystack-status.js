import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'public-anon-placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaystackStatus() {
  console.log('\n🔍 PAYSTACK INTEGRATION STATUS CHECK');
  console.log('━'.repeat(80));

  // 1. Check subscription_tiers table
  console.log('\n📊 1. Checking subscription_tiers table...');
  const { data: tiers, error: tiersError } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('display_order');

  if (tiersError) {
    console.log('❌ subscription_tiers table not found:', tiersError.message);
  } else {
    console.log(`✅ Found ${tiers.length} subscription tiers:`);
    tiers.forEach(tier => {
      console.log(`\n  Tier: ${tier.name}`);
      console.log(`    Price (Monthly): ₦${tier.price_monthly / 100}`);
      console.log(`    Price (Annual): ₦${tier.price_annual / 100}`);
      console.log(`    Paystack Plan (Monthly): ${tier.paystack_plan_code_monthly || '❌ NOT SET'}`);
      console.log(`    Paystack Plan (Annual): ${tier.paystack_plan_code_annual || '❌ NOT SET'}`);
    });
  }

  // 2. Check payment_transactions table
  console.log('\n\n📊 2. Checking payment_transactions table...');
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select('*')
    .limit(1);

  if (txError) {
    console.log('❌ payment_transactions table does NOT exist');
    console.log('   Error:', txError.message);
  } else {
    console.log('✅ payment_transactions table exists');
  }

  // 3. Check user_subscriptions table
  console.log('\n📊 3. Checking user_subscriptions table...');
  const { data: subs, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('status, count')
    .limit(5);

  if (subsError) {
    console.log('❌ user_subscriptions table issue:', subsError.message);
  } else {
    console.log('✅ user_subscriptions table exists');
  }

  // 4. Check SubscriptionUpgrade component
  console.log('\n📊 4. Checking SubscriptionUpgrade UI component...');
  const fs = await import('fs');
  const componentExists = fs.existsSync('/home/ekhator1/smartstock-v2/src/components/SubscriptionUpgrade.tsx');
  if (componentExists) {
    console.log('✅ SubscriptionUpgrade.tsx component exists');
  } else {
    console.log('❌ SubscriptionUpgrade.tsx component NOT found');
  }

  // 5. Check webhook function
  console.log('\n📊 5. Checking Paystack webhook function...');
  const webhookExists = fs.existsSync('/home/ekhator1/smartstock-v2/supabase/functions/paystack-webhook/index.ts');
  if (webhookExists) {
    console.log('✅ Webhook function file exists');
  } else {
    console.log('❌ Webhook function NOT found');
  }

  // 6. Check environment variables
  console.log('\n📊 6. Checking environment variables...');
  const fs2 = await import('fs');
  const envContent = fs2.readFileSync('/home/ekhator1/smartstock-v2/.env.local', 'utf8');
  const hasPaystackKey = envContent.includes('VITE_PAYSTACK_PUBLIC_KEY');

  if (hasPaystackKey) {
    console.log('✅ VITE_PAYSTACK_PUBLIC_KEY configured in .env.local');
  } else {
    console.log('❌ VITE_PAYSTACK_PUBLIC_KEY NOT configured');
  }

  // Summary
  console.log('\n\n━'.repeat(80));
  console.log('📋 DEPLOYMENT CHECKLIST:');
  console.log('━'.repeat(80));
  console.log(`${tiers && tiers.length > 0 ? '✅' : '❌'} subscription_tiers table exists`);
  console.log(`${tiers && tiers[0]?.paystack_plan_code_monthly ? '✅' : '❌'} Paystack plan codes configured`);
  console.log(`${transactions !== undefined ? '✅' : '❌'} payment_transactions table exists`);
  console.log(`${componentExists ? '✅' : '❌'} SubscriptionUpgrade UI component`);
  console.log(`${webhookExists ? '✅' : '❌'} Webhook function file`);
  console.log(`${hasPaystackKey ? '✅' : '❌'} Environment variables configured`);
  console.log('❌ Webhook deployed to Supabase (needs deployment)');
  console.log('❌ Webhook URL configured in Paystack Dashboard (manual step)');
  console.log('❌ Plans created in Paystack Dashboard (manual step)');
  console.log('\n');
}

checkPaystackStatus().catch(console.error);
