/**
 * Check product image URLs to find file paths issue
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductImageURLs() {
  console.log('\n🔍 Checking product image URLs for file paths...\\n');

  try {
    // Get products with their image URLs
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, image_thumbnail, selling_price, description')
      .order('created_at', { ascending: false })
      .limit(20); // Check last 20 products

    if (error) {
      console.error('❌ Error querying products:', error.message);
      return;
    }

    console.log(`Found ${products.length} recent products:\\n`);

    let problemCount = 0;

    products.forEach((product, index) => {
      const hasFilePath =
        (product.image_url && product.image_url.includes('C:\\Users')) ||
        (product.image_thumbnail && product.image_thumbnail.includes('C:\\Users')) ||
        (product.description && product.description.includes('C:\\Users'));

      if (hasFilePath) {
        console.log(`❌ PROBLEM FOUND - Product #${index + 1}:`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Name: ${product.name}`);
        console.log(`   image_url: ${product.image_url || 'NULL'}`);
        console.log(`   image_thumbnail: ${product.image_thumbnail || 'NULL'}`);
        console.log(`   description: ${product.description ? product.description.substring(0, 100) : 'NULL'}`);
        console.log(`   selling_price: ${product.selling_price}\\n`);
        problemCount++;
      }
    });

    if (problemCount === 0) {
      console.log('✅ No file paths found in recent products!');
      console.log('The issue might be in older products or somewhere else.\\n');
    } else {
      console.log(`\\n⚠️  TOTAL PROBLEMS: ${problemCount} products have Windows file paths\\n`);
      console.log('💡 SOLUTION: These file paths need to be replaced with actual Supabase Storage URLs');
      console.log('   The images were likely uploaded from local file selection but the URLs were not updated.\\n');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkProductImageURLs();
