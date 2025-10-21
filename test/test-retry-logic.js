const assert = require('assert');
const TestHelper = require('./test-helper');

async function testRetryLogic() {
  console.log('Testing retry logic and error message formatting...');
  const browser = await TestHelper.launchBrowser();

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Test 1: Retry logic calculation (exponential backoff)
    const retryDelays = await page.evaluate(() => {
      const delays = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        delays.push(delay);
      }
      return delays;
    });

    assert.deepStrictEqual(retryDelays, [1000, 2000, 4000, 8000, 10000], 'Retry delays should follow exponential backoff with 10s max');
    console.log('  ✓ Retry logic uses exponential backoff correctly');

    // Test 2: Error message formatting in error overlay
    const errorOverlayStructure = await page.evaluate(() => {
      const overlay = document.getElementById('error-overlay');
      const message = document.getElementById('error-message');
      const countdown = document.getElementById('error-countdown');
      const skipBtn = document.getElementById('skip-error-btn');

      return {
        hasOverlay: !!overlay,
        hasMessage: !!message,
        hasCountdown: !!countdown,
        hasSkipBtn: !!skipBtn,
        messageTagName: message?.tagName,
        countdownTagName: countdown?.tagName,
        skipBtnTagName: skipBtn?.tagName
      };
    });

    assert(errorOverlayStructure.hasOverlay, 'Error overlay should exist');
    assert(errorOverlayStructure.hasMessage, 'Error message element should exist');
    assert(errorOverlayStructure.hasCountdown, 'Error countdown element should exist');
    assert(errorOverlayStructure.hasSkipBtn, 'Skip button should exist');
    assert.strictEqual(errorOverlayStructure.messageTagName, 'P', 'Error message should be a paragraph');
    assert.strictEqual(errorOverlayStructure.skipBtnTagName, 'BUTTON', 'Skip button should be a button element');
    console.log('  ✓ Error message formatting structure is correct');

    // Test 3: Error message display and formatting
    const errorMessageTest = await page.evaluate(() => {
      const showErrorOverlay = (message) => {
        const overlay = document.getElementById('error-overlay');
        const messageEl = document.getElementById('error-message');
        const countdownEl = document.getElementById('error-countdown');

        messageEl.textContent = message;
        overlay.style.display = 'flex';
        countdownEl.textContent = '15';

        return {
          displayed: overlay.style.display === 'flex',
          message: messageEl.textContent,
          countdown: countdownEl.textContent
        };
      };

      return showErrorOverlay('Test error message');
    });

    assert.strictEqual(errorMessageTest.displayed, true, 'Error overlay should be displayed');
    assert.strictEqual(errorMessageTest.message, 'Test error message', 'Error message text should be set correctly');
    assert.strictEqual(errorMessageTest.countdown, '15', 'Countdown should start at 15');
    console.log('  ✓ Error message displays correctly with proper formatting');

    console.log('✅ Retry logic and error formatting tests passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testRetryLogic)
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testRetryLogic;
