const assert = require('assert');
const TestHelper = require('./test-helper');

async function testErrorHandling() {
  console.log('Testing error handling and recovery...');
  const browser = await TestHelper.launchBrowser();

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Test 1: Error overlay UI elements exist
    const elementsExist = await page.evaluate(() => {
      return {
        errorOverlay: !!document.getElementById('error-overlay'),
        errorMessage: !!document.getElementById('error-message'),
        errorCountdown: !!document.getElementById('error-countdown'),
        skipErrorBtn: !!document.getElementById('skip-error-btn')
      };
    });

    assert(elementsExist.errorOverlay, 'Error overlay should exist');
    assert(elementsExist.errorMessage, 'Error message element should exist');
    assert(elementsExist.errorCountdown, 'Error countdown element should exist');
    assert(elementsExist.skipErrorBtn, 'Skip error button should exist');
    console.log('  ✓ Error overlay UI elements present');

    // Test 2: Error overlay initially hidden
    const initiallyHidden = await page.evaluate(() => {
      const errorOverlay = document.getElementById('error-overlay');
      return errorOverlay.style.display === 'none' || errorOverlay.style.display === '';
    });

    assert(initiallyHidden, 'Error overlay should be initially hidden');
    console.log('  ✓ Error overlay initially hidden');

    // Test 3: Trigger video error and check overlay appears
    await page.evaluate(() => {
      const video = document.getElementById('video-player');
      video.src = 'invalid://url';
    });

    await new Promise(r => setTimeout(r, 500));

    const errorVisible = await page.evaluate(() => {
      const errorOverlay = document.getElementById('error-overlay');
      const loadingOverlay = document.getElementById('loading-overlay');
      return {
        errorVisible: errorOverlay.style.display === 'flex',
        loadingHidden: loadingOverlay.style.display === 'none',
        errorMessage: document.getElementById('error-message')?.textContent
      };
    });

    assert(errorVisible.errorVisible, 'Error overlay should be visible after error');
    assert(errorVisible.loadingHidden, 'Loading overlay should be hidden when error shows');
    assert(errorVisible.errorMessage, 'Error message should have content');
    console.log('  ✓ Error overlay appears on video error');

    // Test 4: Countdown is running
    const countdown1 = await page.evaluate(() => {
      return parseInt(document.getElementById('error-countdown')?.textContent || '0');
    });

    await new Promise(r => setTimeout(r, 2000));

    const countdown2 = await page.evaluate(() => {
      return parseInt(document.getElementById('error-countdown')?.textContent || '0');
    });

    assert(countdown2 < countdown1, 'Countdown should be decreasing');
    console.log('  ✓ Auto-skip countdown working');

    // Test 5: Skip button hides error overlay
    await page.evaluate(() => {
      document.getElementById('skip-error-btn').click();
    });

    await new Promise(r => setTimeout(r, 500));

    const errorHidden = await page.evaluate(() => {
      const errorOverlay = document.getElementById('error-overlay');
      return errorOverlay.style.display === 'none';
    });

    assert(errorHidden, 'Error overlay should be hidden after skip button click');
    console.log('  ✓ Skip button hides error overlay');

    console.log('✅ Error handling test passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testErrorHandling)
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testErrorHandling;
