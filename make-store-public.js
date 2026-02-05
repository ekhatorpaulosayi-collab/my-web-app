import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeStorePublic() {
  const slug = 'righteous-osabuohien-efionayi-6271ef8e';

  console.log('\n🔧 Making store public...');
  console.log('Store slug:', slug);
  console.log('━'.repeat(60));

  // Update store to make it public
  const { data, error } = await supabase
    .from('stores')
    .update({ is_public: true })
    .eq('store_slug', slug)
    .select();

  if (error) {
    console.log('\n❌ ERROR:', error.message);
  } else {
    console.log('\n✅ Store is now PUBLIC!');
    console.log('━'.repeat(60));
    console.log('Store can now be accessed at:');
    console.log(`https://www.storehouse.ng/store/${slug}`);
    console.log('\nStore details:');
    console.log('  Business Name:', data[0].business_name);
    console.log('  Is Public:', data[0].is_public);
    console.log('  Updated:', new Date(data[0].updated_at).toLocaleString());
  }

  console.log('\n━'.repeat(60));
  console.log('\n⚠️  IMPORTANT: The user also needs to make their PRODUCTS public!');
  console.log('Checking products...\n');

  // Check how many products this user has
  const userId = '6271ef8e-61df-4f7e-8c89-31f2041fa474';

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, is_public')
    .eq('user_id', userId);

  if (prodError) {
    console.log('❌ Error fetching products:', prodError.message);
  } else {
    console.log(`Total products: ${products.length}`);
    const publicProducts = products.filter(p => p.is_public);
    const privateProducts = products.filter(p => !p.is_public);

    console.log(`Public products: ${publicProducts.length}`);
    console.log(`Private products: ${privateProducts.length}`);

    if (privateProducts.length > 0) {
      console.log('\n⚠️  Found', privateProducts.length, 'private products!');
      console.log('These products will NOT show on the store.\n');
      console.log('Do you want to make ALL products public? (y/n)');

      // Auto-answer yes for now
      console.log('Making all products public...');

      const { data: updatedProducts, error: updateError } = await supabase
        .from('products')
        .update({ is_public: true })
        .eq('user_id', userId)
        .eq('is_public', false)
        .select('id, name');

      if (updateError) {
        console.log('❌ Error making products public:', updateError.message);
      } else {
        console.log(`\n✅ Made ${updatedProducts.length} products public!`);
        console.log('\nProducts now visible:');
        updatedProducts.slice(0, 5).forEach(p => {
          console.log(`  - ${p.name}`);
        });

        if (updatedProducts.length > 5) {
          console.log(`  ... and ${updatedProducts.length - 5} more`);
        }
      }
    } else {
      console.log('\n✅ All products are already public!');
    }
  }

  console.log('\n━'.repeat(60));
  console.log('\n🎉 DONE! Store is now live at:');
  console.log(`   https://www.storehouse.ng/store/${slug}`);
  console.log('\n');
}

makeStorePublic().catch(console.error);
