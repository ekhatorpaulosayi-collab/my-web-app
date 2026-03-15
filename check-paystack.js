import fetch from 'node-fetch';

const PAYSTACK_SECRET_KEY = 'sk_test_ad02eb951dd6ec3b9e731cbf8c005e0e8e7fe85f';

async function checkPaystackSubscriptions() {
  console.log('\n📋 Fetching all Paystack subscriptions...\n');

  try {
    // Get all subscriptions
    const response = await fetch('https://api.paystack.co/subscription?perPage=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('Failed to fetch subscriptions:', data);
      return;
    }

    console.log(`Found ${data.data.length} total subscriptions\n`);

    // Filter for test user's subscriptions
    const testUserEmail = 'ijeek69@gmail.com';
    const userSubs = data.data.filter(sub =>
      sub.customer.email.toLowerCase() === testUserEmail.toLowerCase()
    );

    console.log(`📧 Subscriptions for ${testUserEmail}:`);
    console.log('=' .repeat(60));

    if (userSubs.length === 0) {
      console.log('No subscriptions found for this user');
    } else {
      userSubs.forEach((sub, index) => {
        console.log(`\n${index + 1}. Subscription Code: ${sub.subscription_code}`);
        console.log(`   Plan: ${sub.plan.name} (${sub.plan.plan_code})`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Created: ${new Date(sub.createdAt).toLocaleString()}`);
        console.log(`   Updated: ${sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : 'Never'}`);
        console.log(`   Next Payment: ${sub.next_payment_date ? new Date(sub.next_payment_date).toLocaleString() : 'N/A'}`);
        console.log(`   Amount: ₦${sub.plan.amount / 100}`);
        console.log(`   Email Token: ${sub.email_token || 'N/A'}`);
      });
    }

    // Check recent transactions too
    console.log('\n\n📝 Recent Transactions for user:');
    console.log('=' .repeat(60));

    const txResponse = await fetch(`https://api.paystack.co/transaction?perPage=50&customer=${testUserEmail}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const txData = await txResponse.json();

    if (txResponse.ok && txData.status && txData.data.length > 0) {
      // Show last 5 transactions
      const recentTx = txData.data.slice(0, 5);

      recentTx.forEach((tx, index) => {
        console.log(`\n${index + 1}. Reference: ${tx.reference}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Amount: ₦${tx.amount / 100}`);
        console.log(`   Date: ${new Date(tx.paid_at || tx.created_at).toLocaleString()}`);
        console.log(`   Channel: ${tx.channel}`);
        console.log(`   Message: ${tx.gateway_response || tx.message || 'N/A'}`);

        // Check for plan info in metadata
        if (tx.metadata) {
          if (tx.metadata.plan_code) {
            console.log(`   Plan Code: ${tx.metadata.plan_code}`);
          }
          if (tx.metadata.custom_fields) {
            console.log(`   Custom Fields:`, tx.metadata.custom_fields);
          }
        }
      });
    } else {
      console.log('No transactions found for this user');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPaystackSubscriptions();