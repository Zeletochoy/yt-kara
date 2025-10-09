const puppeteer = require('puppeteer');

async function testQR() {
  console.log('🔍 Testing QR code generation...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Add console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Wait a bit for QR code generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check QR code and QRCode library status
    const qrInfo = await page.evaluate(() => {
      const qrContainer = document.getElementById('qr-code');
      const canvas = qrContainer ? qrContainer.querySelector('canvas') : null;

      return {
        hasQRCodeLib: typeof QRCode !== 'undefined',
        QRCodeType: typeof QRCode,
        hasToCanvas: typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function',
        qrContainerExists: !!qrContainer,
        qrContainerHTML: qrContainer ? qrContainer.innerHTML : null,
        hasCanvas: !!canvas,
        canvasDetails: canvas ? {
          width: canvas.width,
          height: canvas.height,
          dataURL: canvas.toDataURL().substring(0, 50)
        } : null
      };
    });

    console.log('QR Code Debug Info:');
    console.log('  QRCode library loaded:', qrInfo.hasQRCodeLib);
    console.log('  QRCode type:', qrInfo.QRCodeType);
    console.log('  Has toCanvas method:', qrInfo.hasToCanvas);
    console.log('  QR container exists:', qrInfo.qrContainerExists);
    console.log('  Canvas exists:', qrInfo.hasCanvas);
    console.log('  Canvas details:', qrInfo.canvasDetails);
    console.log('  Container HTML:', qrInfo.qrContainerHTML);

    // Try to manually generate QR code
    console.log('\n📱 Attempting manual QR generation...');
    const manualResult = await page.evaluate(() => {
      if (typeof QRCode === 'undefined') {
        return { error: 'QRCode not defined' };
      }

      const testCanvas = document.createElement('canvas');
      const testUrl = 'http://localhost:8080/client';

      return new Promise((resolve) => {
        try {
          QRCode.toCanvas(testCanvas, testUrl, {
            width: 150,
            margin: 1
          }, (error) => {
            if (error) {
              resolve({ error: error.message });
            } else {
              resolve({
                success: true,
                canvasWidth: testCanvas.width,
                canvasHeight: testCanvas.height,
                hasImageData: testCanvas.toDataURL().length > 100
              });
            }
          });
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });

    console.log('Manual generation result:', manualResult);

    // Check what setupQRCode function does
    const setupResult = await page.evaluate(() => {
      if (typeof setupQRCode === 'function') {
        // Call it again to see if it works
        // setupQRCode();
        return 'setupQRCode called';
      }
      return 'setupQRCode not found';
    });

    console.log('Setup function:', setupResult);

    // Wait and check again
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalCheck = await page.evaluate(() => {
      const qrContainer = document.getElementById('qr-code');
      const canvas = qrContainer ? qrContainer.querySelector('canvas') : null;
      return {
        hasCanvas: !!canvas,
        canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null
      };
    });

    console.log('\n✅ Final check:', finalCheck);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testQR().catch(console.error);
}

module.exports = testQR;
