/**
 * Test script to verify OG meta tag serverless function
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testOgFunction() {
  console.log('🔍 Finding a real store to test with...\n');

  // Find a real store with products
  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('id, user_id, business_name, store_slug')
    .not('store_slug', 'is', null)
    .eq('is_public', true)
    .limit(5);

  if (storeError || !stores || stores.length === 0) {
    console.error('❌ No stores found:', storeError);
    return;
  }

  console.log(`✅ Found ${stores.length} stores:\n`);
  stores.forEach((store, i) => {
    console.log(`${i + 1}. ${store.business_name} → /store/${store.store_slug}`);
  });

  // Pick first store and find a product
  const testStore = stores[0];
  console.log(`\n🎯 Using store: ${testStore.business_name} (${testStore.store_slug})\n`);

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price')
    .eq('user_id', testStore.user_id)
    .eq('is_public', true)
    .not('image_url', 'is', null)
    .limit(3);

  if (products && products.length > 0) {
    console.log(`✅ Found ${products.length} products with images:\n`);
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ₦${(p.selling_price / 100).toFixed(2)}`);
    });

    const testProduct = products[0];
    console.log(`\n🧪 Test URLs:\n`);
    console.log(`Store page (no product):`);
    console.log(`https://www.storehouse.ng/store/${testStore.store_slug}\n`);
    console.log(`Product page:`);
    console.log(`https://www.storehouse.ng/store/${testStore.store_slug}?product=${testProduct.id}\n`);
    console.log(`📋 To test with Facebook Sharing Debugger:`);
    console.log(`https://developers.facebook.com/tools/debug/\n`);
    console.log(`Paste the product URL above and click "Debug" to see the preview image!\n`);
  } else {
    console.log(`⚠️  No products with images found for this store`);
    console.log(`\n🧪 Test URL (store only):`);
    console.log(`https://www.storehouse.ng/store/${testStore.store_slug}\n`);
  }
}

testOgFunction().catch(console.error);
