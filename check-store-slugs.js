/**
 * Check store slugs in database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ'
);

async function checkStoresSlugs() {
  console.log('\n📋 Checking stores for slugs...\n');

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, user_id, business_name, store_slug, is_public')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching stores:', error);
    return;
  }

  if (!stores || stores.length === 0) {
    console.log('⚠️  No stores found in database');
    return;
  }

  console.log(`Found ${stores.length} stores:\n`);

  stores.forEach((store, i) => {
    console.log(`${i + 1}. Store: "${store.business_name}"`);
    console.log(`   ID: ${store.id}`);
    console.log(`   User ID: ${store.user_id}`);
    console.log(`   Store Slug: ${store.store_slug || '❌ NOT SET'}`);
    console.log(`   Is Public: ${store.is_public ? '✅' : '❌'}`);

    if (store.store_slug) {
      console.log(`   URL: https://smartstock-v2-dhe2wcqvg-pauls-projects-cfe953d7.vercel.app/store/${store.store_slug}`);
    }
    console.log('');
  });

  // Check which stores have slugs
  const storesWithSlugs = stores.filter(s => s.store_slug);
  const storesWithoutSlugs = stores.filter(s => !s.store_slug);

  console.log(`\n📊 Summary:`);
  console.log(`   Stores with slugs: ${storesWithSlugs.length}`);
  console.log(`   Stores without slugs: ${storesWithoutSlugs.length}`);

  if (storesWithoutSlugs.length > 0) {
    console.log(`\n⚠️  Stores need slugs to enable Facebook sharing with product images!`);
  }
}

checkStoresSlugs();
