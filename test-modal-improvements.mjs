import { chromium } from 'playwright';

async function testModalImprovements() {
  console.log('\n🔍 TESTING WORLD-CLASS UX IMPROVEMENTS\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to local storefront
    const storeUrl = 'http://localhost:4000/store/paul-pahhggygggffffg';
    console.log(`1️⃣  Navigating to ${storeUrl}...`);

    await page.goto(storeUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(2000);

    // Initial screenshot
    await page.screenshot({
      path: '/tmp/01-storefront-initial.png'
    });
    console.log('   ✓ Initial view captured');

    // Find and click share button
    console.log('\n2️⃣  Clicking Share button...');
    const shareButton = await page.$('.share-button');

    if (shareButton) {
      await shareButton.click();
      await page.waitForTimeout(1500);

      // Modal opened screenshot
      await page.screenshot({
        path: '/tmp/02-modal-opened.png'
      });
      console.log('   ✓ Modal opened');

      // Analyze modal properties
      const analysis = await page.evaluate(() => {
        const overlay = document.querySelector('.share-menu-overlay');
        const content = document.querySelector('.share-menu-content');
        const closeBtn = document.querySelector('.share-menu-close');

        if (!overlay || !content || !closeBtn) {
          return { found: false };
        }

        const overlayStyle = window.getComputedStyle(overlay);
        const contentStyle = window.getComputedStyle(content);
        const closeBtnRect = closeBtn.getBoundingClientRect();
        const closeBtnStyle = window.getComputedStyle(closeBtn);

        return {
          found: true,
          backdrop: {
            background: overlayStyle.backgroundColor,
            backdropFilter: overlayStyle.backdropFilter,
            animation: overlayStyle.animation
          },
          modal: {
            borderRadius: contentStyle.borderRadius,
            boxShadow: contentStyle.boxShadow,
            animation: contentStyle.animation
          },
          closeButton: {
            width: Math.round(closeBtnRect.width),
            height: Math.round(closeBtnRect.height),
            minWidth: closeBtnStyle.minWidth,
            minHeight: closeBtnStyle.minHeight,
            borderRadius: closeBtnStyle.borderRadius
          }
        };
      });

      console.log('\n📊 MODAL ANALYSIS:');
      console.log('   Backdrop Color:', analysis.backdrop?.background);
      console.log('   Backdrop Filter:', analysis.backdrop?.backdropFilter);
      console.log('   Modal Border Radius:', analysis.modal?.borderRadius);
      console.log('   Close Button Size:', `${analysis.closeButton?.width}x${analysis.closeButton?.height}px`);

      // Hover over close button
      console.log('\n3️⃣  Hovering close button...');
      await page.hover('.share-menu-close');
      await page.waitForTimeout(600);

      await page.screenshot({
        path: '/tmp/03-close-hover.png'
      });
      console.log('   ✓ Close button hover captured');

      // Move away and hover WhatsApp
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);

      console.log('\n4️⃣  Hovering WhatsApp option...');
      await page.hover('.share-option.whatsapp');
      await page.waitForTimeout(600);

      await page.screenshot({
        path: '/tmp/04-whatsapp-hover.png'
      });
      console.log('   ✓ WhatsApp hover captured');

      // Check button sizes
      const buttonSizes = await page.evaluate(() => {
        const shareOptions = document.querySelectorAll('.share-option');
        return Array.from(shareOptions).map((btn, i) => {
          const rect = btn.getBoundingClientRect();
          const style = window.getComputedStyle(btn);
          return {
            button: ['WhatsApp', 'Instagram', 'Facebook'][i] || `Option ${i+1}`,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            minHeight: style.minHeight
          };
        });
      });

      console.log('\n📏 BUTTON TOUCH TARGETS:');
      buttonSizes.forEach(btn => {
        console.log(`   ${btn.button}: ${btn.width}x${btn.height}px (min: ${btn.minHeight})`);
      });

      console.log('\n✅ TEST COMPLETE!\n');
      console.log('📸 Screenshots saved to /tmp/:');
      console.log('   • 01-storefront-initial.png');
      console.log('   • 02-modal-opened.png');
      console.log('   • 03-close-hover.png');
      console.log('   • 04-whatsapp-hover.png');

    } else {
      console.log('   ❌ Share button not found');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testModalImprovements();
