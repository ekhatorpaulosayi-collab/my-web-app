import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 INSTRUCTIONS:
// After creating your 6 plans in Paystack Dashboard, replace the plan codes below
// with the actual codes Paystack gives you (format: PLN_xxxxxxxxxxxxx)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PLAN_CODES = {
  // Starter tier (₦5,000/month, ₦48,000/year)
  starter_monthly: 'PLN_pgdx0l1zzg7qp11',
  starter_annual: 'PLN_enl3wc4tcfyumon',

  // Pro tier (₦10,000/month, ₦96,000/year)
  pro_monthly: 'PLN_v79xzrcn8pzussc',
  pro_annual: 'PLN_4hkg1x6mftal1wg',

  // Business tier (₦15,000/month, ₦144,000/year)
  business_monthly: 'PLN_ipwarocomb7oh79',
  business_annual: 'PLN_1ctjcsgm1xo1ymc',
};

async function savePlanCodes() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SAVING PAYSTACK PLAN CODES TO DATABASE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate plan codes
  const invalidCodes = Object.entries(PLAN_CODES).filter(([key, code]) =>
    code === 'PLN_xxxxxxxxxxxxxx' || !code.startsWith('PLN_')
  );

  if (invalidCodes.length > 0) {
    console.log('❌ ERROR: Some plan codes are not set correctly!\n');
    console.log('You need to replace these placeholder codes with actual codes from Paystack:\n');
    invalidCodes.forEach(([key, code]) => {
      console.log(`  ❌ ${key}: ${code}`);
    });
    console.log('\n📋 How to get plan codes:');
    console.log('  1. Go to: https://dashboard.paystack.com/#/plans');
    console.log('  2. Create each plan (or view existing plans)');
    console.log('  3. Copy the plan code (format: PLN_xxxxxxxxxxxxx)');
    console.log('  4. Replace the codes in this file');
    console.log('  5. Run this script again\n');
    return;
  }

  console.log('✅ All plan codes look valid! Proceeding...\n');

  // Update Starter tier
  console.log('📦 Updating Starter tier...');
  const { error: starterError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.starter_monthly,
      paystack_plan_code_annual: PLAN_CODES.starter_annual,
    })
    .eq('name', 'Starter');

  if (starterError) {
    console.log('❌ Error updating Starter:', starterError.message);
  } else {
    console.log(`✅ Starter Monthly: ${PLAN_CODES.starter_monthly}`);
    console.log(`✅ Starter Annual: ${PLAN_CODES.starter_annual}`);
  }

  // Update Pro tier
  console.log('\n📦 Updating Pro tier...');
  const { error: proError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.pro_monthly,
      paystack_plan_code_annual: PLAN_CODES.pro_annual,
    })
    .eq('name', 'Pro');

  if (proError) {
    console.log('❌ Error updating Pro:', proError.message);
  } else {
    console.log(`✅ Pro Monthly: ${PLAN_CODES.pro_monthly}`);
    console.log(`✅ Pro Annual: ${PLAN_CODES.pro_annual}`);
  }

  // Update Business tier
  console.log('\n📦 Updating Business tier...');
  const { error: businessError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.business_monthly,
      paystack_plan_code_annual: PLAN_CODES.business_annual,
    })
    .eq('name', 'Business');

  if (businessError) {
    console.log('❌ Error updating Business:', businessError.message);
  } else {
    console.log(`✅ Business Monthly: ${PLAN_CODES.business_monthly}`);
    console.log(`✅ Business Annual: ${PLAN_CODES.business_annual}`);
  }

  // Verify all codes were saved
  console.log('\n📊 Verifying saved plan codes...\n');
  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('name, paystack_plan_code_monthly, paystack_plan_code_annual')
    .in('name', ['Starter', 'Pro', 'Business'])
    .order('display_order');

  console.log('Current Plan Codes in Database:');
  tiers?.forEach(tier => {
    console.log(`\n  ${tier.name}:`);
    console.log(`    Monthly: ${tier.paystack_plan_code_monthly || '❌ Not set'}`);
    console.log(`    Annual:  ${tier.paystack_plan_code_annual || '❌ Not set'}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 PLAN CODES SAVED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Next steps:');
  console.log('  1. Configure webhook URL in Paystack Dashboard');
  console.log('  2. Test payment flow');
  console.log('  3. Check webhook logs for successful payment events\n');
}

savePlanCodes().catch(console.error);
