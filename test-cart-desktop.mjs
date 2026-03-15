import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    console.log('Navigating to storefront...');
    await page.goto('http://localhost:4000/store/paul-pahhggygggffffg', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for page to load
    await sleep(2000);

    // Add items to cart by clicking "Add to Cart" buttons
    console.log('Adding items to cart...');
    const buttons = await page.$$('button');
    let addedCount = 0;

    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
      if (text.includes('add to cart') && addedCount < 2) {
        await button.click();
        await sleep(500);
        addedCount++;
      }
    }

    console.log(`Added ${addedCount} items to cart`);

    // Open cart - look for cart icon/button
    console.log('Opening cart...');
    await sleep(1000);

    // Try to find and click cart button/icon
    const cartElements = await page.$$('[class*="cart"], [id*="cart"], button');
    for (const el of cartElements) {
      const ariaLabel = await el.evaluate(e => e.getAttribute('aria-label')?.toLowerCase() || '');
      const className = await el.evaluate(e => e.className?.toLowerCase() || '');

      if (ariaLabel.includes('cart') || className.includes('cart-icon') || className.includes('cart-button')) {
        await el.click();
        await sleep(1500);
        break;
      }
    }

    // Take screenshot of full page with cart open
    console.log('Taking screenshot...');
    await page.screenshot({
      path: '/home/ekhator1/screenshots/cart-desktop-before.png',
      fullPage: false
    });

    // Take screenshot focused on cart area (right side)
    await page.screenshot({
      path: '/home/ekhator1/screenshots/cart-desktop-focused.png',
      clip: {
        x: 1400, // Right side of screen where cart sidebar appears
        y: 0,
        width: 520,
        height: 1080
      }
    });

    console.log('✅ Screenshots saved to /home/ekhator1/screenshots/');
    console.log('  - cart-desktop-before.png (full page)');
    console.log('  - cart-desktop-focused.png (cart sidebar only)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
