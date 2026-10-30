/**
 * Find Bassenet product
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'public-anon-placeholder'
);

async function findBassenet() {
  console.log('\n🔍 Finding Bassenet product...\n');

  // Find product by name
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, selling_price, image_url, is_public, user_id')
    .ilike('name', '%bassenet%')
    .limit(5);

  if (error || !products || products.length === 0) {
    console.error('❌ Product not found');
    return;
  }

  for (const product of products) {
    // Get store for this product
    const { data: store } = await supabase
      .from('stores')
      .select('store_slug, business_name')
      .eq('user_id', product.user_id)
      .single();

    if (store && store.store_slug) {
      const productUrl = `https://smartstock-v2-fn9evi3tc-pauls-projects-cfe953d7.vercel.app/store/${store.store_slug}?product=${product.id}`;

      console.log(`✅ Found: ${product.name}`);
      console.log(`   Price: ₦${(product.selling_price / 100).toLocaleString()}`);
      console.log(`   Store: ${store.business_name} (${store.store_slug})`);
      console.log(`   Has Image: ${product.image_url ? '✅ YES' : '❌ NO'}`);
      console.log(`   Is Public: ${product.is_public ? '✅' : '❌'}`);
      console.log(`\n   📋 Product URL:`);
      console.log(`   ${productUrl}`);
      console.log(`\n   🔧 Facebook Debugger:`);
      console.log(`   https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(productUrl)}`);
      console.log('\n---\n');

      if (product.image_url) {
        console.log(`   🖼️  Image URL:`);
        console.log(`   ${product.image_url}`);
        console.log('\n');
      }
    }
  }
}

findBassenet();
