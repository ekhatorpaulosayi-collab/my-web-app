/**
 * Script to convert SVG icons to PNG format
 * Run with: node scripts/generate-icon-pngs.js
 *
 * Requires: sharp package (npm install sharp)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Note: This script requires the 'sharp' package to be installed
// Install with: npm install --save-dev sharp
// If sharp is not available, the SVG files can be used directly in the app
// or converted using online tools like https://cloudconvert.com/svg-to-png

const icons = [
  { name: 'settings-icon', sizes: [512, 256, 128, 64, 32] },
  { name: 'calculator-icon', sizes: [512, 256, 128, 64, 32] }
];

async function generatePNGs() {
  try {
    // Try to import sharp
    const sharp = await import('sharp');

    console.log('🎨 Generating PNG icons...\n');

    for (const icon of icons) {
      const svgPath = join(iconsDir, `${icon.name}.svg`);
      const svgBuffer = readFileSync(svgPath);

      for (const size of icon.sizes) {
        const outputPath = join(iconsDir, `${icon.name}-${size}.png`);

        await sharp.default(svgBuffer)
          .resize(size, size)
          .png({ quality: 100 })
          .toFile(outputPath);

        console.log(`✓ Generated: ${icon.name}-${size}.png`);
      }
    }

    console.log('\n✅ All PNG icons generated successfully!');
    console.log(`📁 Location: ${iconsDir}`);

  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('⚠️  Sharp package not found.');
      console.log('\n📝 To generate PNGs, you can:');
      console.log('   1. Install sharp: npm install --save-dev sharp');
      console.log('   2. Run this script again: node scripts/generate-icon-pngs.js');
      console.log('   3. OR use the SVG files directly (recommended for web apps)');
      console.log('   4. OR convert online at: https://cloudconvert.com/svg-to-png\n');
      console.log('✅ SVG icons are ready to use in: public/icons/');
      process.exit(0);
    } else {
      console.error('❌ Error generating PNGs:', error.message);
      process.exit(1);
    }
  }
}

generatePNGs();
