/**
 * Check products for the specific store
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkProducts() {
  const userId = 'dffba89b-869d-422a-a542-2e2494850b44'; // paulglobal user ID

  console.log('🔍 Checking products for user:', userId);

  // Try to fetch products
  const { data, error, count } = await supabase
    .from('products')
    .select('id, name, is_public, is_active, quantity, image_url', { count: 'exact' })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`\n✅ Found ${count} total products\n`);

  if (data && data.length > 0) {
    const publicProducts = data.filter(p => p.is_public && p.is_active && p.quantity > 0);
    const withImages = publicProducts.filter(p => p.image_url);

    console.log('📊 Product breakdown:');
    console.log(`   - Total: ${count}`);
    console.log(`   - Public + Active + In Stock: ${publicProducts.length}`);
    console.log(`   - With images: ${withImages.length}\n`);

    if (publicProducts.length > 0) {
      console.log('Public products:');
      publicProducts.slice(0, 5).forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Image: ${p.image_url ? '✅ Yes' : '❌ No'}`);
        console.log(`   Quantity: ${p.quantity}`);
        console.log();
      });

      if (withImages.length > 0) {
        const testProduct = withImages[0];
        console.log('🧪 Test product URL:');
        console.log(`https://www.storehouse.ng/store/paul-pahhggygggffffg?product=${testProduct.id}\n`);
      }
    }
  } else {
    console.log('⚠️  No products found for this store');
  }
}

checkProducts().catch(console.error);
