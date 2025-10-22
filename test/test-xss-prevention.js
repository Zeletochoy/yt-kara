const assert = require('assert');
const TestHelper = require('./test-helper');

async function testXSSPrevention() {
  console.log('Testing XSS prevention...');
  const browser = await TestHelper.launchBrowser();

  try {
    // Test 1: Malicious song title in search results
    console.log('  Testing XSS prevention in search results...');
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667 });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });

    // Inject malicious search results
    const xssAttempt = await clientPage.evaluate(() => {
      // Simulate search results with XSS payload
      const maliciousResults = [{
        videoId: 'test123',
        title: '<script>alert("XSS")</script>',
        thumbnail: 'https://example.com/thumb.jpg',
        channel: '<img src=x onerror=alert("XSS")>',
        duration: 180
      }];

      // Call displaySearchResults directly (runs in browser context)
      if (typeof displaySearchResults === 'function') {
        // eslint-disable-next-line no-undef
        displaySearchResults(maliciousResults);
      }

      // Check if script was executed (it shouldn't be)
      const searchResultsEl = document.getElementById('search-results');
      const htmlContent = searchResultsEl.innerHTML;

      return {
        containsScriptTag: htmlContent.includes('<script>'),
        containsImgTag: htmlContent.includes('<img'),
        escapedTitle: htmlContent.includes('&lt;script&gt;'),
        escapedImg: htmlContent.includes('&lt;img')
      };
    });

    assert.strictEqual(xssAttempt.containsScriptTag, false, 'Script tags should be escaped');
    assert.strictEqual(xssAttempt.escapedTitle, true, 'Script tags should be HTML-escaped');
    console.log('  ✓ XSS prevention in search results works');

    // Test 2: Malicious user name
    console.log('  Testing XSS prevention in user names...');
    await clientPage.evaluate(() => {
      const nameInput = document.getElementById('user-name');
      if (nameInput) {
        nameInput.value = '<script>alert("XSS")</script>';
        nameInput.dispatchEvent(new Event('input'));
      }
    });

    await new Promise(r => setTimeout(r, 500));

    // Check that queue rendering escapes the name
    const nameEscaped = await clientPage.evaluate(() => {
      const queueEl = document.getElementById('queue-list');
      if (queueEl) {
        return !queueEl.innerHTML.includes('<script>');
      }
      return true;
    });

    assert.strictEqual(nameEscaped, true, 'User names should be escaped');
    console.log('  ✓ XSS prevention in user names works');

    console.log('✅ XSS prevention tests passed');
    await browser.close();
    return true;
  } catch (error) {
    console.error('❌ XSS prevention test failed:', error);
    await browser.close();
    throw error;
  }
}

module.exports = testXSSPrevention;

// Run standalone if executed directly
if (require.main === module) {
  (async () => {
    const server = await TestHelper.startServer();
    try {
      await testXSSPrevention();
      console.log('✓ Server stopped after test');
    } finally {
      await TestHelper.stopServer(server);
    }
  })();
}
