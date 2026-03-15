const paystackSecretKey = 'sk_test_7387309060a256c0161a585bd447bc8929cd9081';
const subscriptionCode = 'SUB_on7cf5llwagv00j';

console.log('\n🔍 Checking Paystack subscription:', subscriptionCode, '\n');

try {
  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.log('❌ ERROR:', data.message);
    console.log('Full response:', JSON.stringify(data, null, 2));
  } else {
    console.log('✅ SUBSCRIPTION FOUND IN PAYSTACK:\n');
    console.log('Status:', data.data.status);
    console.log('Plan:', data.data.plan?.name);
    console.log('Amount:', '₦' + (data.data.amount / 100).toLocaleString());
    console.log('Customer:', data.data.customer?.email);
    console.log('Next Payment:', data.data.next_payment_date);
    console.log('Subscription Code:', data.data.subscription_code);
    console.log('Email Token:', data.data.email_token);
    console.log('\nFull data:', JSON.stringify(data.data, null, 2));
  }
} catch (error) {
  console.log('❌ FETCH ERROR:', error.message);
}
