import { chromium } from 'playwright';

async function takeScreenshots() {
  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Your storefront URL
    const storeUrl = 'https://storehouse.ng/paul-pahhggygggffffg';

    console.log(`Navigating to ${storeUrl}...`);
    await page.goto(storeUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for content to load
    console.log('Waiting for page to fully load...');
    await page.waitForTimeout(3000);

    // MOBILE SCREENSHOT
    console.log('Taking mobile screenshot...');
    await page.setViewportSize({
      width: 375,
      height: 812
    });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/tmp/storefront-mobile.png',
      fullPage: false
    });
    console.log('✅ Mobile screenshot saved: /tmp/storefront-mobile.png');

    // MOBILE FULL PAGE
    await page.screenshot({
      path: '/tmp/storefront-mobile-full.png',
      fullPage: true
    });
    console.log('✅ Mobile full page screenshot saved: /tmp/storefront-mobile-full.png');

    // DESKTOP SCREENSHOT
    console.log('Taking desktop screenshot...');
    await page.setViewportSize({
      width: 1920,
      height: 1080
    });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/tmp/storefront-desktop.png',
      fullPage: false
    });
    console.log('✅ Desktop screenshot saved: /tmp/storefront-desktop.png');

    // FOCUSED SCREENSHOT - Bottom right corner (mobile)
    await page.setViewportSize({
      width: 375,
      height: 812
    });

    await page.waitForTimeout(2000);

    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(1000);

    // Take a screenshot of bottom portion
    await page.screenshot({
      path: '/tmp/storefront-buttons-closeup.png',
      clip: {
        x: 0,
        y: 600,
        width: 375,
        height: 212
      }
    });
    console.log('✅ Button close-up screenshot saved: /tmp/storefront-buttons-closeup.png');

    console.log('\n🎉 All screenshots captured successfully!');
    console.log('\nScreenshots available at:');
    console.log('  1. /tmp/storefront-mobile.png - Mobile view');
    console.log('  2. /tmp/storefront-mobile-full.png - Mobile full page');
    console.log('  3. /tmp/storefront-desktop.png - Desktop view');
    console.log('  4. /tmp/storefront-buttons-closeup.png - Close-up of chat buttons');

  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
