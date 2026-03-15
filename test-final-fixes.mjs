import { chromium } from 'playwright';

async function testFinalFixes() {
  console.log('🔍 Testing Final UX Fixes on localhost:4000\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  // Test both desktop and mobile viewports
  const viewports = [
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Mobile', width: 375, height: 667 }
  ];

  for (const viewport of viewports) {
    console.log(`\n📱 Testing ${viewport.name} View (${viewport.width}x${viewport.height})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:4000/store/paul-pahhggygggffffg', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(2000);

      // TEST 1: Cart Button
      console.log('\n🔍 TEST 1: Cart Button Visibility');
      const cartButton = page.locator('button[aria-label*="Shopping cart"]').first();

      if (await cartButton.isVisible()) {
        const cartStyles = await cartButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            background: styles.background,
            color: styles.color,
            border: styles.border,
            width: styles.width,
            height: styles.height,
            boxShadow: styles.boxShadow
          };
        });

        console.log('📊 Cart Button State:');
        console.log('   Background:', cartStyles.background.substring(0, 50) + '...');
        console.log('   Color:', cartStyles.color);
        console.log('   Border:', cartStyles.border);
        console.log('   Size:', `${cartStyles.width} x ${cartStyles.height}`);

        // Check if it's dark (visible)
        const isDark = cartStyles.background.includes('30, 41, 59') ||
                       cartStyles.background.includes('1e293b') ||
                       cartStyles.background.includes('15, 23, 42');

        if (isDark) {
          console.log('✅ PASS: Cart button is DARK (high contrast)');
        } else {
          console.log('❌ FAIL: Cart button is NOT dark enough');
        }

        // Check if icon is white
        const isWhiteIcon = cartStyles.color.includes('255, 255, 255') ||
                            cartStyles.color.includes('rgb(255, 255, 255)');

        if (isWhiteIcon) {
          console.log('✅ PASS: Cart icon is WHITE (high contrast)');
        } else {
          console.log('❌ FAIL: Cart icon is NOT white');
        }

        // Screenshot
        const screenshotName = `/tmp/final-${viewport.name.toLowerCase()}-cart.png`;
        await page.screenshot({ path: screenshotName });
        console.log(`📸 Saved: ${screenshotName}`);

        // Test hover on desktop
        if (viewport.name === 'Desktop') {
          console.log('\n🖱️  Testing hover effect...');
          await cartButton.hover();
          await page.waitForTimeout(300);

          const hoverStyles = await cartButton.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
              background: styles.background,
              transform: styles.transform
            };
          });

          console.log('   Hover Background:', hoverStyles.background.substring(0, 50) + '...');
          console.log('   Hover Transform:', hoverStyles.transform);

          const hoverScreenshot = `/tmp/final-${viewport.name.toLowerCase()}-cart-hover.png`;
          await page.screenshot({ path: hoverScreenshot });
          console.log(`📸 Saved: ${hoverScreenshot}`);

          await page.mouse.move(100, 100);
          await page.waitForTimeout(500);
        }

        // Check item count badge
        const itemBadge = page.locator('button[aria-label*="Shopping cart"] span').first();
        const badgeVisible = await itemBadge.isVisible().catch(() => false);

        if (badgeVisible) {
          const badgeStyles = await itemBadge.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
              width: styles.width,
              height: styles.height,
              fontSize: styles.fontSize,
              background: styles.background
            };
          });

          console.log('\n📊 Item Count Badge:');
          console.log('   Size:', `${badgeStyles.width} x ${badgeStyles.height}`);
          console.log('   Font Size:', badgeStyles.fontSize);
          console.log('   Background:', badgeStyles.background.substring(0, 40) + '...');
          console.log('✅ Item count badge is visible');
        } else {
          console.log('\n⚠️  No items in cart or badge not visible');
        }
      } else {
        console.log('❌ Cart button not found');
      }

      // TEST 2: Red Bin Icon in Cart
      console.log('\n🔍 TEST 2: Red Bin Icon in Cart');

      // Click cart button to open cart
      await cartButton.click();
      await page.waitForTimeout(1500);
      console.log('   Opened cart...');

      // Find trash/bin button
      const binButton = page.locator('button[aria-label*="Remove item"]').first();
      const binVisible = await binButton.isVisible().catch(() => false);

      if (binVisible) {
        const binStyles = await binButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          const svg = el.querySelector('svg');
          const svgStyles = svg ? window.getComputedStyle(svg) : null;
          return {
            buttonWidth: styles.width,
            buttonHeight: styles.height,
            svgWidth: svgStyles?.width || 'N/A',
            svgHeight: svgStyles?.height || 'N/A'
          };
        });

        console.log('📊 Bin Button State:');
        console.log('   Button Size:', `${binStyles.buttonWidth} x ${binStyles.buttonHeight}`);
        console.log('   Icon Size:', `${binStyles.svgWidth} x ${binStyles.svgHeight}`);

        // Check if icon is large enough (should be 32px)
        const iconSize = parseInt(binStyles.svgWidth);
        if (iconSize >= 30) {
          console.log(`✅ PASS: Bin icon is large (${iconSize}px)`);
        } else {
          console.log(`❌ FAIL: Bin icon is too small (${iconSize}px, should be ≥30px)`);
        }

        const cartScreenshot = `/tmp/final-${viewport.name.toLowerCase()}-cart-open.png`;
        await page.screenshot({ path: cartScreenshot });
        console.log(`📸 Saved: ${cartScreenshot}`);
      } else {
        console.log('⚠️  No items in cart or bin button not found');
        const emptyCartScreenshot = `/tmp/final-${viewport.name.toLowerCase()}-cart-empty.png`;
        await page.screenshot({ path: emptyCartScreenshot });
        console.log(`📸 Saved: ${emptyCartScreenshot}`);
      }

    } catch (error) {
      console.error(`❌ Error in ${viewport.name} view:`, error.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Testing complete on both Desktop and Mobile');
  console.log('📁 Screenshots saved to /tmp/final-*.png');
  console.log('\nChanges made:');
  console.log('1. Cart button: Dark gradient (high contrast) - 60px');
  console.log('2. Item count badge: Larger (28px) with bigger font');
  console.log('3. Red bin icon: Increased from 26px to 32px');
  console.log('4. Bin button: 48px touch target with padding');
  console.log('\n🏁 Test complete');
}

testFinalFixes();
