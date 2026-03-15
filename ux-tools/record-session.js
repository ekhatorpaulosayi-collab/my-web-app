#!/usr/bin/env node
/**
 * Session Recording Tool
 * Captures user interaction flow and generates report
 * Usage: npm run record-session [url] [duration-seconds]
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:4000';
const duration = parseInt(args[1]) || 30; // 30 seconds default

class SessionRecorder {
  constructor() {
    this.events = [];
    this.screenshots = [];
    this.startTime = Date.now();
  }

  logEvent(type, data) {
    this.events.push({
      timestamp: Date.now() - this.startTime,
      type,
      data
    });
  }

  async saveReport(outputDir) {
    const report = {
      url,
      duration: Date.now() - this.startTime,
      totalEvents: this.events.length,
      events: this.events,
      screenshots: this.screenshots,
      summary: {
        clicks: this.events.filter(e => e.type === 'click').length,
        scrolls: this.events.filter(e => e.type === 'scroll').length,
        inputs: this.events.filter(e => e.type === 'input').length,
        navigation: this.events.filter(e => e.type === 'navigation').length
      }
    };

    const reportPath = path.join(outputDir, `session-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Session report saved: ${reportPath}`);

    return report;
  }
}

(async () => {
  console.log(`🎬 Recording session on ${url} for ${duration} seconds...`);

  const recorder = new SessionRecorder();
  const outputDir = './ux-analysis/recordings';
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false, // Show browser
    args: ['--no-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Monitor events
  page.on('console', msg => {
    if (msg.type() === 'error') {
      recorder.logEvent('console-error', { message: msg.text() });
    }
  });

  page.on('request', request => {
    recorder.logEvent('request', {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    });
  });

  page.on('response', response => {
    if (!response.ok()) {
      recorder.logEvent('failed-response', {
        url: response.url(),
        status: response.status()
      });
    }
  });

  // Track clicks
  await page.exposeFunction('logClick', (selector) => {
    recorder.logEvent('click', { selector });
  });

  // Track scrolling
  await page.exposeFunction('logScroll', (scrollY) => {
    recorder.logEvent('scroll', { scrollY });
  });

  await page.goto(url, { waitUntil: 'networkidle2' });
  recorder.logEvent('navigation', { url });

  // Inject event listeners
  await page.evaluate(() => {
    document.addEventListener('click', (e) => {
      const selector = e.target.tagName + (e.target.className ? '.' + e.target.className.split(' ').join('.') : '');
      window.logClick(selector);
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        window.logScroll(window.scrollY);
      }, 100);
    });
  });

  console.log('\n⏱️  Recording in progress...');
  console.log('   💡 Interact with the page normally');
  console.log(`   ⏳ Will automatically stop in ${duration} seconds\n`);

  // Take screenshots at intervals
  const screenshotInterval = setInterval(async () => {
    const screenshotPath = path.join(outputDir, `screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    recorder.screenshots.push(screenshotPath);
  }, 5000); // Every 5 seconds

  // Wait for duration
  await new Promise(resolve => setTimeout(resolve, duration * 1000));

  clearInterval(screenshotInterval);

  const report = await recorder.saveReport(outputDir);
  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log('📈 SESSION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log(`Total Events: ${report.totalEvents}`);
  console.log(`Clicks: ${report.summary.clicks}`);
  console.log(`Scrolls: ${report.summary.scrolls}`);
  console.log(`Screenshots: ${recorder.screenshots.length}`);
  console.log('='.repeat(50));
})();
