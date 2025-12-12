/**
 * Diagnostic Script for Supabase Storage
 * Run this to check if your 'products' bucket exists and is properly configured
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please check your .env file has:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorageBuckets() {
  console.log('\n🔍 Checking Supabase Storage buckets...\n');

  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      return;
    }

    console.log(`✅ Found ${buckets.length} bucket(s):\n`);

    buckets.forEach(bucket => {
      console.log(`📦 ${bucket.name}`);
      console.log(`   - Public: ${bucket.public ? '✅ Yes' : '❌ No'}`);
      console.log(`   - ID: ${bucket.id}`);
      console.log(`   - Created: ${new Date(bucket.created_at).toLocaleString()}\n`);
    });

    // Check specifically for 'products' bucket
    const productsBucket = buckets.find(b => b.name === 'products');

    if (!productsBucket) {
      console.error('❌ ISSUE FOUND: The "products" bucket does NOT exist!');
      console.log('\n💡 SOLUTION: Create the "products" bucket in Supabase:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets');
      console.log('   2. Click "New bucket"');
      console.log('   3. Name: products');
      console.log('   4. Public bucket: YES (checked)');
      console.log('   5. Click "Create bucket"\n');
    } else if (!productsBucket.public) {
      console.error('❌ ISSUE FOUND: The "products" bucket exists but is NOT public!');
      console.log('\n💡 SOLUTION: Make the "products" bucket public:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets');
      console.log('   2. Find the "products" bucket');
      console.log('   3. Click the three dots menu (⋮)');
      console.log('   4. Click "Edit bucket"');
      console.log('   5. Check "Public bucket"');
      console.log('   6. Click "Save"\n');
    } else {
      console.log('✅ SUCCESS: The "products" bucket exists and is public!');
      console.log('   Image uploads should work correctly.\n');

      // Test upload to confirm
      console.log('🧪 Testing upload capability...\n');
      await testUpload();
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

async function testUpload() {
  try {
    // Create a tiny test file (1x1 transparent PNG)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const base64Data = testImageData.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');

    const testPath = `test-upload-${Date.now()}.png`;

    const { data, error } = await supabase.storage
      .from('products')
      .upload(testPath, binaryData, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.error('❌ Test upload FAILED:', error.message);
      console.log('\n💡 This confirms image uploads are not working.');
      console.log('   Check the bucket permissions in Supabase Dashboard.\n');
    } else {
      console.log('✅ Test upload SUCCESSFUL!');
      console.log(`   File uploaded to: ${data.path}\n`);

      // Clean up test file
      await supabase.storage.from('products').remove([testPath]);
      console.log('🧹 Test file cleaned up.\n');
      console.log('✅ Your storage is working correctly!');
      console.log('   If images still don\'t upload from the app, check browser console for errors.\n');
    }
  } catch (err) {
    console.error('❌ Test upload error:', err);
  }
}

// Run the check
checkStorageBuckets();
