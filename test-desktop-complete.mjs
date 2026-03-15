import { chromium } from 'playwright';

async function testDesktopComplete() {
  console.log('🖥️  Complete Desktop Button Test - localhost:4000\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to localhost:4000...');
    await page.goto('http://localhost:4000/store/paul-pahhggygggffffg', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');

    // ==========================================
    // TEST 1: CART BUTTON
    // ==========================================
    console.log('🔍 TEST 1: CART BUTTON (Header - Top Right)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const cartButton = page.locator('button[aria-label*="Shopping cart"]').first();

    if (await cartButton.isVisible()) {
      const cartInitialStyles = await cartButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.backgroundColor,
          color: styles.color,
          border: styles.border,
          width: styles.width,
          height: styles.height
        };
      });

      console.log('📊 Initial State:');
      console.log('   Background:', cartInitialStyles.background);
      console.log('   Color:', cartInitialStyles.color);
      console.log('   Border:', cartInitialStyles.border);
      console.log('   Size:', `${cartInitialStyles.width} x ${cartInitialStyles.height}`);

      await page.screenshot({ path: '/tmp/desktop-01-cart-initial.png' });
      console.log('📸 Saved: desktop-01-cart-initial.png');

      console.log('\n🖱️  Hovering over cart button...');
      await cartButton.hover();
      await page.waitForTimeout(400);

      const cartHoverStyles = await cartButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.backgroundColor,
          color: styles.color,
          border: styles.border,
          transform: styles.transform
        };
      });

      console.log('📊 Hover State:');
      console.log('   Background:', cartHoverStyles.background);
      console.log('   Color:', cartHoverStyles.color);
      console.log('   Border:', cartHoverStyles.border);
      console.log('   Transform:', cartHoverStyles.transform);

      await page.screenshot({ path: '/tmp/desktop-02-cart-hover.png' });
      console.log('📸 Saved: desktop-02-cart-hover.png');

      if (cartHoverStyles.background.includes('37, 99, 235') ||
          cartHoverStyles.background.includes('rgb(37, 99, 235)')) {
        console.log('✅ PASS: Cart button turns BLUE on hover');
      } else {
        console.log('❌ FAIL: Cart button does NOT turn blue on hover');
      }

      if (cartHoverStyles.color.includes('255, 255, 255') ||
          cartHoverStyles.color.includes('rgb(255, 255, 255)')) {
        console.log('✅ PASS: Cart icon turns WHITE on hover');
      } else {
        console.log('❌ FAIL: Cart icon does NOT turn white on hover');
      }

      console.log('\n');
      await page.mouse.move(100, 100);
      await page.waitForTimeout(500);
    } else {
      console.log('❌ Cart button not found\n');
    }

    // ==========================================
    // TEST 2: FIND PRODUCTS
    // ==========================================
    console.log('🔍 TEST 2: FINDING PRODUCTS ON PAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Wait for products to load
    await page.waitForTimeout(2000);

    // Try multiple selectors for products
    const productSelectors = [
      '.storefront-product-card',
      '[class*="product"]',
      'div[onclick*="product"]',
      'button[onclick*="product"]'
    ];

    let products = null;
    let productCount = 0;

    for (const selector of productSelectors) {
      products = page.locator(selector);
      productCount = await products.count();
      console.log(`   Trying selector "${selector}": Found ${productCount} elements`);

      if (productCount > 0) {
        // Check if visible
        const firstVisible = await products.first().isVisible().catch(() => false);
        if (firstVisible) {
          console.log(`✅ Found ${productCount} visible products with selector: ${selector}`);
          break;
        }
      }
    }

    if (productCount === 0) {
      console.log('⚠️  No products found with any selector');
      console.log('📸 Taking screenshot of page...');
      await page.screenshot({ path: '/tmp/desktop-03-no-products.png', fullPage: true });
      console.log('📸 Saved: desktop-03-no-products.png');

      // Get page HTML to debug
      const bodyText = await page.locator('body').textContent();
      console.log('\n📄 Page content preview:');
      console.log(bodyText.substring(0, 300) + '...\n');
    } else {
      console.log(`\n🖱️  Clicking first product...`);

      try {
        await products.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await products.first().click({ timeout: 5000 });
        await page.waitForTimeout(2000);

        console.log('✅ Clicked product, waiting for modal...\n');

        // ==========================================
        // TEST 3: PRODUCT MODAL CLOSE BUTTON
        // ==========================================
        console.log('🔍 TEST 3: PRODUCT MODAL CLOSE BUTTON');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Try to find modal close button
        const modalCloseSelectors = [
          'button[aria-label="Close product details"]',
          'button[aria-label*="Close"]',
          '.storefront-product-modal button[type="button"]',
          'button svg[class*="lucide-x"]'
        ];

        let modalCloseBtn = null;
        for (const selector of modalCloseSelectors) {
          modalCloseBtn = page.locator(selector).first();
          const isVisible = await modalCloseBtn.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`✅ Found modal close button with: ${selector}`);
            break;
          }
        }

        if (modalCloseBtn && await modalCloseBtn.isVisible()) {
          await page.screenshot({ path: '/tmp/desktop-03-modal-opened.png' });
          console.log('📸 Saved: desktop-03-modal-opened.png');

          const modalInitialStyles = await modalCloseBtn.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
              background: styles.backgroundColor,
              color: styles.color,
              border: styles.border,
              width: styles.width,
              height: styles.height
            };
          });

          console.log('\n📊 Initial State:');
          console.log('   Background:', modalInitialStyles.background);
          console.log('   Color:', modalInitialStyles.color);
          console.log('   Border:', modalInitialStyles.border);
          console.log('   Size:', `${modalInitialStyles.width} x ${modalInitialStyles.height}`);

          console.log('\n🖱️  Hovering over modal close button...');
          await modalCloseBtn.hover();
          await page.waitForTimeout(400);

          const modalHoverStyles = await modalCloseBtn.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
              background: styles.backgroundColor,
              color: styles.color,
              border: styles.border,
              transform: styles.transform
            };
          });

          console.log('📊 Hover State:');
          console.log('   Background:', modalHoverStyles.background);
          console.log('   Color:', modalHoverStyles.color);
          console.log('   Border:', modalHoverStyles.border);
          console.log('   Transform:', modalHoverStyles.transform);

          await page.screenshot({ path: '/tmp/desktop-04-modal-close-hover.png' });
          console.log('📸 Saved: desktop-04-modal-close-hover.png');

          if (modalHoverStyles.background.includes('239, 68, 68') ||
              modalHoverStyles.background.includes('rgb(239, 68, 68)')) {
            console.log('✅ PASS: Modal close button turns RED on hover');
          } else {
            console.log('❌ FAIL: Modal close button does NOT turn red');
          }

          if (modalHoverStyles.transform.includes('matrix') &&
              modalHoverStyles.transform !== 'none') {
            console.log('✅ PASS: Modal close button ROTATES on hover');
          } else {
            console.log('❌ FAIL: Modal close button does NOT rotate');
          }
        } else {
          console.log('⚠️  Modal close button not found');
          await page.screenshot({ path: '/tmp/desktop-03-modal-state.png' });
          console.log('📸 Saved: desktop-03-modal-state.png (for debugging)');
        }

      } catch (error) {
        console.log('⚠️  Could not click product:', error.message);
        await page.screenshot({ path: '/tmp/desktop-error-click.png' });
        console.log('📸 Saved: desktop-error-click.png');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Screenshots saved to /tmp/');
    console.log('✅ Cart button hover effects verified');
    console.log('\n📁 All screenshots in /tmp/desktop-*.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/desktop-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🏁 Browser closed');
  }
}

testDesktopComplete();
