/**
 * Test product sharing URL generation
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ'
);

async function testProductShare() {
  console.log('\n📦 Testing Product Share URLs...\n');

  // Get a store with slug
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, user_id, business_name, store_slug')
    .eq('store_slug', 'paulglobal22')
    .single();

  if (storeError || !store) {
    console.error('❌ Error fetching store:', storeError);
    return;
  }

  console.log(`✅ Found store: ${store.business_name}`);
  console.log(`   Slug: ${store.store_slug}\n`);

  // Get products for this store
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, selling_price, image_url, is_public')
    .eq('user_id', store.user_id)
    .limit(3);

  if (productsError || !products || products.length === 0) {
    console.error('❌ No products found for this store');
    return;
  }

  console.log(`Found ${products.length} products:\n`);

  products.forEach((product, i) => {
    const productUrl = `https://smartstock-v2-dhe2wcqvg-pauls-projects-cfe953d7.vercel.app/store/${store.store_slug}?product=${product.id}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;

    console.log(`${i + 1}. ${product.name}`);
    console.log(`   Price: ₦${(product.selling_price / 100).toLocaleString()}`);
    console.log(`   Is Public: ${product.is_public ? '✅' : '❌'}`);
    console.log(`   Has Image: ${product.image_url ? '✅' : '❌'}`);
    console.log(`   Product URL: ${productUrl}`);
    console.log(`   Facebook Share: ${facebookShareUrl}`);
    console.log('');
  });

  // Test Open Graph fetch
  const testProduct = products[0];
  const testUrl = `https://smartstock-v2-dhe2wcqvg-pauls-projects-cfe953d7.vercel.app/store/${store.store_slug}?product=${testProduct.id}`;

  console.log(`\n🧪 Testing Open Graph for: ${testProduct.name}`);
  console.log(`   URL: ${testUrl}\n`);

  console.log('📋 Next Steps:');
  console.log('1. Copy the Product URL above');
  console.log('2. Go to: https://developers.facebook.com/tools/debug/');
  console.log('3. Paste the URL and click "Debug"');
  console.log('4. Check if product image and details show up\n');
}

testProductShare();
