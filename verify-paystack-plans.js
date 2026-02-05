// Verify all Paystack plans are created correctly
const PAYSTACK_SECRET_KEY = 'sk_test_7387309060a256c0161a585bd447bc8929cd9081';

async function verifyPlans() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFYING PAYSTACK SUBSCRIPTION PLANS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch('https://api.paystack.co/plan', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.status && result.data) {
      const plans = result.data;

      console.log(`✅ Found ${plans.length} plan(s) in your Paystack account\n`);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 PLAN DETAILS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      plans.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name}`);
        console.log(`   Plan Code: ${plan.plan_code}`);
        console.log(`   Amount: ₦${(plan.amount / 100).toLocaleString()}`);
        console.log(`   Interval: ${plan.interval}`);
        console.log(`   Currency: ${plan.currency}`);
        console.log(`   Description: ${plan.description || 'None'}`);
        console.log(`   Status: ${plan.is_archived ? '❌ Archived' : '✅ Active'}`);
        console.log('');
      });

      // Check for our expected plans
      const expectedPlans = [
        { name: 'Starter Monthly', amount: 500000, interval: 'monthly' },
        { name: 'Starter Annual', amount: 4800000, interval: 'annually' },
        { name: 'Pro Monthly', amount: 1000000, interval: 'monthly' },
        { name: 'Pro Annual', amount: 9600000, interval: 'annually' },
        { name: 'Business Monthly', amount: 1500000, interval: 'monthly' },
        { name: 'Business Annual', amount: 14400000, interval: 'annually' }
      ];

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ VERIFICATION CHECKLIST:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      let allGood = true;

      expectedPlans.forEach(expected => {
        const found = plans.find(p =>
          p.name === expected.name &&
          p.amount === expected.amount &&
          p.interval === expected.interval
        );

        if (found) {
          console.log(`✅ ${expected.name}: Found (${found.plan_code})`);
        } else {
          console.log(`❌ ${expected.name}: NOT FOUND`);
          allGood = false;
        }
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (allGood) {
        console.log('🎉 SUCCESS! All 6 plans are created correctly!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Next step: Configure webhook URL in Paystack Dashboard');
        console.log('   URL: https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook\n');
      } else {
        console.log('⚠️  Some plans are missing. Review the checklist above.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }

    } else {
      console.log('❌ Error fetching plans:', result.message);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

verifyPlans().catch(console.error);
