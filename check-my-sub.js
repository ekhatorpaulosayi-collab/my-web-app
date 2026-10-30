function requireAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    console.error("Set SUPABASE_ANON_KEY to your project's anon key from the dashboard.");
    process.exit(1);
  }
  return key;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = requireAnonKey();

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'dffba89b-869d-422a-a542-2e2494850b44';

console.log('\n🔍 Checking subscription for user:', userId, '\n');

const { data: sub, error } = await supabase
  .from('user_subscriptions')
  .select(`
    *,
    subscription_tiers (name, price_monthly, price_annual)
  `)
  .eq('user_id', userId)
  .single();

if (error) {
  console.log('⚠️  No subscription record yet');
  console.log('   This is normal - will be created on first payment');
} else {
  console.log('📊 Current Subscription:');
  console.log('   Tier:', sub.subscription_tiers?.name || 'Unknown');
  console.log('   Status:', sub.status);
  console.log('   Billing:', sub.billing_cycle);
  console.log('   Provider:', sub.payment_provider || 'None');
  console.log('   Reference:', sub.payment_reference || 'None');
}

// Check payment transactions
const { data: txs, error: txError } = await supabase
  .from('payment_transactions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

if (!txError && txs && txs.length > 0) {
  console.log('\n💰 Payment Transactions:', txs.length);
  txs.forEach((tx, i) => {
    console.log(`\n   ${i + 1}. Status: ${tx.status}`);
    console.log(`      Amount: ₦${tx.amount / 100}`);
    console.log(`      Date: ${new Date(tx.created_at).toLocaleString()}`);
  });
} else {
  console.log('\n💰 No payment transactions yet');
}
