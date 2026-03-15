#!/usr/bin/env node
/**
 * Quick UX Test - Fast dashboard health check
 * Usage: npm run quick-test [url]
 */

import puppeteer from 'puppeteer';

const url = process.argv[2] || 'http://localhost:4000';

(async () => {
  console.log('🚀 Running Quick UX Test...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Page Load
  console.log('⏱️  Test 1: Page Load Speed');
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const loadTime = Date.now() - startTime;
  console.log(`   ${loadTime < 3000 ? '✅' : '⚠️'} Loaded in ${loadTime}ms ${loadTime > 3000 ? '(slow)' : ''}`);

  // Test 2: Mobile Responsiveness
  console.log('\n📱 Test 2: Mobile Responsiveness');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 500));
  const hasHScroll = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  console.log(`   ${!hasHScroll ? '✅' : '❌'} ${hasHScroll ? 'Horizontal scroll detected' : 'No horizontal scroll'}`);

  // Test 3: Critical Elements
  console.log('\n🎯 Test 3: Critical Elements');
  const elements = await page.evaluate(() => ({
    recordSale: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Record Sale')),
    addItem: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add Item')),
    search: !!document.querySelector('input[type="search"]'),
    salesCard: !!document.querySelector('[class*="sales"]')
  }));

  Object.entries(elements).forEach(([name, exists]) => {
    console.log(`   ${exists ? '✅' : '❌'} ${name}: ${exists ? 'Found' : 'Missing'}`);
  });

  // Test 4: Console Errors
  console.log('\n🐛 Test 4: Console Errors');
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.reload({ waitUntil: 'networkidle2' });
  console.log(`   ${errors.length === 0 ? '✅' : '⚠️'} ${errors.length} console errors`);

  // Test 5: Performance
  console.log('\n⚡ Test 5: Performance Metrics');
  const metrics = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint');
    return {
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      resources: performance.getEntriesByType('resource').length
    };
  });
  console.log(`   ${metrics.fcp < 2500 ? '✅' : '⚠️'} FCP: ${metrics.fcp.toFixed(0)}ms`);
  console.log(`   ${metrics.resources < 50 ? '✅' : '⚠️'} Resources: ${metrics.resources}`);

  await browser.close();

  console.log('\n' + '='.repeat(50));
  const allPassed = loadTime < 3000 && !hasHScroll && Object.values(elements).every(e => e) && errors.length === 0;
  console.log(allPassed ? '✅ All tests passed!' : '⚠️  Some issues detected');
  console.log('='.repeat(50));
})();
