const paystackSecretKey = 'sk_test_7387309060a256c0161a585bd447bc8929cd9081';

console.log('\n🔍 Fetching ALL subscriptions from Paystack...\n');

try {
  const response = await fetch('https://api.paystack.co/subscription', {
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
    console.log(`✅ Found ${data.data.length} subscriptions in Paystack\n`);

    // Filter for the test customer email
    const customerSubs = data.data.filter(sub =>
      sub.customer.email === 'ijeek69@gmail.com'
    );

    console.log(`📋 Subscriptions for ijeek69@gmail.com: ${customerSubs.length}\n`);

    customerSubs.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.subscription_code}`);
      console.log(`   Plan: ${sub.plan.name}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log(`   Amount: ₦${sub.amount / 100}`);
      console.log('');
    });
  }
} catch (error) {
  console.log('❌ FETCH ERROR:', error.message);
}
