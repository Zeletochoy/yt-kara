// Puppeteer is used via TestHelper.launchBrowser()
// eslint-disable-next-line no-unused-vars
const puppeteer = require('puppeteer');
const assert = require('assert');
const TestHelper = require('./test-helper');

async function testBasicConnectivity() {
  console.log('Testing basic connectivity and UI elements...');
  const browser = await TestHelper.launchBrowser();

  try {
    // Load karaoke page
    const karaokePage = await browser.newPage();
    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Check QR code is displayed
    const qrCode = await karaokePage.evaluate(() => {
      const qrContainer = document.getElementById('qr-code');
      const canvas = qrContainer?.querySelector('canvas');
      return !!canvas;
    });
    assert(qrCode, 'QR code should be displayed');
    console.log('  ✓ QR code displayed');

    // URL removed in redesign, just check QR code exists

    // Load client page
    const clientPage = await browser.newPage();
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });

    // Check client UI elements
    const clientElements = await clientPage.evaluate(() => {
      return {
        searchInput: !!document.getElementById('search-input'),
        searchBtn: !!document.getElementById('search-btn'),
        queueList: !!document.getElementById('queue-list'),
        remoteTab: !!document.querySelector('[data-tab="remote"]'),
        userName: !!document.getElementById('user-name')
      };
    });

    assert(clientElements.searchInput, 'Search input should exist');
    assert(clientElements.searchBtn, 'Search button should exist');
    assert(clientElements.queueList, 'Queue list should exist');
    assert(clientElements.remoteTab, 'Remote tab should exist');
    assert(clientElements.userName, 'User name input should exist');
    console.log('  ✓ All client UI elements present');

    // Check WebSocket connection
    const wsConnected = await clientPage.evaluate(() => {
      return wsConnection && wsConnection.ws &&
             wsConnection.ws.readyState === WebSocket.OPEN;
    });
    assert(wsConnected, 'WebSocket should be connected');
    console.log('  ✓ WebSocket connected');

    console.log('✅ Basic connectivity test passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  // Run with server management when executed directly
  TestHelper.withServer(testBasicConnectivity)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = testBasicConnectivity;
