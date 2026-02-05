import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSubscriptionPrices() {
  console.log('\n💰 SETTING UP SUBSCRIPTION PRICES');
  console.log('━'.repeat(80));

  // Prices from the setup guide (in kobo)
  const prices = {
    'Starter': {
      monthly: 500000,  // ₦5,000
      annual: 4800000   // ₦48,000 (20% discount)
    },
    'Pro': {
      monthly: 1000000,  // ₦10,000
      annual: 9600000    // ₦96,000 (20% discount)
    },
    'Business': {
      monthly: 1500000,  // ₦15,000
      annual: 14400000   // ₦144,000 (20% discount)
    }
  };

  for (const [tierName, pricing] of Object.entries(prices)) {
    console.log(`\n📦 Updating ${tierName} tier...`);

    const { data, error } = await supabase
      .from('subscription_tiers')
      .update({
        price_monthly: pricing.monthly,
        price_annual: pricing.annual
      })
      .eq('name', tierName)
      .select();

    if (error) {
      console.log(`❌ Error updating ${tierName}:`, error.message);
    } else {
      console.log(`✅ ${tierName} updated:`);
      console.log(`   Monthly: ₦${pricing.monthly / 100}`);
      console.log(`   Annual: ₦${pricing.annual / 100} (saves ₦${(pricing.monthly * 12 - pricing.annual) / 100})`);
    }
  }

  // Verify final state
  console.log('\n\n📊 FINAL SUBSCRIPTION TIERS:');
  console.log('━'.repeat(80));

  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('display_order');

  tiers?.forEach(tier => {
    const monthlyPrice = tier.price_monthly / 100;
    const annualPrice = tier.price_annual / 100;
    const savings = tier.price_monthly > 0 ? ((tier.price_monthly * 12 - tier.price_annual) / 100) : 0;

    console.log(`\n${tier.name}:`);
    console.log(`  Monthly: ₦${monthlyPrice.toLocaleString()}`);
    console.log(`  Annual: ₦${annualPrice.toLocaleString()}${savings > 0 ? ` (save ₦${savings.toLocaleString()}/year)` : ''}`);
    console.log(`  Max Products: ${tier.max_products === -1 ? 'Unlimited' : tier.max_products}`);
    console.log(`  Max Users: ${tier.max_users === -1 ? 'Unlimited' : tier.max_users}`);
  });

  console.log('\n━'.repeat(80));
  console.log('✅ Subscription prices configured!\n');
}

setupSubscriptionPrices().catch(console.error);
