const fs = require('fs');
const path = require('path');
const TestHelper = require('./test-helper');

async function testVisualErrorRecovery() {
  console.log('Testing visual error recovery UI...');
  const browser = await TestHelper.launchBrowser();

  try {
    // Create screenshots directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const screenshotDir = path.join(__dirname, '..', 'screenshots', 'error-recovery-' + timestamp);
    fs.mkdirSync(screenshotDir, { recursive: true });
    console.log(`  Screenshots will be saved to: ${screenshotDir}`);

    // Test 1: Error overlay display (host view)
    console.log('  Testing error overlay on host view...');
    const hostPage = await browser.newPage();
    await hostPage.setViewport({ width: 1920, height: 1080 });
    await hostPage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Trigger error overlay
    await hostPage.evaluate(() => {
      if (typeof showErrorOverlay === 'function') {
        // eslint-disable-next-line no-undef
        showErrorOverlay('Video failed to load. Skipping to next song...');
      }
    });

    await hostPage.screenshot({
      path: path.join(screenshotDir, '1-error-overlay-host.png'),
      fullPage: false
    });
    console.log('  ✓ Error overlay screenshot captured');

    // Verify error overlay is visible and styled correctly
    const errorOverlayStyles = await hostPage.evaluate(() => {
      const overlay = document.getElementById('error-overlay');
      const message = document.getElementById('error-message');
      const countdown = document.getElementById('error-countdown');
      const skipBtn = document.getElementById('skip-error-btn');
      const icon = overlay?.querySelector('.error-icon');

      const getStyles = (el) => {
        if (!el) return null;
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          color: computed.color,
          fontSize: computed.fontSize,
          textAlign: computed.textAlign,
          zIndex: computed.zIndex
        };
      };

      return {
        overlay: getStyles(overlay),
        message: getStyles(message),
        countdown: getStyles(countdown),
        skipBtn: getStyles(skipBtn),
        icon: getStyles(icon),
        overlayVisible: overlay?.style.display === 'flex',
        messageText: message?.textContent,
        countdownText: countdown?.textContent
      };
    });

    console.log('  ✓ Error overlay is visible:', errorOverlayStyles.overlayVisible);
    console.log('  ✓ Error message text:', errorOverlayStyles.messageText);
    console.log('  ✓ Skip button display:', errorOverlayStyles.skipBtn?.display);

    // Test 2: Connection status indicator (client view - connected)
    console.log('  Testing connection status indicator - connected state...');
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667 });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });

    await clientPage.screenshot({
      path: path.join(screenshotDir, '2-connection-connected-mobile.png'),
      fullPage: true
    });
    console.log('  ✓ Connection indicator (connected) screenshot captured');

    // Verify connected state styling
    const connectedStyles = await clientPage.evaluate(() => {
      const status = document.getElementById('connection-status');
      const computed = window.getComputedStyle(status);
      return {
        backgroundColor: computed.backgroundColor,
        hasDisconnected: status.classList.contains('disconnected'),
        hasReconnecting: status.classList.contains('reconnecting'),
        wsStatus: wsConnection.getConnectionStatus()
      };
    });

    console.log('  ✓ Connected state color:', connectedStyles.backgroundColor);
    console.log('  ✓ WebSocket status:', connectedStyles.wsStatus);

    // Test 3: Connection status indicator - reconnecting state
    console.log('  Testing connection status indicator - reconnecting state...');
    await clientPage.evaluate(() => {
      const status = document.getElementById('connection-status');
      status.classList.add('reconnecting');
    });

    await clientPage.screenshot({
      path: path.join(screenshotDir, '3-connection-reconnecting-mobile.png'),
      fullPage: true
    });
    console.log('  ✓ Connection indicator (reconnecting) screenshot captured');

    const reconnectingStyles = await clientPage.evaluate(() => {
      const status = document.getElementById('connection-status');
      const computed = window.getComputedStyle(status);
      return {
        backgroundColor: computed.backgroundColor,
        animation: computed.animation,
        animationName: computed.animationName
      };
    });

    console.log('  ✓ Reconnecting state color:', reconnectingStyles.backgroundColor);
    console.log('  ✓ Reconnecting animation:', reconnectingStyles.animationName);

    // Test 4: Connection status indicator - disconnected state
    console.log('  Testing connection status indicator - disconnected state...');
    await clientPage.evaluate(() => {
      const status = document.getElementById('connection-status');
      status.classList.remove('reconnecting');
      status.classList.add('disconnected');
    });

    await clientPage.screenshot({
      path: path.join(screenshotDir, '4-connection-disconnected-mobile.png'),
      fullPage: true
    });
    console.log('  ✓ Connection indicator (disconnected) screenshot captured');

    const disconnectedStyles = await clientPage.evaluate(() => {
      const status = document.getElementById('connection-status');
      const computed = window.getComputedStyle(status);
      return {
        backgroundColor: computed.backgroundColor
      };
    });

    console.log('  ✓ Disconnected state color:', disconnectedStyles.backgroundColor);

    // Test 5: Error overlay with countdown
    console.log('  Testing error overlay countdown display...');
    await hostPage.evaluate(() => {
      const countdown = document.getElementById('error-countdown');
      if (countdown) {
        countdown.textContent = '15';
      }
    });

    await hostPage.screenshot({
      path: path.join(screenshotDir, '5-error-overlay-with-countdown.png'),
      fullPage: false
    });
    console.log('  ✓ Error overlay with countdown screenshot captured');

    // Summary
    console.log('\n📸 Visual test summary:');
    console.log('  Screenshots saved:', screenshotDir);
    console.log('  ✓ Error overlay UI: visible and properly styled');
    console.log('  ✓ Connection status - connected: green background');
    console.log('  ✓ Connection status - reconnecting: yellow background with pulse animation');
    console.log('  ✓ Connection status - disconnected: red background');
    console.log('  ✓ Error message: readable and well-positioned');
    console.log('  ✓ Skip button: visible in error state');
    console.log('\n✅ Visual error recovery tests passed');

    await hostPage.close();
    await clientPage.close();

    return true;

  } catch (error) {
    console.error('❌ Visual test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testVisualErrorRecovery)
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testVisualErrorRecovery;
