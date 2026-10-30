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

async function checkTierFeatures() {
  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('display_order');

  console.log('\n📊 SUBSCRIPTION TIER FEATURES:\n');
  console.log('='.repeat(100));

  tiers?.forEach(tier => {
    console.log(`\n🎯 ${tier.name} TIER:`);
    console.log('─'.repeat(100));
    console.log(`  💰 Price (Monthly): ₦${(tier.price_monthly || 0).toLocaleString()}`);
    console.log(`  💰 Price (Annual): ₦${(tier.price_annual || 0).toLocaleString()}`);
    console.log(`  📦 Max Products: ${tier.max_products === -1 ? 'UNLIMITED' : tier.max_products}`);
    console.log(`  🖼️  Max Images/Product: ${tier.max_images_per_product === -1 ? 'UNLIMITED' : tier.max_images_per_product}`);
    console.log(`  👥 Max Users: ${tier.max_users === -1 ? 'UNLIMITED' : tier.max_users}`);
    console.log(`  🤖 AI Chats/Month: ${tier.max_ai_chats_monthly === -1 ? 'UNLIMITED' : tier.max_ai_chats_monthly}`);
    console.log(`  ✅ Active: ${tier.is_active ? 'YES' : 'NO'}`);
  });

  console.log('\n' + '='.repeat(100) + '\n');
}

checkTierFeatures().catch(console.error);
