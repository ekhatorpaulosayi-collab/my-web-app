import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const SCREENSHOTS_DIR = '/home/ekhator1/screenshots/dashboard';
const BASE_URL = 'http://localhost:4000';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();

    // Set desktop viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    console.log('🚀 Starting dashboard section capture...\n');

    // 1. Navigate to login/dashboard
    console.log('📍 Navigating to dashboard...');
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await sleep(2000);

    // Take screenshot of landing/login page
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-landing-page.png'),
      fullPage: true
    });
    console.log('✅ Captured: Landing/Login Page');

    // Check if already logged in or need to login
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // If not on dashboard, try to find dashboard
    if (!currentUrl.includes('/dashboard')) {
      console.log('Attempting to access dashboard directly...');
      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await sleep(2000);
    }

    // 2. Main Dashboard Overview
    console.log('📍 Capturing Main Dashboard...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-main-dashboard.png'),
      fullPage: true
    });
    console.log('✅ Captured: Main Dashboard Overview');

    // Find and click on "More" or navigation sections
    const sections = [
      { name: 'Products', selector: 'a[href*="products"], button:has-text("Products"), [class*="products"]' },
      { name: 'Inventory', selector: 'a[href*="inventory"], button:has-text("Inventory"), [class*="inventory"]' },
      { name: 'Sales', selector: 'a[href*="sales"], button:has-text("Sales"), [class*="sales"]' },
      { name: 'Analytics', selector: 'a[href*="analytics"], button:has-text("Analytics"), [class*="analytics"]' },
      { name: 'Store Settings', selector: 'a[href*="store"], button:has-text("Store"), [class*="store"]' },
      { name: 'Profile', selector: 'a[href*="profile"], button:has-text("Profile"), [class*="profile"]' },
      { name: 'Customers', selector: 'a[href*="customers"], button:has-text("Customers"), [class*="customers"]' },
      { name: 'Orders', selector: 'a[href*="orders"], button:has-text("Orders"), [class*="orders"]' },
      { name: 'Reports', selector: 'a[href*="reports"], button:has-text("Reports"), [class*="reports"]' },
      { name: 'Settings', selector: 'a[href*="settings"], button:has-text("Settings"), [class*="settings"]' }
    ];

    // Try to find and screenshot each section
    let sectionNumber = 3;
    for (const section of sections) {
      try {
        console.log(`\n📍 Looking for ${section.name} section...`);

        // Try multiple selectors
        const selectors = section.selector.split(', ');
        let found = false;

        for (const selector of selectors) {
          try {
            const elements = await page.$$(selector);

            for (const element of elements) {
              const text = await element.evaluate(el => el.textContent?.toLowerCase() || '');
              const href = await element.evaluate(el => el.getAttribute('href') || '');

              if (text.includes(section.name.toLowerCase()) || href.includes(section.name.toLowerCase().replace(' ', '-'))) {
                console.log(`   Found ${section.name} via selector: ${selector}`);

                // Click the element
                await element.click();
                await sleep(2000);

                // Take screenshot
                const filename = `${String(sectionNumber).padStart(2, '0')}-${section.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                await page.screenshot({
                  path: path.join(SCREENSHOTS_DIR, filename),
                  fullPage: true
                });
                console.log(`✅ Captured: ${section.name}`);

                sectionNumber++;
                found = true;
                break;
              }
            }

            if (found) break;
          } catch (err) {
            // Continue to next selector
          }
        }

        if (!found) {
          console.log(`⚠️  ${section.name} not found`);
        }

        // Go back to dashboard for next section
        await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        await sleep(1000);

      } catch (error) {
        console.log(`⚠️  Error capturing ${section.name}:`, error.message);
      }
    }

    // Look for "More" menu or dropdown
    console.log('\n📍 Looking for More menu...');
    try {
      const moreButton = await page.$('button:has-text("More"), [class*="more"], [id*="more"]');
      if (moreButton) {
        console.log('   Found More button');
        await moreButton.click();
        await sleep(1000);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '99-more-menu-expanded.png'),
          fullPage: false
        });
        console.log('✅ Captured: More Menu (Expanded)');
      }
    } catch (error) {
      console.log('⚠️  More menu not found or error:', error.message);
    }

    // Capture mobile view
    console.log('\n📱 Capturing Mobile View...');
    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 2
    });

    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-dashboard.png'),
      fullPage: true
    });
    console.log('✅ Captured: Mobile Dashboard View');

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();
