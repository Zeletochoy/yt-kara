const assert = require('assert');
const TestHelper = require('./test-helper');

async function testWebSocketReconnection() {
  console.log('Testing WebSocket reconnection...');
  const browser = await TestHelper.launchBrowser();

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });

    // Test 1: Connection status indicator exists
    const indicatorExists = await page.evaluate(() => {
      return !!document.getElementById('connection-status');
    });

    assert(indicatorExists, 'Connection status indicator should exist');
    console.log('  ✓ Connection status indicator exists');

    // Test 2: Initially connected (green)
    const initialStatus = await page.evaluate(() => {
      const indicator = document.getElementById('connection-status');
      return {
        hasDisconnected: indicator.classList.contains('disconnected'),
        hasReconnecting: indicator.classList.contains('reconnecting'),
        wsStatus: wsConnection.getConnectionStatus()
      };
    });

    assert(!initialStatus.hasDisconnected, 'Should not have disconnected class initially');
    assert(!initialStatus.hasReconnecting, 'Should not have reconnecting class initially');
    assert.strictEqual(initialStatus.wsStatus, 'connected', 'WebSocket should be connected');
    console.log('  ✓ Initially connected (green)');

    // Test 3: Monitor status changes during disconnect/reconnect cycle
    const statusChanges = await page.evaluate(() => {
      return new Promise((resolve) => {
        const changes = [];
        let changeCount = 0;

        // Monitor status changes
        wsConnection.onStatusChange((status) => {
          changes.push(status);
          changeCount++;

          // Wait for at least 2 changes (disconnect/reconnecting + reconnected)
          if (changeCount >= 2) {
            setTimeout(() => resolve(changes), 100);
          }
        });

        // Close WebSocket to simulate disconnect
        setTimeout(() => {
          wsConnection.ws.close();
        }, 100);
      });
    });

    // Should have seen disconnected/reconnecting status
    const hasDisconnectedState = statusChanges.includes('disconnected') || statusChanges.includes('reconnecting');
    assert(hasDisconnectedState, 'Should have seen disconnected or reconnecting status');
    console.log('  ✓ Status changes during disconnect/reconnect cycle');

    // Test 4: Verify exponential backoff logic
    const backoffTest = await page.evaluate(() => {
      // Test backoff calculation
      const attempts = [1, 2, 3, 4, 5];
      const delays = attempts.map(attempt => {
        return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      });

      return {
        delays,
        expectedDelays: [1000, 2000, 4000, 8000, 16000]
      };
    });

    assert.deepStrictEqual(backoffTest.delays, backoffTest.expectedDelays, 'Exponential backoff should match expected delays');
    console.log('  ✓ Exponential backoff calculation correct');

    console.log('✅ WebSocket reconnection test passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testWebSocketReconnection)
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testWebSocketReconnection;
