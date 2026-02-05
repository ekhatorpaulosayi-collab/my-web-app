import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testImageAccess() {
  const imageUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/products/dffba89b-869d-422a-a542-2e2494850b44/temp/image-1766633919927.jpg';

  console.log('Testing direct image access...');
  console.log('URL:', imageUrl);

  try {
    const response = await fetch(imageUrl);
    console.log('\nResponse status:', response.status);
    console.log('Response headers:');
    console.log('  Content-Type:', response.headers.get('content-type'));
    console.log('  Content-Length:', response.headers.get('content-length'));
    console.log('  Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));

    if (response.ok) {
      console.log('\n✅ Image is publicly accessible!');
    } else {
      console.log('\n❌ Image is NOT accessible. Status:', response.status);
    }
  } catch (error) {
    console.error('\n❌ Error fetching image:', error.message);
  }

  // Also check bucket settings
  console.log('\n=== Checking bucket configuration ===');
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    const productsBucket = buckets.find(b => b.name === 'products');
    if (productsBucket) {
      console.log('Products bucket found:');
      console.log('  Name:', productsBucket.name);
      console.log('  Public:', productsBucket.public);
      console.log('  ID:', productsBucket.id);
    } else {
      console.log('❌ Products bucket not found!');
    }
  }
}

testImageAccess().then(() => process.exit(0));
