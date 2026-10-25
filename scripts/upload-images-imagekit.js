/**
 * Upload Landing Page Images to ImageKit
 *
 * This script automatically uploads all landing page images to ImageKit
 * using the ImageKit Upload API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ImageKit credentials from .env
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
if (!IMAGEKIT_PRIVATE_KEY) {
  console.error('Set IMAGEKIT_PRIVATE_KEY (ImageKit dashboard → Developer options).');
  process.exit(1);
}
const IMAGEKIT_PUBLIC_KEY = 'public_QdLLjPTKH/+dRHxXqo0lSiOs310=';
const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/onelove431212341234';

// Images to upload
const IMAGES_TO_UPLOAD = [
  'landing-young-professional.png',
  'landing-elderly-woman.png',
  'landing-spice-shop.png',
  'landing-business-ecosystem.png',
  'ai-chatbot-store.png',
  'works-24-7.png',
  'whatsapp-ready.png',
  'any-device.png',
  'storehouse-logo-new.png',
];

async function uploadToImageKit(filePath, fileName) {
  try {
    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString('base64');

    // Create form data
    const formData = new FormData();
    formData.append('file', base64File);
    formData.append('fileName', fileName);
    formData.append('useUniqueFileName', 'false'); // Keep original names

    // Upload to ImageKit
    const authString = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ Uploaded: ${fileName}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Size: ${(fileBuffer.length / 1024).toFixed(2)} KB → Optimized by ImageKit`);
      return result;
    } else {
      console.error(`❌ Failed to upload ${fileName}:`, result);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Uploading Landing Page Images to ImageKit...\n');

  const publicDir = path.join(__dirname, '../public');
  let successCount = 0;
  let totalSize = 0;

  for (const imageName of IMAGES_TO_UPLOAD) {
    const imagePath = path.join(publicDir, imageName);

    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  Skipping ${imageName} (not found)`);
      continue;
    }

    const stats = fs.statSync(imagePath);
    totalSize += stats.size;

    await uploadToImageKit(imagePath, imageName);
    successCount++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Uploaded: ${successCount}/${IMAGES_TO_UPLOAD.length} images`);
  console.log(`   📦 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   🎯 Expected optimized size: ~${(totalSize / 1024 / 1024 / 10).toFixed(2)} MB (90% reduction)`);
  console.log(`\n✨ All images are now available at:`);
  console.log(`   ${IMAGEKIT_URL_ENDPOINT}/[filename]`);
}

main().catch(console.error);
