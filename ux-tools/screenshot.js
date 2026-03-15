#!/usr/bin/env node
/**
 * Quick Screenshot Tool
 * Usage: npm run screenshot [url] [name] [options]
 * Example: npm run screenshot http://localhost:4000 dashboard --mobile
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:4000';
const name = args[1] || 'screenshot';
const isMobile = args.includes('--mobile');
const isTablet = args.includes('--tablet');
const isFullPage = !args.includes('--viewport-only');

const viewports = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

const viewport = isMobile ? viewports.mobile : isTablet ? viewports.tablet : viewports.desktop;

(async () => {
  console.log(`📸 Taking screenshot of ${url}...`);
  console.log(`   📐 Viewport: ${viewport.width}x${viewport.height}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle2' });

  const screenshotDir = './ux-analysis/screenshots';
  fs.mkdirSync(screenshotDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(screenshotDir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: isFullPage
  });

  await browser.close();

  console.log(`✅ Screenshot saved: ${filepath}`);
})();
