/**
 * Dashboard UX Analysis Script using Puppeteer
 *
 * This script performs automated UX analysis on the dashboard session:
 * - Session recording
 * - Click flow analysis
 * - Performance metrics
 * - Accessibility checks
 * - Mobile responsiveness
 * - User journey mapping
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:4000',
  screenshotDir: './ux-analysis/screenshots',
  reportDir: './ux-analysis/reports',
  recordingDir: './ux-analysis/recordings',
  viewport: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  }
};

// Ensure directories exist
Object.values(CONFIG).forEach(dir => {
  if (typeof dir === 'string' && dir.startsWith('./')) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// UX Metrics Collection
class UXMetrics {
  constructor() {
    this.interactions = [];
    this.timings = {};
    this.errors = [];
    this.suggestions = [];
    this.pageViews = [];
  }

  logInteraction(type, element, details = {}) {
    this.interactions.push({
      timestamp: Date.now(),
      type,
      element,
      ...details
    });
  }

  logTiming(label, duration) {
    this.timings[label] = duration;
  }

  logError(error) {
    this.errors.push({
      timestamp: Date.now(),
      message: error.message || error,
      stack: error.stack || ''
    });
  }

  addSuggestion(category, severity, message, recommendation) {
    this.suggestions.push({
      category,
      severity, // 'critical', 'high', 'medium', 'low'
      message,
      recommendation
    });
  }

  logPageView(url, metrics) {
    this.pageViews.push({
      timestamp: Date.now(),
      url,
      ...metrics
    });
  }

  generateReport() {
    return {
      summary: {
        totalInteractions: this.interactions.length,
        totalErrors: this.errors.length,
        totalSuggestions: this.suggestions.length,
        pageViews: this.pageViews.length
      },
      interactions: this.interactions,
      timings: this.timings,
      errors: this.errors,
      suggestions: this.suggestions.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      pageViews: this.pageViews
    };
  }
}

// Main UX Analysis Function
async function analyzeDashboardUX() {
  console.log('🚀 Starting Dashboard UX Analysis...\n');

  const metrics = new UXMetrics();
  const browser = await puppeteer.launch({
    headless: false, // Set to true for automated runs
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: CONFIG.viewport.desktop
  });

  try {
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        metrics.logError(`Console Error: ${msg.text()}`);
      }
    });

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    // Monitor page errors
    page.on('pageerror', error => {
      metrics.logError(error);
    });

    console.log('📊 Test 1: Initial Page Load Performance');
    const startTime = Date.now();
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    const loadTime = Date.now() - startTime;
    metrics.logTiming('initialPageLoad', loadTime);

    console.log(`   ⏱️  Page loaded in ${loadTime}ms`);
    if (loadTime > 3000) {
      metrics.addSuggestion(
        'Performance',
        'high',
        `Page load time is ${loadTime}ms (>3s)`,
        'Optimize bundle size, lazy load components, and implement code splitting'
      );
    }

    // Take initial screenshot
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '01-initial-load.png'),
      fullPage: true
    });

    console.log('\n📱 Test 2: Mobile Responsiveness Check');
    await page.setViewport(CONFIG.viewport.mobile);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '02-mobile-view.png'),
      fullPage: true
    });

    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalScroll) {
      metrics.addSuggestion(
        'Mobile',
        'high',
        'Horizontal scrolling detected on mobile view',
        'Review CSS for elements with fixed widths, ensure all content fits within viewport'
      );
      console.log('   ⚠️  Horizontal scroll detected');
    } else {
      console.log('   ✅ No horizontal scroll');
    }

    // Reset to desktop
    await page.setViewport(CONFIG.viewport.desktop);
    await new Promise(r => setTimeout(r, 500));

    console.log('\n🎯 Test 3: Dashboard Element Accessibility');

    // Check for critical dashboard elements
    const dashboardElements = await page.evaluate(() => {
      const elements = {
        todaysSales: !!document.querySelector('[class*="sales-card"]'),
        actionButtons: !!document.querySelector('[class*="action-buttons"]'),
        quickSell: !!document.querySelector('[class*="quick-sell"]'),
        searchInput: !!document.querySelector('input[type="search"]'),
        itemsTable: !!document.querySelector('[class*="items-table"]'),
        recordSaleButton: !!document.querySelector('button:has-text("Record Sale"), button:has-text("💰 Record Sale")')
          || Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Record Sale')),
        addItemButton: !!document.querySelector('button:has-text("Add Item"), button:has-text("+ Add Item")')
          || Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add Item')),
      };

      return {
        elements,
        missingElements: Object.entries(elements)
          .filter(([, exists]) => !exists)
          .map(([name]) => name)
      };
    });

    dashboardElements.missingElements.forEach(element => {
      metrics.addSuggestion(
        'Functionality',
        'critical',
        `Critical element missing: ${element}`,
        `Ensure ${element} is rendered and accessible to users`
      );
      console.log(`   ❌ Missing: ${element}`);
    });

    console.log('\n🔍 Test 4: Search Functionality');
    const searchInput = await page.$('input[type="search"]');

    if (searchInput) {
      await searchInput.type('test');
      metrics.logInteraction('search', 'searchInput', { query: 'test' });
      await new Promise(r => setTimeout(r, 500));

      await page.screenshot({
        path: path.join(CONFIG.screenshotDir, '03-search-active.png'),
        fullPage: true
      });

      console.log('   ✅ Search field interactive');
    } else {
      metrics.addSuggestion(
        'Functionality',
        'high',
        'Search input not found',
        'Ensure search is visible and accessible'
      );
      console.log('   ❌ Search field not found');
    }

    console.log('\n🎨 Test 5: Visual Hierarchy & Spacing');
    const visualMetrics = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[class*="card"]'));
      const buttons = Array.from(document.querySelectorAll('button'));

      return {
        cardCount: cards.length,
        buttonCount: buttons.length,
        colorContrast: window.getComputedStyle(document.body).color,
        backgroundColor: window.getComputedStyle(document.body).backgroundColor,
        fontSize: window.getComputedStyle(document.body).fontSize
      };
    });

    console.log(`   📦 Cards: ${visualMetrics.cardCount}`);
    console.log(`   🔘 Buttons: ${visualMetrics.buttonCount}`);

    console.log('\n⚡ Test 6: Interactive Elements Response Time');
    const buttons = await page.$$('button');

    if (buttons.length > 0) {
      const testButton = buttons[0];
      const clickStart = Date.now();
      await testButton.click();
      const clickTime = Date.now() - clickStart;
      metrics.logTiming('buttonClickResponse', clickTime);
      metrics.logInteraction('click', 'button', { responseTime: clickTime });

      console.log(`   ⏱️  Button response: ${clickTime}ms`);

      if (clickTime > 100) {
        metrics.addSuggestion(
          'Performance',
          'medium',
          `Button response time ${clickTime}ms is >100ms`,
          'Optimize event handlers, consider debouncing, reduce re-renders'
        );
      }

      // Take screenshot after interaction
      await page.screenshot({
        path: path.join(CONFIG.screenshotDir, '04-after-click.png'),
        fullPage: true
      });

      // Go back
      await page.goBack();
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n♿ Test 7: Keyboard Navigation');
    // Test Tab navigation
    await page.keyboard.press('Tab');
    await new Promise(r => setTimeout(r, 200));
    const focusedElement1 = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        type: el.type,
        text: el.textContent?.substring(0, 30) || '',
        hasOutline: window.getComputedStyle(el).outline !== 'none'
      };
    });

    console.log(`   🔍 First tab focus: ${focusedElement1.tag} (${focusedElement1.text})`);

    if (!focusedElement1.hasOutline && focusedElement1.tag !== 'BODY') {
      metrics.addSuggestion(
        'Accessibility',
        'medium',
        'Keyboard focus indicator not visible',
        'Add visible focus outlines for keyboard navigation'
      );
    }

    console.log('\n📏 Test 8: Scroll Behavior & Loading States');
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '05-scrolled-bottom.png'),
      fullPage: true
    });

    // Check for infinite scroll or pagination
    const hasInfiniteScroll = await page.evaluate(() => {
      return !!document.querySelector('[class*="loading"]') ||
             !!document.querySelector('.items-loading');
    });

    if (hasInfiniteScroll) {
      console.log('   ✅ Loading states detected');
    }

    console.log('\n🌐 Test 9: Network Performance');
    const imageRequests = networkRequests.filter(req =>
      req.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
    );

    console.log(`   📸 Image requests: ${imageRequests.length}`);

    if (imageRequests.length > 20) {
      metrics.addSuggestion(
        'Performance',
        'medium',
        `${imageRequests.length} image requests detected`,
        'Consider lazy loading images, using image sprites, or implementing image CDN'
      );
    }

    console.log('\n💾 Test 10: Local Storage & State Persistence');
    const localStorageKeys = await page.evaluate(() => {
      return Object.keys(localStorage);
    });

    console.log(`   🔑 LocalStorage keys: ${localStorageKeys.length}`);
    localStorageKeys.forEach(key => {
      if (key.startsWith('storehouse')) {
        console.log(`      - ${key}`);
      }
    });

    console.log('\n📊 Test 11: Performance Metrics');
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalResources: performance.getEntriesByType('resource').length
      };
    });

    console.log(`   ⏱️  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`   🎨 First Paint: ${performanceMetrics.firstPaint.toFixed(0)}ms`);
    console.log(`   📄 First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(0)}ms`);
    console.log(`   📦 Total Resources: ${performanceMetrics.totalResources}`);

    if (performanceMetrics.firstContentfulPaint > 2500) {
      metrics.addSuggestion(
        'Performance',
        'high',
        `First Contentful Paint is ${performanceMetrics.firstContentfulPaint.toFixed(0)}ms (>2.5s)`,
        'Optimize critical rendering path, reduce CSS/JS bundle sizes, preload critical assets'
      );
    }

    // Generate comprehensive report
    const report = metrics.generateReport();

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(CONFIG.reportDir, `ux-analysis-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📈 UX ANALYSIS REPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Interactions: ${report.summary.totalInteractions}`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    console.log(`Total Suggestions: ${report.summary.totalSuggestions}`);
    console.log(`\n📋 TOP SUGGESTIONS:`);

    const topSuggestions = report.suggestions.slice(0, 10);
    topSuggestions.forEach((sug, idx) => {
      const icon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[sug.severity];

      console.log(`\n${idx + 1}. ${icon} [${sug.severity.toUpperCase()}] ${sug.category}`);
      console.log(`   Issue: ${sug.message}`);
      console.log(`   Fix: ${sug.recommendation}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n💾 Full report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${CONFIG.screenshotDir}`);
    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    metrics.logError(error);
  } finally {
    await browser.close();
  }
}

// Run the analysis
analyzeDashboardUX().catch(console.error);
