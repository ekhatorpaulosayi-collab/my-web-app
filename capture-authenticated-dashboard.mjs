import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS_DIR = '/home/ekhator1/screenshots/dashboard-auth';
const BASE_URL = 'http://localhost:4000';
const EMAIL = 'ekhatorpaulosayi@gmail.com';
const PASSWORD = 'Onelove4312.';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set desktop viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    console.log('🚀 Starting authenticated dashboard capture...\n');
    console.log('═══════════════════════════════════════════════\n');

    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await sleep(2000);

    // Take screenshot of login page
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '00-login-page.png'),
      fullPage: true
    });
    console.log('✅ Captured: Login page\n');

    // Step 2: Login
    console.log('📍 Step 2: Logging in...');

    // Fill email
    const emailInput = await page.$('input[type="email"], input[placeholder*="email" i]');
    if (emailInput) {
      await emailInput.type(EMAIL);
      console.log('   ✓ Email entered');
    }

    await sleep(500);

    // Fill password
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.type(PASSWORD);
      console.log('   ✓ Password entered');
    }

    await sleep(500);

    // Click sign in button
    const buttons = await page.$$('button');
    let signedIn = false;

    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent?.trim().toLowerCase() || '');
      if (text.includes('sign in')) {
        await button.click();
        console.log('   ✓ Clicked Sign In button');
        signedIn = true;
        break;
      }
    }

    if (!signedIn) {
      throw new Error('Sign In button not found');
    }

    // Wait for navigation
    await sleep(5000);

    console.log('✅ Login completed\n');

    // Step 3: Capture Dashboard Sections
    console.log('📸 CAPTURING DASHBOARD SECTIONS\n');
    console.log('═══════════════════════════════════════════════\n');

    // 3.1 Main Dashboard
    console.log('📍 Capturing: Main Dashboard Overview...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-main-dashboard.png'),
      fullPage: true
    });
    console.log('✅ Saved: Main Dashboard\n');

    await sleep(1000);

    // 3.2 Try to open More menu
    console.log('📍 Opening More Menu...');
    const moreButtons = await page.$$('button');
    let moreMenuOpened = false;

    for (const button of moreButtons) {
      const text = await button.evaluate(el => el.textContent?.trim().toLowerCase() || '');
      const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '');

      if (text.includes('more') || ariaLabel.includes('more')) {
        await button.click();
        await sleep(1500);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '02-more-menu-open.png'),
          fullPage: true
        });
        console.log('✅ Captured: More Menu (Open)\n');
        moreMenuOpened = true;

        // Close more menu
        await page.keyboard.press('Escape');
        await sleep(1000);
        break;
      }
    }

    if (!moreMenuOpened) {
      console.log('⚠️  More menu not found\n');
    }

    // 3.3 Inventory/Products section (scroll to inventory)
    console.log('📍 Capturing: Inventory/Products Section...');
    await page.evaluate(() => {
      const inventorySection = document.querySelector('[class*="inventory"], [id*="inventory"]');
      if (inventorySection) {
        inventorySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-inventory-section.png'),
      fullPage: true
    });
    console.log('✅ Captured: Inventory Section\n');

    // 3.4 Search functionality
    console.log('📍 Testing: Search Functionality...');
    const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
    if (searchInput) {
      await searchInput.type('test');
      await sleep(1500);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04-search-active.png'),
        fullPage: true
      });
      console.log('✅ Captured: Search Active State\n');

      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await sleep(500);
    }

    // 3.5 Try to open different modals/sections
    const sectionsToCapture = [
      { name: 'Record Sale', keywords: ['record', 'sale', 'quick sell'] },
      { name: 'Add Product', keywords: ['add', 'product', 'new item'] },
      { name: 'View History', keywords: ['history', 'sales history'] },
      { name: 'Settings', keywords: ['settings', 'preferences'] }
    ];

    for (const section of sectionsToCapture) {
      try {
        console.log(`📍 Looking for: ${section.name}...`);
        const buttons = await page.$$('button, a');

        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent?.trim().toLowerCase() || '');
          const matched = section.keywords.some(keyword => text.includes(keyword));

          if (matched) {
            await button.click();
            await sleep(2000);

            const filename = `05-${section.name.toLowerCase().replace(/\s+/g, '-')}.png`;
            await page.screenshot({
              path: path.join(SCREENSHOTS_DIR, filename),
              fullPage: true
            });
            console.log(`✅ Captured: ${section.name}\n`);

            // Close modal/go back
            await page.keyboard.press('Escape');
            await sleep(1000);
            break;
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not capture ${section.name}\n`);
      }
    }

    // 3.6 Navigate to specific routes
    const routes = [
      { path: '/invoices', name: 'Invoices' },
      { path: '/staff', name: 'Staff Management' },
      { path: '/referrals', name: 'Referrals' },
      { path: '/reviews', name: 'Reviews' }
    ];

    for (const route of routes) {
      try {
        console.log(`📍 Navigating to: ${route.name}...`);
        await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: 'networkidle0',
          timeout: 15000
        });
        await sleep(2000);

        const filename = `10-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, filename),
          fullPage: true
        });
        console.log(`✅ Captured: ${route.name}\n`);
      } catch (error) {
        console.log(`⚠️  Could not capture ${route.name}: ${error.message}\n`);
      }
    }

    // 3.7 Mobile View Captures
    console.log('\n📱 CAPTURING MOBILE VIEWS\n');
    console.log('═══════════════════════════════════════════════\n');

    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 2
    });

    // Go back to dashboard for mobile view
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: 'networkidle0',
      timeout: 15000
    });
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-01-dashboard.png'),
      fullPage: true
    });
    console.log('✅ Captured: Mobile Dashboard\n');

    // Try to open mobile menu
    const hamburgerButton = await page.$('button[aria-label*="menu" i], [class*="hamburger"], [class*="menu-toggle"]');
    if (hamburgerButton) {
      await hamburgerButton.click();
      await sleep(1500);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'mobile-02-menu-open.png'),
        fullPage: true
      });
      console.log('✅ Captured: Mobile Menu (Open)\n');
    }

    // Mobile inventory scroll
    await page.evaluate(() => window.scrollTo(0, 800));
    await sleep(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-03-scrolled.png'),
      fullPage: false
    });
    console.log('✅ Captured: Mobile Scrolled View\n');

    console.log('\n✅ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════');
    console.log(`📁 Location: ${SCREENSHOTS_DIR}`);
    console.log(`📊 Total screenshots: ${fs.readdirSync(SCREENSHOTS_DIR).length}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);

    // Take error screenshot
    try {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'error-screenshot.png'),
        fullPage: true
      });
      console.log('📸 Error screenshot saved');
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
