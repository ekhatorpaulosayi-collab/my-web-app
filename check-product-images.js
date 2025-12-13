/**
 * Check product images in database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Check .env.local file has:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductImages() {
  console.log('\n🔍 Checking product images in database...\n');

  try {
    // Get ALL products with their image fields (no limit)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, image_thumbnail')
      .order('created_at', { ascending: false }); // Most recent first

    if (error) {
      console.error('❌ Error querying products:', error.message);
      return;
    }

    console.log(`Found ${products.length} products:\n`);

    products.forEach((product, index) => {
      const hasImage = product.image_url || product.image_thumbnail;
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   image_url: ${product.image_url || '❌ NULL'}`);
      console.log(`   image_thumbnail: ${product.image_thumbnail || '❌ NULL'}`);
      console.log(`   Status: ${hasImage ? '✅ HAS IMAGE' : '❌ NO IMAGE'}\n`);
    });

    const productsWithImages = products.filter(p => p.image_url || p.image_thumbnail);
    const productsWithoutImages = products.filter(p => !p.image_url && !p.image_thumbnail);

    console.log(`\n📊 Summary:`);
    console.log(`   Total products checked: ${products.length}`);
    console.log(`   With images: ${productsWithImages.length}`);
    console.log(`   Without images: ${productsWithoutImages.length}\n`);

    if (productsWithoutImages.length === products.length) {
      console.log('⚠️  ALL PRODUCTS ARE MISSING IMAGES!\n');
      console.log('💡 SOLUTION: Upload images to your products:');
      console.log('   1. Go to localhost:4000/dashboard');
      console.log('   2. Click "Products" in the sidebar');
      console.log('   3. Click a product to edit it');
      console.log('   4. Click "Upload Image" and select an image');
      console.log('   5. Save the product\n');
    } else if (productsWithImages.length > 0) {
      console.log('✅ Some products have images uploaded!');
      console.log('   ImageKit should work for these products.\n');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkProductImages();
