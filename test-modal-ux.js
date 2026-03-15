const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('\n🔍 TESTING WORLD-CLASS UX IMPROVEMENTS\n');
  
  console.log('1️⃣  Navigating to storefront...');
  await page.goto('http://localhost:4000/store/paul-pahhggygggffffg', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Initial screenshot
  await page.screenshot({ 
    path: '/tmp/01-storefront-initial.png'
  });
  console.log('   ✓ Initial view captured');
  
  // Click share button
  console.log('\n2️⃣  Clicking Share button...');
  const shareButton = await page.$('.share-button');
  if (shareButton) {
    await shareButton.click();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await page.screenshot({ 
      path: '/tmp/02-modal-opened.png'
    });
    console.log('   ✓ Modal opened');
    
    // Analyze modal
    const analysis = await page.evaluate(() => {
      const overlay = document.querySelector('.share-menu-overlay');
      const closeBtn = document.querySelector('.share-menu-close');
      
      if (!overlay || !closeBtn) return { found: false };
      
      const overlayStyle = window.getComputedStyle(overlay);
      const closeBtnRect = closeBtn.getBoundingClientRect();
      
      return {
        found: true,
        backdrop: overlayStyle.backgroundColor,
        backdropFilter: overlayStyle.backdropFilter,
        closeButtonSize: {
          width: Math.round(closeBtnRect.width),
          height: Math.round(closeBtnRect.height)
        }
      };
    });
    
    console.log('\n📊 MODAL ANALYSIS:');
    console.log('   Backdrop:', analysis.backdrop);
    console.log('   Backdrop Filter:', analysis.backdropFilter);
    console.log('   Close Button Size:', analysis.closeButtonSize);
    
    // Hover close button
    console.log('\n3️⃣  Hovering close button...');
    const closeBtn = await page.$('.share-menu-close');
    if (closeBtn) {
      await closeBtn.hover();
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await page.screenshot({ 
        path: '/tmp/03-close-hover.png'
      });
      console.log('   ✓ Close button hover captured');
    }
    
    // Hover share option
    await page.mouse.move(100, 100);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('\n4️⃣  Hovering WhatsApp option...');
    const whatsappBtn = await page.$('.share-option.whatsapp');
    if (whatsappBtn) {
      await whatsappBtn.hover();
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await page.screenshot({ 
        path: '/tmp/04-whatsapp-hover.png'
      });
      console.log('   ✓ WhatsApp hover captured');
    }
    
    console.log('\n✅ ALL SCREENSHOTS SAVED TO /tmp/');
    console.log('   01-storefront-initial.png');
    console.log('   02-modal-opened.png');
    console.log('   03-close-hover.png');
    console.log('   04-whatsapp-hover.png');
    
  } else {
    console.log('   ❌ Share button not found');
  }
  
  await browser.close();
})();
