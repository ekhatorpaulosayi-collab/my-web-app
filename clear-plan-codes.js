import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(url, serviceKey);

console.log('\n⚠️  WARNING: This will CLEAR all Paystack plan codes!');
console.log('This is useful for testing when plan codes are invalid.\n');

// Clear all plan codes
const { error } = await supabase
  .from('subscription_tiers')
  .update({
    paystack_plan_code_monthly: null,
    paystack_plan_code_annual: null
  })
  .neq('name', 'Free'); // Don't update Free tier

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ All Paystack plan codes have been cleared!');
  console.log('\n📝 Next steps:');
  console.log('1. Create new subscription plans in your Paystack dashboard');
  console.log('2. Update the database with the new plan codes');
  console.log('3. Or use the create-paystack-plans.js script to create them via API');
}