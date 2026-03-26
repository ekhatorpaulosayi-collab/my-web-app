#!/usr/bin/env node

/**
 * Auto-update service worker cache version on build
 * This ensures users always get the latest version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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