const paystackSecretKey = 'sk_test_7387309060a256c0161a585bd447bc8929cd9081';
const subscriptionCode = 'SUB_on7cf5llwagv00j';

console.log('\n🧪 Testing subscription cancellation...\n');

try {
  // Step 1: Get subscription to get email token
  console.log('1️⃣ Getting subscription details...');
  const getResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const getData = await getResponse.json();

  if (!getResponse.ok || !getData.status) {
    console.log('❌ Failed to get subscription:', getData.message);
    process.exit(1);
  }

  const emailToken = getData.data.email_token;
  console.log('✅ Got email token:', emailToken);
  console.log('   Status:', getData.data.status);

  // Step 2: Cancel subscription
  console.log('\n2️⃣ Cancelling subscription...');
  const response = await fetch(`https://api.paystack.co/subscription/disable`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: subscriptionCode,
      token: emailToken
    })
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.log('❌ Cancel failed:', data.message);
    console.log('Full response:', JSON.stringify(data, null, 2));
  } else {
    console.log('✅ SUBSCRIPTION CANCELLED!');
    console.log('   Message:', data.message);
    console.log('\nYou can now subscribe to a different plan.');
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}
