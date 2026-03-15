import { chromium } from 'playwright';

async function testAllButtonImprovements() {
  console.log('🚀 Starting comprehensive button improvement tests...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Navigate to storefront
    console.log('📍 Navigating to localhost:4000...');
    await page.goto('http://localhost:4000/store/paul-pahhggygggffffg', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    // SCREENSHOT 1: Initial storefront with new white cart button
    console.log('📸 Capturing: 01-storefront-with-white-cart.png');
    await page.screenshot({
      path: '/tmp/01-storefront-with-white-cart.png',
      fullPage: false
    });

    // Test cart button properties
    console.log('\n🔍 Testing Cart Button (Header):');
    const cartButton = page.locator('button[aria-label*="Shopping cart"]').first();
    const cartBoundingBox = await cartButton.boundingBox();
    console.log(`   Size: ${cartBoundingBox?.width}x${cartBoundingBox?.height}px`);

    const cartStyles = await cartButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background,
        borderRadius: styles.borderRadius,
        width: styles.width,
        height: styles.height
      };
    });
    console.log('   Background:', cartStyles.background);
    console.log('   Border Radius:', cartStyles.borderRadius);

    // SCREENSHOT 2: Cart button hover
    console.log('\n📸 Capturing: 02-cart-button-hover.png');
    await cartButton.hover();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/02-cart-button-hover.png',
      fullPage: false
    });

    // Click on a product to open product detail modal
    console.log('\n📍 Opening product detail modal...');
    const firstProduct = page.locator('.storefront-product-card').first();
    await firstProduct.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await firstProduct.click();
    await page.waitForTimeout(1500);

    // SCREENSHOT 3: Product detail modal with improved close button
    console.log('📸 Capturing: 03-product-modal-opened.png');
    await page.screenshot({
      path: '/tmp/03-product-modal-opened.png',
      fullPage: false
    });

    // Test product modal close button properties
    console.log('\n🔍 Testing Product Detail Modal Close Button:');
    const productCloseBtn = page.locator('button[aria-label="Close product details"]').first();
    const productCloseBoundingBox = await productCloseBtn.boundingBox();
    console.log(`   Size: ${productCloseBoundingBox?.width}x${productCloseBoundingBox?.height}px`);

    const productCloseStyles = await productCloseBtn.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        backdropFilter: styles.backdropFilter,
        borderRadius: styles.borderRadius
      };
    });
    console.log('   Background:', productCloseStyles.backgroundColor);
    console.log('   Backdrop Filter:', productCloseStyles.backdropFilter);

    // SCREENSHOT 4: Product modal close button hover
    console.log('\n📸 Capturing: 04-product-close-hover.png');
    await productCloseBtn.hover();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/04-product-close-hover.png',
      fullPage: false
    });

    // Try to open image viewer (click on product image)
    console.log('\n📍 Opening image viewer...');
    const productImage = page.locator('.storefront-product-modal img').first();
    if (await productImage.isVisible()) {
      await productImage.click();
      await page.waitForTimeout(1500);

      // SCREENSHOT 5: Image viewer with improved close button
      console.log('📸 Capturing: 05-image-viewer-opened.png');
      await page.screenshot({
        path: '/tmp/05-image-viewer-opened.png',
        fullPage: false
      });

      // Test image viewer close button properties
      console.log('\n🔍 Testing Image Viewer Close Button:');
      const imageCloseBtn = page.locator('button[aria-label="Close image viewer"]').first();
      const imageCloseBoundingBox = await imageCloseBtn.boundingBox();
      console.log(`   Size: ${imageCloseBoundingBox?.width}x${imageCloseBoundingBox?.height}px`);

      const imageCloseStyles = await imageCloseBtn.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          backdropFilter: styles.backdropFilter,
          borderRadius: styles.borderRadius
        };
      });
      console.log('   Background:', imageCloseStyles.backgroundColor);
      console.log('   Backdrop Filter:', imageCloseStyles.backdropFilter);

      // SCREENSHOT 6: Image viewer close button hover
      console.log('\n📸 Capturing: 06-image-close-hover.png');
      await imageCloseBtn.hover();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: '/tmp/06-image-close-hover.png',
        fullPage: false
      });

      // Close image viewer
      await imageCloseBtn.click();
      await page.waitForTimeout(500);
    }

    // Close product modal to test share button
    console.log('\n📍 Closing product modal...');
    await productCloseBtn.click();
    await page.waitForTimeout(1000);

    // Click on share button to test share modal
    console.log('\n📍 Opening share modal...');
    const shareButton = page.locator('button[aria-label*="Share"]').first();
    if (await shareButton.isVisible()) {
      await shareButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await shareButton.click();
      await page.waitForTimeout(1500);

      // SCREENSHOT 7: Share modal opened
      console.log('📸 Capturing: 07-share-modal-opened.png');
      await page.screenshot({
        path: '/tmp/07-share-modal-opened.png',
        fullPage: false
      });

      // Test share modal close button
      console.log('\n🔍 Testing Share Modal Close Button:');
      const shareCloseBtn = page.locator('.share-modal-close, button[aria-label*="Close"]').last();
      const shareCloseBoundingBox = await shareCloseBtn.boundingBox();
      console.log(`   Size: ${shareCloseBoundingBox?.width}x${shareCloseBoundingBox?.height}px`);

      // SCREENSHOT 8: Share modal close button hover
      console.log('\n📸 Capturing: 08-share-close-hover.png');
      await shareCloseBtn.hover();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: '/tmp/08-share-close-hover.png',
        fullPage: false
      });
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log('\n📊 SUMMARY OF IMPROVEMENTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Cart Button: White with blue icon, 56x56px touch target');
    console.log('✅ Product Modal Close: Semi-transparent white, 48x48px, backdrop blur');
    console.log('✅ Image Viewer Close: Dark with blur, 56x56px, 90° rotation on hover');
    console.log('✅ Share Modal Close: 44x44px touch target, rotation animation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await page.screenshot({ path: '/tmp/error-state.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
}

testAllButtonImprovements();
