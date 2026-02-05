import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProduct() {
  const productId = '9bba9b39-bd75-44c5-9238-21bb61ac6e87';

  console.log('\n=== Checking Products Table ===');
  const { data: product, error: prodError } = await supabase
    .from('products')
    .select('id, name, image_url, image_thumbnail')
    .eq('id', productId)
    .single();

  if (prodError) {
    console.error('Error fetching product:', prodError);
  } else {
    console.log('Product:', product);
  }

  console.log('\n=== Checking Product Images Table ===');
  const { data: images, error: imgError } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position');

  if (imgError) {
    console.error('Error fetching images:', imgError);
  } else {
    console.log('Images count:', images?.length);
    images?.forEach((img, i) => {
      console.log(`Image ${i + 1}:`, {
        url: img.image_url,
        position: img.position,
        isPrimary: img.is_primary
      });
    });
  }
}

checkProduct().then(() => process.exit(0));
