// Create Paystack subscription plans via API
const PAYSTACK_SECRET_KEY = 'sk_test_7387309060a256c0161a585bd447bc8929cd9081';

const plans = [
  {
    name: 'Starter Monthly',
    amount: 500000, // ₦5,000 in kobo
    interval: 'monthly',
    description: '200 products, 3 images per product, 500 AI chats'
  },
  {
    name: 'Starter Annual',
    amount: 4800000, // ₦48,000 in kobo
    interval: 'annually',
    description: '200 products, 3 images per product, 500 AI chats (Save 20%!)'
  },
  {
    name: 'Pro Monthly',
    amount: 1000000, // ₦10,000 in kobo
    interval: 'monthly',
    description: '1000 products, 10 images per product, 1500 AI chats'
  },
  {
    name: 'Pro Annual',
    amount: 9600000, // ₦96,000 in kobo
    interval: 'annually',
    description: '1000 products, 10 images per product, 1500 AI chats (Save 20%!)'
  },
  {
    name: 'Business Monthly',
    amount: 1500000, // ₦15,000 in kobo
    interval: 'monthly',
    description: 'Unlimited products, 20 images per product, 10000 AI chats'
  },
  {
    name: 'Business Annual',
    amount: 14400000, // ₦144,000 in kobo
    interval: 'annually',
    description: 'Unlimited products, 20 images per product, 10000 AI chats (Save 20%!)'
  }
];

async function createPlans() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 CREATING PAYSTACK SUBSCRIPTION PLANS VIA API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const createdPlans = [];

  for (const plan of plans) {
    console.log(`📦 Creating: ${plan.name}...`);
    console.log(`   Amount: ₦${(plan.amount / 100).toLocaleString()}`);
    console.log(`   Interval: ${plan.interval}`);

    try {
      const response = await fetch('https://api.paystack.co/plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: plan.name,
          amount: plan.amount,
          interval: plan.interval,
          description: plan.description,
          currency: 'NGN'
        })
      });

      const result = await response.json();

      if (result.status && result.data) {
        console.log(`   ✅ Created! Plan Code: ${result.data.plan_code}`);
        createdPlans.push({
          name: plan.name,
          plan_code: result.data.plan_code,
          amount: plan.amount,
          interval: plan.interval
        });
      } else {
        console.log(`   ❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SUMMARY - PLAN CODES TO USE IN save-plan-codes.js:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const planCodeMapping = {
    starter_monthly: null,
    starter_annual: null,
    pro_monthly: null,
    pro_annual: null,
    business_monthly: null,
    business_annual: null
  };

  createdPlans.forEach(plan => {
    console.log(`${plan.name}: ${plan.plan_code}`);

    // Map to save-plan-codes.js format
    if (plan.name === 'Starter Monthly') planCodeMapping.starter_monthly = plan.plan_code;
    if (plan.name === 'Starter Annual') planCodeMapping.starter_annual = plan.plan_code;
    if (plan.name === 'Pro Monthly') planCodeMapping.pro_monthly = plan.plan_code;
    if (plan.name === 'Pro Annual') planCodeMapping.pro_annual = plan.plan_code;
    if (plan.name === 'Business Monthly') planCodeMapping.business_monthly = plan.plan_code;
    if (plan.name === 'Business Annual') planCodeMapping.business_annual = plan.plan_code;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 COPY THIS TO save-plan-codes.js:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('const PLAN_CODES = {');
  console.log(`  starter_monthly: '${planCodeMapping.starter_monthly}',`);
  console.log(`  starter_annual: '${planCodeMapping.starter_annual}',`);
  console.log(`  pro_monthly: '${planCodeMapping.pro_monthly}',`);
  console.log(`  pro_annual: '${planCodeMapping.pro_annual}',`);
  console.log(`  business_monthly: '${planCodeMapping.business_monthly}',`);
  console.log(`  business_annual: '${planCodeMapping.business_annual}',`);
  console.log('};\n');

  console.log('🎉 Done! Now run: node save-plan-codes.js\n');
}

createPlans().catch(console.error);
