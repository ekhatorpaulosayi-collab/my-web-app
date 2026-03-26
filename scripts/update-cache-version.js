#!/usr/bin/env node

/**
 * Auto-update service worker cache version on build
 * This ensures users always get the latest version
 */

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Read the service worker file
let swContent = fs.readFileSync(swPath, 'utf8');

// Update the BUILD_TIMESTAMP line with current timestamp
swContent = swContent.replace(
  /const BUILD_TIMESTAMP = '.*';/,
  `const BUILD_TIMESTAMP = '${timestamp}';`
);

// Write back the updated content
fs.writeFileSync(swPath, swContent);

console.log(`✅ Service Worker cache version updated to: ${timestamp}`);
console.log('   Users will automatically get the latest version!');