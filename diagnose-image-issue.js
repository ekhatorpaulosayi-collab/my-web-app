/**
 * Diagnose Image Display Issue
 *
 * This script checks for the problem where the last uploaded image
 * stops displaying after an hour or two.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 DIAGNOSING IMAGE DISPLAY ISSUE\n');
  console.log('='.repeat(60));

  // 1. Check storage buckets
  console.log('\n📦 Step 1: Checking Storage Buckets...\n');

  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('❌ Error fetching buckets:', bucketsError);
    return;
  }

  console.log('Buckets found:');
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
  });

  // 2. Check products bucket specifically
  const productsBucket = buckets.find(b => b.name === 'products');
  if (!productsBucket) {
    console.error('\n❌ PROBLEM: "products" bucket not found!');
    console.log('   Fix: Run supabase-storage-setup.sql in Supabase SQL Editor');
    return;
  }

  if (!productsBucket.public) {
    console.error('\n❌ PROBLEM: "products" bucket is PRIVATE!');
    console.log('   Fix: Make bucket public in Supabase dashboard');
  } else {
    console.log('\n✅ Products bucket is PUBLIC');
  }

  // 3. Check recent product images in database
  console.log('\n📸 Step 2: Checking Recent Product Images in Database...\n');

  const { data: recentImages, error: imagesError } = await supabase
    .from('product_images')
    .select('id, product_id, image_url, position, is_primary, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (imagesError) {
    console.error('❌ Error fetching images:', imagesError);
    return;
  }

  console.log(`Found ${recentImages.length} recent images:\n`);

  for (const img of recentImages) {
    const age = Math.floor((Date.now() - new Date(img.created_at).getTime()) / 1000 / 60);
    console.log(`${img.is_primary ? '⭐' : '  '} Image ${img.id.substring(0, 8)}...`);
    console.log(`   Product: ${img.product_id.substring(0, 8)}...`);
    console.log(`   Position: ${img.position}`);
    console.log(`   Age: ${age} minutes ago`);
    console.log(`   URL: ${img.image_url}`);

    // Test if URL is accessible
    try {
      const response = await fetch(img.image_url, { method: 'HEAD' });
      if (response.ok) {
        console.log(`   Status: ✅ ACCESSIBLE (${response.status})`);
      } else {
        console.log(`   Status: ❌ NOT ACCESSIBLE (${response.status})`);
        console.log(`   Error: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   Status: ❌ FAILED TO FETCH`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }

  // 4. Check storage files
  console.log('\n📂 Step 3: Checking Actual Files in Storage...\n');

  const { data: files, error: filesError } = await supabase
    .storage
    .from('products')
    .list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (filesError) {
    console.error('❌ Error listing files:', filesError);
  } else {
    console.log(`Found ${files.length} files in storage`);

    if (files.length === 0) {
      console.warn('\n⚠️  WARNING: No files found in storage!');
      console.log('   This means images are in database but not in storage.');
    }
  }

  // 5. Check for orphaned database entries
  console.log('\n🔗 Step 4: Checking for Orphaned Database Entries...\n');

  let orphanedCount = 0;

  for (const img of recentImages) {
    // Extract path from URL
    const url = new URL(img.image_url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/products\/(.+)/);

    if (!pathMatch) {
      console.log(`❌ Image ${img.id.substring(0, 8)}: Invalid URL format`);
      orphanedCount++;
      continue;
    }

    const filePath = pathMatch[1];

    // Check if file exists in storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('products')
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (fileError || !fileData || fileData.length === 0) {
      console.log(`❌ Image ${img.id.substring(0, 8)}: File missing in storage (${filePath})`);
      orphanedCount++;
    }
  }

  if (orphanedCount > 0) {
    console.log(`\n⚠️  Found ${orphanedCount} orphaned database entries (no matching storage file)`);
  } else {
    console.log('\n✅ All database entries have matching storage files');
  }

  // 6. Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log('POTENTIAL ISSUES FOUND:\n');

  if (!productsBucket) {
    console.log('❌ Products storage bucket does not exist');
    console.log('   → Run: supabase-storage-setup.sql\n');
  }

  if (productsBucket && !productsBucket.public) {
    console.log('❌ Products bucket is private (should be public)');
    console.log('   → Fix in Supabase Dashboard → Storage → products → Make Public\n');
  }

  if (orphanedCount > 0) {
    console.log(`❌ ${orphanedCount} images in database but files missing from storage`);
    console.log('   → This is the likely cause of disappearing images\n');
  }

  console.log('\nMOST LIKELY CAUSE:');
  console.log('The images are being uploaded to Supabase Storage initially,');
  console.log('but the storage bucket may have:');
  console.log('  1. File lifecycle policies deleting old files');
  console.log('  2. Incorrect RLS policies blocking public access');
  console.log('  3. Storage quota issues causing file deletion\n');

  console.log('RECOMMENDED FIX:');
  console.log('Run this in Supabase SQL Editor to check RLS policies:');
  console.log('');
  console.log('SELECT * FROM storage.objects WHERE bucket_id = \'products\' LIMIT 10;');
  console.log('');
}

diagnose().catch(console.error);
