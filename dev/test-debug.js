const puppeteer = require('puppeteer');

async function testDebug() {
  console.log('🔍 Debugging YT-Kara issues...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test 1: Check QR Code generation
    console.log('📱 Checking QR code...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Wait for QR code to generate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check QR code status
    const qrCodeInfo = await page.evaluate(() => {
      const qrContainer = document.getElementById('qr-code');
      const canvas = qrContainer ? qrContainer.querySelector('canvas') : null;
      const connectionUrl = document.getElementById('connection-url');

      return {
        hasQRContainer: !!qrContainer,
        hasCanvas: !!canvas,
        canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
        connectionUrl: connectionUrl ? connectionUrl.textContent : null,
        qrContainerHTML: qrContainer ? qrContainer.innerHTML.substring(0, 100) : null
      };
    });

    console.log('QR Code Status:');
    console.log('  - QR Container exists:', qrCodeInfo.hasQRContainer);
    console.log('  - Canvas exists:', qrCodeInfo.hasCanvas);
    console.log('  - Canvas size:', qrCodeInfo.canvasSize);
    console.log('  - Connection URL:', qrCodeInfo.connectionUrl);

    // Test 2: Check video playback
    console.log('\n🎥 Testing video playback...');

    // Open client page
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667, isMobile: true });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });

    // Search for a simple test video
    await clientPage.type('#search-input', 'Rick Astley Never Gonna Give You Up');
    await clientPage.click('#search-btn');

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 4000));

    const searchResults = await clientPage.evaluate(() => {
      const results = document.querySelectorAll('#search-results .song-card');
      return results.length;
    });

    console.log(`  - Found ${searchResults} search results`);

    if (searchResults > 0) {
      // Click first result
      await clientPage.evaluate(() => {
        const firstBtn = document.querySelector('#search-results .song-action');
        if (firstBtn) firstBtn.click();
      });

      console.log('  - Added video to queue');

      // Wait for video to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check video status on karaoke page
      const videoStatus = await page.evaluate(() => {
        const video = document.getElementById('video-player');
        const noVideo = document.getElementById('no-video');

        return {
          videoSrc: video ? video.src : null,
          videoError: video ? video.error : null,
          videoReadyState: video ? video.readyState : null,
          noVideoDisplay: noVideo ? window.getComputedStyle(noVideo).display : null,
          videoDisplay: video ? window.getComputedStyle(video).display : null
        };
      });

      console.log('\nVideo Player Status:');
      console.log('  - Video src:', videoStatus.videoSrc ? 'Present' : 'Missing');
      console.log('  - Video ready state:', videoStatus.videoReadyState);
      console.log('  - Video display:', videoStatus.videoDisplay);
      console.log('  - No-video display:', videoStatus.noVideoDisplay);

      // Check console errors
      const consoleErrors = await page.evaluate(() => {
        return window.__consoleErrors || [];
      });

      if (consoleErrors.length > 0) {
        console.log('\n⚠️  Console errors detected:');
        consoleErrors.forEach(err => console.log('  -', err));
      }
    }

    // Take a debug screenshot
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('\n📸 Debug screenshot saved as debug-screenshot.png');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  } finally {
    await browser.close();
  }
}

// Capture console errors - currently unused but kept for debugging
// async function setupErrorCapture(page) {
//   await page.evaluateOnNewDocument(() => {
//     window.__consoleErrors = [];
//     const originalError = console.error;
//     console.error = function(...args) {
//       window.__consoleErrors.push(args.join(' '));
//       originalError.apply(console, args);
//     };
//   });
// }

if (require.main === module) {
  testDebug().catch(console.error);
}

module.exports = testDebug;
