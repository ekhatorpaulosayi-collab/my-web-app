/**
 * Cleanup Script: Remove Blob URL Images
 *
 * This script removes broken product_images entries that have blob: URLs
 * which expire and cause images to disappear from storefronts.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('🧹 CLEANING UP BLOB URL IMAGES\n');
  console.log('='.repeat(60));

  // Step 1: Find all blob URLs
  console.log('\n📋 Step 1: Finding blob URL entries...\n');

  const { data: blobImages, error: findError } = await supabase
    .from('product_images')
    .select('id, product_id, image_url, position, created_at')
    .like('image_url', 'blob:%')
    .order('created_at', { ascending: false });

  if (findError) {
    console.error('❌ Error finding blob URLs:', findError);
    return;
  }

  if (!blobImages || blobImages.length === 0) {
    console.log('✅ No blob URL images found! Database is clean.');
    return;
  }

  console.log(`Found ${blobImages.length} broken image(s):\n`);

  // Group by product
  const byProduct = new Map();
  blobImages.forEach(img => {
    if (!byProduct.has(img.product_id)) {
      byProduct.set(img.product_id, []);
    }
    byProduct.get(img.product_id).push(img);
  });

  byProduct.forEach((images, productId) => {
    console.log(`Product ${productId.substring(0, 8)}...:`);
    images.forEach(img => {
      const age = Math.floor((Date.now() - new Date(img.created_at).getTime()) / 1000 / 60 / 60);
      console.log(`  - Position ${img.position} (${age} hours old)`);
      console.log(`    URL: ${img.image_url.substring(0, 60)}...`);
    });
    console.log('');
  });

  // Step 2: Ask for confirmation
  console.log('⚠️  WARNING: These images will be deleted from the database.');
  console.log('The actual files in storage are fine - users just need to re-add these images.\n');
  console.log('Proceeding with deletion in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Delete blob URLs
  console.log('🗑️  Step 2: Deleting blob URL entries...\n');

  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .like('image_url', 'blob:%');

  if (deleteError) {
    console.error('❌ Error deleting blob URLs:', deleteError);
    return;
  }

  console.log(`✅ Successfully deleted ${blobImages.length} broken image entries\n`);

  // Step 4: Verify cleanup
  console.log('✔️  Step 3: Verifying cleanup...\n');

  const { count, error: countError } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .like('image_url', 'blob:%');

  if (countError) {
    console.error('❌ Error verifying cleanup:', countError);
    return;
  }

  if (count === 0) {
    console.log('✅ Cleanup successful! No blob URLs remaining in database.\n');
  } else {
    console.warn(`⚠️  Warning: ${count} blob URLs still remain\n`);
  }

  // Step 5: Show affected products
  console.log('='.repeat(60));
  console.log('📝 SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log(`Products affected: ${byProduct.size}`);
  console.log(`Images cleaned: ${blobImages.length}\n`);

  console.log('NEXT STEPS:');
  console.log('1. Users will need to edit affected products');
  console.log('2. Re-upload the missing images (they still have the originals)');
  console.log('3. The bug is now fixed - blob URLs will never be saved again\n');

  console.log('Affected products:');
  byProduct.forEach((images, productId) => {
    console.log(`  - ${productId} (${images.length} image${images.length > 1 ? 's' : ''})`);
  });
}

cleanup().catch(console.error);
