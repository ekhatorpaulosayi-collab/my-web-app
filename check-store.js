import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'public-anon-placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStore() {
  const slug = 'righteous-osabuohien-efionayi-6271ef8e';

  console.log('\n🔍 Checking for store with slug:', slug);
  console.log('━'.repeat(60));

  // Check if store exists
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('store_slug', slug)
    .single();

  if (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log('Error code:', error.code);

    if (error.code === 'PGRST116') {
      console.log('\n💡 Store does NOT exist in database');
      console.log('   This means the store was never created or the slug is wrong');

      // Try to find similar slugs
      console.log('\n🔎 Searching for similar store slugs...');
      const { data: allStores } = await supabase
        .from('stores')
        .select('store_slug, business_name, is_public')
        .ilike('store_slug', '%righteous%')
        .limit(5);

      if (allStores && allStores.length > 0) {
        console.log('\n📋 Found similar stores:');
        allStores.forEach(s => {
          console.log(`   - ${s.store_slug} (${s.business_name}) - Public: ${s.is_public}`);
        });
      } else {
        console.log('   No similar stores found');
      }
    }
  } else {
    console.log('\n✅ Store found!');
    console.log('━'.repeat(60));
    console.log('Store Slug:', data.store_slug);
    console.log('Business Name:', data.business_name);
    console.log('Is Public:', data.is_public);
    console.log('User ID:', data.user_id);
    console.log('Created:', data.created_at);

    if (!data.is_public) {
      console.log('\n⚠️  WARNING: Store is NOT PUBLIC!');
      console.log('   The store exists but is_public = false');
      console.log('   User needs to make it public in settings');
    }

    // Check products for this store
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, is_public')
      .eq('user_id', data.user_id)
      .eq('is_public', true);

    if (prodError) {
      console.log('\n❌ Error fetching products:', prodError.message);
    } else {
      console.log('\nPublic Products:', products?.length || 0);
      if (products && products.length > 0) {
        console.log('Sample products:');
        products.slice(0, 3).forEach(p => {
          console.log(`   - ${p.name}`);
        });
      }
    }
  }

  console.log('\n━'.repeat(60));
}

checkStore().catch(console.error);
