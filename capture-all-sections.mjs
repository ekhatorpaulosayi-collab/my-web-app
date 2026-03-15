import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS_DIR = '/home/ekhator1/screenshots/dashboard';
const BASE_URL = 'http://localhost:4000';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// All routes/sections to capture
const sections = [
  { name: '01-Main-Dashboard', url: '/dashboard', description: 'Main Dashboard' },
  { name: '02-Sales-History', url: '/dashboard', click: 'View History', description: 'Sales History' },
  { name: '03-Invoices', url: '/invoices', description: 'Professional Invoices' },
  { name: '04-Customers', url: '/dashboard', click: 'Customers', description: 'Customer Management' },
  { name: '05-Staff-Management', url: '/staff', description: 'Staff & Team' },
  { name: '06-Reviews', url: '/reviews', description: 'Customer Reviews' },
  { name: '07-Referrals', url: '/referrals', description: 'Referral Program' },
  { name: '08-Affiliate', url: '/affiliate/signup', description: 'Affiliate Program' },
  { name: '09-Online-Store-Settings', url: '/dashboard', click: 'Online Store', description: 'Online Store' },
  { name: '10-Settings', url: '/dashboard', click: 'Settings', description: 'Account Settings' }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    console.log('🚀 Starting comprehensive dashboard screenshot capture...\n');

    // Desktop view
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    console.log('📸 DESKTOP SCREENSHOTS\n');
    console.log('═══════════════════════════════════════\n');

    for (const section of sections) {
      try {
        console.log(`📍 Capturing: ${section.description}...`);

        // Navigate to URL
        await page.goto(`${BASE_URL}${section.url}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        await sleep(2000);

        // If needs click action
        if (section.click) {
          console.log(`   🖱️  Looking for "${section.click}" button...`);

          // Try to find and click the button
          const buttons = await page.$$('button, a');
          let clicked = false;

          for (const button of buttons) {
            const text = await button.evaluate(el => el.textContent?.trim() || '');
            if (text.toLowerCase().includes(section.click.toLowerCase())) {
              await button.click();
              await sleep(2000);
              clicked = true;
              console.log(`   ✅ Clicked "${section.click}"`);
              break;
            }
          }

          if (!clicked) {
            console.log(`   ⚠️  "${section.click}" button not found, capturing page as is`);
          }
        }

        // Take screenshot
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `desktop-${section.name}.png`),
          fullPage: true
        });
        console.log(`✅ Saved: desktop-${section.name}.png\n`);

      } catch (error) {
        console.log(`❌ Error capturing ${section.description}: ${error.message}\n`);
      }
    }

    // Mobile screenshots
    console.log('\n📱 MOBILE SCREENSHOTS\n');
    console.log('═══════════════════════════════════════\n');

    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 2
    });

    // Capture key mobile views
    const mobileViews = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Invoices', url: '/invoices' },
      { name: 'Staff', url: '/staff' }
    ];

    for (const view of mobileViews) {
      try {
        await page.goto(`${BASE_URL}${view.url}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        await sleep(2000);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `mobile-${view.name.toLowerCase()}.png`),
          fullPage: true
        });
        console.log(`✅ Saved: mobile-${view.name.toLowerCase()}.png`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${SCREENSHOTS_DIR}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
})();
