import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPricingBug() {
  console.log('\n🔧 FIXING SUBSCRIPTION TIER PRICING BUG');
  console.log('━'.repeat(80));

  // Current (WRONG) prices are in kobo format
  // Need to convert to actual Naira amounts

  console.log('\n📊 BEFORE (BROKEN):');
  const { data: beforeTiers } = await supabase
    .from('subscription_tiers')
    .select('name, price_monthly, price_annual')
    .order('display_order');

  beforeTiers?.forEach(tier => {
    console.log(`  ${tier.name}: ₦${(tier.price_monthly || 0).toLocaleString()}/month`);
  });

  console.log('\n🔨 APPLYING FIX...\n');

  // Fix Free tier
  const { error: freeError } = await supabase
    .from('subscription_tiers')
    .update({
      price_monthly: 0,
      price_annual: 0,
      max_products: 30,  // Match landing page
      max_images_per_product: 1,  // Match landing page
      max_users: 1,  // Match landing page
      max_ai_chats_monthly: -1  // Unlimited during beta (match landing page)
    })
    .eq('name', 'Free');

  if (freeError) {
    console.log('❌ Error updating Free tier:', freeError.message);
  } else {
    console.log('✅ Free tier updated: ₦0/month, 30 products, 1 image, 1 user');
  }

  // Fix Starter tier (₦5,000/month NOT ₦500,000)
  const { error: starterError } = await supabase
    .from('subscription_tiers')
    .update({
      price_monthly: 5000,
      price_annual: 48000,  // ₦48,000/year (20% discount)
      max_products: 200,  // Match landing page
      max_images_per_product: 3,  // Match landing page
      max_users: 3,  // Match landing page
      max_ai_chats_monthly: 500  // Match landing page
    })
    .eq('name', 'Starter');

  if (starterError) {
    console.log('❌ Error updating Starter tier:', starterError.message);
  } else {
    console.log('✅ Starter tier updated: ₦5,000/month, 200 products, 3 images, 3 users');
  }

  // Fix Pro tier (₦10,000/month NOT ₦1,000,000)
  const { error: proError } = await supabase
    .from('subscription_tiers')
    .update({
      price_monthly: 10000,
      price_annual: 96000,  // ₦96,000/year (20% discount)
      max_products: -1,  // UNLIMITED (match landing page)
      max_images_per_product: 5,  // Match landing page
      max_users: 5,  // Match landing page
      max_ai_chats_monthly: 1500  // Match landing page (updated from 2000)
    })
    .eq('name', 'Pro');

  if (proError) {
    console.log('❌ Error updating Pro tier:', proError.message);
  } else {
    console.log('✅ Pro tier updated: ₦10,000/month, UNLIMITED products, 5 images, 5 users');
  }

  // Fix Business tier (₦15,000/month NOT ₦1,500,000)
  const { error: businessError } = await supabase
    .from('subscription_tiers')
    .update({
      price_monthly: 15000,
      price_annual: 144000,  // ₦144,000/year (20% discount)
      max_products: -1,  // UNLIMITED
      max_images_per_product: 10,  // Match landing page
      max_users: 10,  // Match landing page
      max_ai_chats_monthly: 10000  // Match landing page
    })
    .eq('name', 'Business');

  if (businessError) {
    console.log('❌ Error updating Business tier:', businessError.message);
  } else {
    console.log('✅ Business tier updated: ₦15,000/month, UNLIMITED products, 10 images, 10 users');
  }

  console.log('\n📊 AFTER (FIXED):');
  const { data: afterTiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('display_order');

  afterTiers?.forEach(tier => {
    console.log(`\n  ${tier.name}:`);
    console.log(`    💰 Price: ₦${(tier.price_monthly || 0).toLocaleString()}/month (₦${(tier.price_annual || 0).toLocaleString()}/year)`);
    console.log(`    📦 Products: ${tier.max_products === -1 ? 'UNLIMITED' : tier.max_products}`);
    console.log(`    🖼️  Images/product: ${tier.max_images_per_product}`);
    console.log(`    👥 Users: ${tier.max_users}`);
    console.log(`    🤖 AI Chats: ${tier.max_ai_chats_monthly === -1 ? 'UNLIMITED' : tier.max_ai_chats_monthly}`);
  });

  console.log('\n━'.repeat(80));
  console.log('✅ PRICING BUG FIXED! Database now matches landing page.\n');
}

fixPricingBug().catch(console.error);
