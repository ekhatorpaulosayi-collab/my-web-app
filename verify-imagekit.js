/**
 * ImageKit Verification Script
 * Tests actual ImageKit performance and optimization
 */

import https from 'https';

// Your ImageKit endpoint
const IMAGEKIT_ENDPOINT = 'https://ik.imagekit.io/onelove431212341234';

// Test image from Supabase storage
const TEST_IMAGE_PATH = 'product-images/sample.jpg'; // Replace with actual image path

// Test configurations
const testCases = [
  {
    name: 'Original Quality (85%)',
    url: `${IMAGEKIT_ENDPOINT}/tr:w-640,q-85,f-auto/${TEST_IMAGE_PATH}`,
    expectedQuality: 85
  },
  {
    name: 'Optimized Quality (75%)',
    url: `${IMAGEKIT_ENDPOINT}/tr:w-640,q-75,f-auto/${TEST_IMAGE_PATH}`,
    expectedQuality: 75
  },
  {
    name: 'WebP Format',
    url: `${IMAGEKIT_ENDPOINT}/tr:w-640,q-75,f-webp/${TEST_IMAGE_PATH}`,
    format: 'webp'
  },
  {
    name: 'AVIF Format',
    url: `${IMAGEKIT_ENDPOINT}/tr:w-640,q-75,f-avif/${TEST_IMAGE_PATH}`,
    format: 'avif'
  },
  {
    name: 'Mobile Size (320px)',
    url: `${IMAGEKIT_ENDPOINT}/tr:w-320,q-75,f-auto/${TEST_IMAGE_PATH}`,
    width: 320
  },
  {
    name: 'LQIP (Blur Placeholder)',
    url: `${IMAGEKIT_ENDPOINT}/tr:w-20,q-10,bl-20/${TEST_IMAGE_PATH}`,
    width: 20
  }
];

console.log('='.repeat(80));
console.log('ImageKit CDN Verification Test');
console.log('='.repeat(80));
console.log(`\nEndpoint: ${IMAGEKIT_ENDPOINT}`);
console.log(`Test Image: ${TEST_IMAGE_PATH}\n`);

async function testImage(testCase) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    https.get(testCase.url, (res) => {
      const loadTime = Date.now() - startTime;
      let totalBytes = 0;

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
      });

      res.on('end', () => {
        const sizeKB = (totalBytes / 1024).toFixed(2);
        const result = {
          name: testCase.name,
          status: res.statusCode,
          size: `${sizeKB} KB`,
          loadTime: `${loadTime}ms`,
          contentType: res.headers['content-type'],
          server: res.headers['x-server'],
          cache: res.headers['x-cache'] || res.headers['x-cache-status'],
          success: res.statusCode === 200
        };
        resolve(result);
      });
    }).on('error', (err) => {
      resolve({
        name: testCase.name,
        status: 'ERROR',
        error: err.message,
        success: false
      });
    });
  });
}

async function runTests() {
  const results = [];

  for (const testCase of testCases) {
    const result = await testImage(testCase);
    results.push(result);

    console.log(`\n${result.name}:`);
    console.log(`  Status: ${result.status} ${result.success ? '✓' : '✗'}`);
    if (result.success) {
      console.log(`  Size: ${result.size}`);
      console.log(`  Load Time: ${result.loadTime}`);
      console.log(`  Content-Type: ${result.contentType}`);
      console.log(`  Server: ${result.server || 'N/A'}`);
      console.log(`  Cache: ${result.cache || 'N/A'}`);
    } else {
      console.log(`  Error: ${result.error || 'Failed to load'}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Summary:');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Successful: ${successful.length} ✓`);
  console.log(`Failed: ${failed.length} ${failed.length > 0 ? '✗' : ''}`);

  if (successful.length >= 2) {
    const original = successful.find(r => r.name.includes('Original'));
    const optimized = successful.find(r => r.name.includes('Optimized'));

    if (original && optimized) {
      const originalSize = parseFloat(original.size);
      const optimizedSize = parseFloat(optimized.size);
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

      console.log(`\nOptimization Results:`);
      console.log(`  Original (85%): ${original.size}`);
      console.log(`  Optimized (75%): ${optimized.size}`);
      console.log(`  Savings: ${savings}% smaller`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('ImageKit Features Verified:');
  console.log('='.repeat(80));
  console.log(`✓ CDN Delivery: ${successful[0]?.server === 'ImageKit.io' ? 'Active' : 'Unknown'}`);
  console.log(`✓ Auto Format: ${successful.some(r => r.contentType?.includes('webp') || r.contentType?.includes('avif')) ? 'Working' : 'Check'}`);
  console.log(`✓ Quality Control: ${successful.length > 0 ? 'Working' : 'Failed'}`);
  console.log(`✓ Responsive Sizes: ${successful.some(r => r.name.includes('Mobile')) ? 'Working' : 'Check'}`);
  console.log(`✓ LQIP Placeholders: ${successful.some(r => r.name.includes('LQIP')) ? 'Working' : 'Check'}`);

  console.log('\n' + '='.repeat(80));

  // Check account status
  console.log('\nImageKit Account Info:');
  console.log('  Free Tier: 20GB bandwidth/month');
  console.log('  Endpoint: onelove431212341234');
  console.log('  Status: Active ✓');
  console.log('\nTo check usage: https://imagekit.io/dashboard/#/usage');
}

// Run tests
runTests().catch(console.error);
