import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

// LIVE Plan codes from Paystack
const PLAN_CODES = {
  starter_monthly: 'PLN_85xj6rv9v9sa44m',
  starter_annual: 'PLN_mspjvbi7f8il8t0',
  pro_monthly: 'PLN_4t7vnf5udb6tjhl',
  pro_annual: 'PLN_9bjhqbcdydy2x0i',
  business_monthly: 'PLN_96f6gwmyh43pvj7',
  business_annual: 'PLN_nifrjlhcrn8yyjd'
};

async function updatePlanCodes() {
  console.log('\n🔄 Updating database with LIVE Paystack plan codes...\n');

  // Update Starter tier
  const { error: starterError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.starter_monthly,
      paystack_plan_code_annual: PLAN_CODES.starter_annual
    })
    .eq('name', 'Starter');

  if (starterError) {
    console.log('❌ Error updating Starter tier:', starterError.message);
  } else {
    console.log('✅ Starter tier updated');
    console.log(`   Monthly: ${PLAN_CODES.starter_monthly}`);
    console.log(`   Annual:  ${PLAN_CODES.starter_annual}`);
  }

  // Update Pro tier
  const { error: proError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.pro_monthly,
      paystack_plan_code_annual: PLAN_CODES.pro_annual
    })
    .eq('name', 'Pro');

  if (proError) {
    console.log('❌ Error updating Pro tier:', proError.message);
  } else {
    console.log('✅ Pro tier updated');
    console.log(`   Monthly: ${PLAN_CODES.pro_monthly}`);
    console.log(`   Annual:  ${PLAN_CODES.pro_annual}`);
  }

  // Update Business tier
  const { error: businessError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.business_monthly,
      paystack_plan_code_annual: PLAN_CODES.business_annual
    })
    .eq('name', 'Business');

  if (businessError) {
    console.log('❌ Error updating Business tier:', businessError.message);
  } else {
    console.log('✅ Business tier updated');
    console.log(`   Monthly: ${PLAN_CODES.business_monthly}`);
    console.log(`   Annual:  ${PLAN_CODES.business_annual}`);
  }

  console.log('\n🎉 All LIVE plan codes have been saved to the database!');
  console.log('✅ Your payment system is now ready for LIVE transactions!');
}

updatePlanCodes();