const paystackSecretKey = 'sk_test_7387309060a256c0161a585bd447bc8929cd9081';

console.log('\n🔍 Fetching latest subscriptions from Paystack...\n');

try {
  const response = await fetch('https://api.paystack.co/subscription?perPage=10', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.log('❌ ERROR:', data.message);
  } else {
    console.log(`✅ Latest ${data.data.length} subscriptions:\n`);

    data.data.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.subscription_code}`);
      console.log(`   Customer: ${sub.customer.email}`);
      console.log(`   Plan: ${sub.plan.name} (${sub.plan.plan_code})`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log('');
    });
  }
} catch (error) {
  console.log('❌ FETCH ERROR:', error.message);
}
