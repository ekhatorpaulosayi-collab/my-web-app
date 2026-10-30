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

console.log('\n🔍 Checking stores table for user:', userId, '\n');

const { data: stores, error } = await supabase
  .from('stores')
  .select('*')
  .eq('user_id', userId);

if (error) {
  console.log('❌ Error:', error.message);
} else if (stores && stores.length > 0) {
  console.log(`✅ Found ${stores.length} store(s):\n`);
  stores.forEach((store, idx) => {
    console.log(`${idx + 1}. Store: ${store.business_name || 'Unnamed'}`);
    console.log(`   Subscription Tier: ${store.subscription_tier || 'Not set'}`);
    console.log(`   Created: ${new Date(store.created_at).toLocaleString()}`);
    if (store.subscription_tier) {
      console.log(`   ⚠️  This might be old/legacy subscription data`);
    }
  });
} else {
  console.log('No stores found');
}

// Also check if there's a default tier assignment
const { data: allSubs } = await supabase
  .from('user_subscriptions')
  .select('*');

console.log('\n📊 Total subscriptions in database:', allSubs?.length || 0);
