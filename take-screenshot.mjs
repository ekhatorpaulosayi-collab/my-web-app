import puppeteer from 'puppeteer';

async function takeScreenshots() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();

    // Your storefront URL
    const storeUrl = 'https://storehouse.ng/paul-pahhggygggffffg';

    console.log(`Navigating to ${storeUrl}...`);
    await page.goto(storeUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for content to load
    console.log('Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // MOBILE SCREENSHOT
    console.log('Taking mobile screenshot...');
    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({
      path: '/tmp/storefront-mobile.png',
      fullPage: false // Just viewport to see buttons
    });
    console.log('✅ Mobile screenshot saved: /tmp/storefront-mobile.png');

    // MOBILE FULL PAGE (to see both buttons clearly)
    await page.screenshot({
      path: '/tmp/storefront-mobile-full.png',
      fullPage: true
    });
    console.log('✅ Mobile full page screenshot saved: /tmp/storefront-mobile-full.png');

    // DESKTOP SCREENSHOT
    console.log('Taking desktop screenshot...');
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({
      path: '/tmp/storefront-desktop.png',
      fullPage: false
    });
    console.log('✅ Desktop screenshot saved: /tmp/storefront-desktop.png');

    // FOCUSED SCREENSHOT - Bottom right corner (mobile) to see buttons clearly
    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 3, // Higher quality
      isMobile: true,
      hasTouch: true
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to bottom to ensure buttons are visible
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take a cropped screenshot of bottom-right area where buttons are
    await page.screenshot({
      path: '/tmp/storefront-buttons-closeup.png',
      clip: {
        x: 0,
        y: 600, // Bottom portion of screen
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
