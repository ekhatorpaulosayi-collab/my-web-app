/**
 * Find stores with products
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ'
);

async function findStoresWithProducts() {
  console.log('\n🔍 Finding stores with products...\n');

  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, user_id, business_name, store_slug')
    .not('store_slug', 'is', null)
    .limit(20);

  if (storesError || !stores) {
    console.error('❌ Error:', storesError);
    return;
  }

  for (const store of stores) {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, selling_price, image_url, is_public')
      .eq('user_id', store.user_id)
      .limit(2);

    if (products && products.length > 0) {
      console.log(`✅ Store: ${store.business_name} (${store.store_slug})`);
      console.log(`   Products: ${products.length}`);

      products.forEach(product => {
        const productUrl = `https://smartstock-v2-dhe2wcqvg-pauls-projects-cfe953d7.vercel.app/store/${store.store_slug}?product=${product.id}`;
        console.log(`\n   📦 ${product.name}`);
        console.log(`      Price: ₦${(product.selling_price / 100).toLocaleString()}`);
        console.log(`      Public: ${product.is_public ? '✅' : '❌'}`);
        console.log(`      Image: ${product.image_url ? '✅' : '❌'}`);
        console.log(`      URL: ${productUrl}`);
      });
      console.log('\n---\n');
    }
  }
}

findStoresWithProducts();
