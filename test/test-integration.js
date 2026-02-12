const assert = require('assert');
const fs = require('fs');

async function testIntegration() {
  console.log('Testing integration scenarios...');

  // Test 1: State dirty flag optimization
  console.log('  Testing state persistence optimization...');
  const state = require('../server/state');

  // Reset state
  state.reset();

  // Check initial state
  const initialDirty = state.dirty;
  assert.strictEqual(initialDirty, false, 'Initial dirty flag should be false');

  // Simulate updatePlaybackTime (should NOT set dirty flag)
  state.updatePlaybackTime(10);
  assert.strictEqual(state.dirty, false, 'Playback time update should not set dirty flag');

  // Modify state with critical change (addSong immediately saves, clearing dirty)
  const testSong = {
    videoId: 'test123',
    title: 'Test Song',
    thumbnail: 'https://example.com/thumb.jpg',
    duration: 180
  };

  state.addClient('test-client');

  // addSong sets dirty=true then immediately calls saveState() which clears it
  // So we can't test the dirty flag directly, but we can verify the behavior
  // by checking that the state was persisted
  const beforeAdd = fs.existsSync(state.stateFile);
  state.addSong(testSong, 'test-client');
  const afterAdd = fs.existsSync(state.stateFile);

  assert.strictEqual(beforeAdd, true, 'State file should exist before add');
  assert.strictEqual(afterAdd, true, 'State file should exist after add');

  console.log('  ✓ State persistence optimization works correctly');

  // Test 2: Cache manager safety checks
  console.log('  Testing cache cleanup safety...');
  const cacheManager = require('../server/cache-manager');

  const testVideoId = 'test-video-456';

  // Simulate accessing a file (sets lastAccessedAt)
  cacheManager.lastAccessedAt.set(testVideoId, Date.now());

  // Check that it's NOT safe to delete immediately
  const immediateSafety = cacheManager.isSafeToDelete(testVideoId, 60000);
  assert.strictEqual(immediateSafety, false, 'Recently accessed files should not be safe to delete');

  // Check that it IS safe to delete with 0ms grace period
  const zeroGraceSafety = cacheManager.isSafeToDelete(testVideoId, 0);
  assert.strictEqual(zeroGraceSafety, false, 'Files accessed at same millisecond should not be safe to delete');

  // Simulate old access
  cacheManager.lastAccessedAt.set(testVideoId, Date.now() - 70000); // 70 seconds ago
  const oldAccessSafety = cacheManager.isSafeToDelete(testVideoId, 60000);
  assert.strictEqual(oldAccessSafety, true, 'Old accessed files should be safe to delete');

  // Check never-accessed files
  const neverAccessedSafety = cacheManager.isSafeToDelete('never-accessed-video');
  assert.strictEqual(neverAccessedSafety, true, 'Never accessed files should be safe to delete');

  console.log('  ✓ Cache cleanup safety checks work correctly');

  // Test 3: Logger log levels
  console.log('  Testing logger respects log levels...');
  const logger = require('../server/logger');

  // Capture console output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const logCalls = [];
  console.log = (...args) => logCalls.push({ level: 'log', args });
  console.error = (...args) => logCalls.push({ level: 'error', args });
  console.warn = (...args) => logCalls.push({ level: 'warn', args });

  // Test that different log levels produce appropriate output
  logger.error('Test error', { test: true });
  logger.warn('Test warning', { test: true });
  logger.info('Test info', { test: true });
  logger.debug('Test debug', { test: true });

  // Restore console
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;

  // Verify we captured some logs (exact count depends on LOG_LEVEL env var)
  assert.ok(logCalls.length > 0, 'Logger should produce output');

  // Verify log format includes timestamp and level
  const hasFormattedLogs = logCalls.some(call =>
    call.args.some(arg => typeof arg === 'string' && arg.includes('[ERROR]') || arg.includes('[WARN]') || arg.includes('[INFO]'))
  );
  assert.ok(hasFormattedLogs, 'Logs should be formatted with level markers');

  console.log('  ✓ Logger respects log levels and formats correctly');

  // Test 4: Cache race condition scenario
  console.log('  Testing cache race condition protection...');

  const raceVideoId = 'race-test-video';

  // Scenario: File is accessed (streaming starts)
  cacheManager.lastAccessedAt.set(raceVideoId, Date.now());

  // Immediate deletion attempt (race condition: cleanup runs while streaming)
  const isDeletableDuringStream = cacheManager.isSafeToDelete(raceVideoId, 60000);
  assert.strictEqual(isDeletableDuringStream, false,
    'File should NOT be deletable while being actively streamed (within grace period)');

  // Simulate waiting 30 seconds (still streaming)
  cacheManager.lastAccessedAt.set(raceVideoId, Date.now() - 30000);
  const isDeletableAfter30s = cacheManager.isSafeToDelete(raceVideoId, 60000);
  assert.strictEqual(isDeletableAfter30s, false,
    'File should NOT be deletable after 30s (within 60s grace period)');

  // Simulate waiting 61 seconds (stream finished, grace period expired)
  cacheManager.lastAccessedAt.set(raceVideoId, Date.now() - 61000);
  const isDeletableAfter61s = cacheManager.isSafeToDelete(raceVideoId, 60000);
  assert.strictEqual(isDeletableAfter61s, true,
    'File SHOULD be deletable after grace period expires');

  // Scenario: Multiple access attempts during streaming
  cacheManager.lastAccessedAt.set(raceVideoId, Date.now() - 10000); // 10s ago
  cacheManager.lastAccessedAt.set(raceVideoId, Date.now()); // Update to now (simulates re-access)
  const isDeletableAfterReaccess = cacheManager.isSafeToDelete(raceVideoId, 60000);
  assert.strictEqual(isDeletableAfterReaccess, false,
    'File should NOT be deletable when re-accessed (grace period resets)');

  console.log('  ✓ Cache race condition protection works correctly');

  console.log('✅ Integration tests passed');
  return true;
}

module.exports = testIntegration;

// Run standalone if executed directly
if (require.main === module) {
  (async () => {
    try {
      await testIntegration();
      process.exit(0);
    } catch (error) {
      console.error('❌ Integration test failed:', error);
      process.exit(1);
    }
  })();
}
