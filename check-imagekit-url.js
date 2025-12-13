/**
 * Quick test: Check if ImageKit URL generation is working
 */

const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/onelove431212341234';

// Example image URL from iPhone 16 product
const exampleSupabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/products/dffba89b-869d-422a-a542-2e2494850b44/temp/image-1765633443864.jpg';

// Extract storage path (what getImageKitUrl() does)
const urlObj = new URL(exampleSupabaseUrl);
const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);

if (pathMatch) {
  const storagePath = pathMatch[1];
  console.log('✅ Storage path extracted:', storagePath);

  // Build ImageKit URL with transformations (what OptimizedImage does)
  const transformations = ['w-1200', 'q-85', 'f-auto'];
  const transformString = `/tr:${transformations.join(',')}`;
  const imagekitUrl = `${IMAGEKIT_URL_ENDPOINT}${transformString}/${storagePath}`;

  console.log('\n📸 EXPECTED IMAGEKIT URL:');
  console.log(imagekitUrl);
  console.log('\n🔍 CHECK THIS IN YOUR BROWSER:');
  console.log('1. Go to your storefront (localhost:4000 or storehouse.ng)');
  console.log('2. Right-click the iPhone 16 product image');
  console.log('3. Select "Inspect" or "Inspect Element"');
  console.log('4. Look at the <img> tag in the Elements panel');
  console.log('5. Find the "src" attribute');
  console.log('\n✅ IMAGEKIT IS WORKING if src starts with:');
  console.log('   https://ik.imagekit.io/onelove431212341234/');
  console.log('\n❌ IMAGEKIT IS NOT WORKING if src starts with:');
  console.log('   https://yzlniqwzqlsftxrtapdl.supabase.co/');
  console.log('\n📋 OR EASIER METHOD:');
  console.log('1. Press F12 → Network tab');
  console.log('2. Filter by "Img"');
  console.log('3. Refresh page (Ctrl+R)');
  console.log('4. Look for requests to "ik.imagekit.io"');
  console.log('5. If you see them, ImageKit is working! ✅');
} else {
  console.error('❌ Could not parse URL');
}
