import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'public-anon-placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecent() {
  console.log('\n🔍 Checking recent subscription activity...\n');

  // Check recent user_subscriptions updates
  const { data: subs, error } = await supabase
    .from('user_subscriptions')
    .select(`
      user_id,
      tier_id,
      status,
      billing_cycle,
      payment_provider,
      payment_reference,
      updated_at,
      subscription_tiers (name)
    `)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log(`Found ${subs.length} recent subscriptions:\n`);
    subs.forEach((sub, i) => {
      console.log(`${i + 1}. User: ${sub.user_id}`);
      console.log(`   Tier: ${sub.subscription_tiers?.name || 'Unknown'}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Billing: ${sub.billing_cycle}`);
      console.log(`   Provider: ${sub.payment_provider || 'None'}`);
      console.log(`   Reference: ${sub.payment_reference || 'None'}`);
      console.log(`   Updated: ${new Date(sub.updated_at).toLocaleString()}\n`);
    });
  }
}

checkRecent().catch(console.error);
