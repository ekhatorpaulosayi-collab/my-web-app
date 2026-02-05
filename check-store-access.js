/**
 * Check if we can access the store data from the stores table
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStoreAccess() {
  const slug = 'paul-pahhggygggffffg';

  console.log('🔍 Testing access to store:', slug);
  console.log('📍 URL:', process.env.VITE_SUPABASE_URL);
  console.log('🔑 Using ANON key\n');

  // Try to fetch the store
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('store_slug', slug)
    .eq('is_public', true)
    .single();

  if (error) {
    console.error('❌ Error accessing store:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);

    if (error.code === '42501') {
      console.error('\n🔒 PERMISSION DENIED - RLS Policy Issue');
      console.error('   The stores table needs a policy to allow public SELECT.\n');
      console.error('   Fix: Run this SQL in Supabase dashboard:\n');
      console.error('   ALTER TABLE stores ENABLE ROW LEVEL SECURITY;');
      console.error('   CREATE POLICY "Allow public read of public stores"');
      console.error('   ON stores FOR SELECT USING (is_public = true);\n');
    } else if (error.code === 'PGRST116') {
      console.error('\n🔍 NO ROWS FOUND');
      console.error('   The store exists but is not marked as is_public = true\n');
    }

    return;
  }

  console.log('✅ Store data retrieved successfully!\n');
  console.log('Store details:');
  console.log('  - ID:', data.id);
  console.log('  - Business Name:', data.business_name);
  console.log('  - Slug:', data.store_slug);
  console.log('  - Public:', data.is_public);
  console.log('  - User ID:', data.user_id);
  console.log('\n✨ Storefront page should work now!');
}

checkStoreAccess().catch(console.error);
