const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cacheManager = require('../server/cache-manager');

async function testCacheRecovery() {
  console.log('Testing cache error recovery...');

  const testVideoId = 'test-video-123';
  const cacheDir = path.join(__dirname, '..', 'data', 'cache', testVideoId);

  try {
    // Clean up test cache before starting
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }

    // Test 1: Corrupted cache detection (metadata exists but video file missing)
    console.log('  Testing corrupted cache detection...');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'metadata.json'),
      JSON.stringify({
        videoFile: 'video.mp4',
        duration: 180,
        title: 'Test Video',
        downloadedAt: Date.now()
      })
    );

    // Video file doesn't exist, so isCached should detect corruption and clean up
    const isCorrupted = cacheManager.isCached(testVideoId);
    assert.strictEqual(isCorrupted, false, 'Should detect corrupted cache (missing video file)');
    assert.strictEqual(fs.existsSync(cacheDir), false, 'Should clean up corrupted cache directory');
    console.log('  ✓ Corrupted cache detected and cleaned up');

    // Test 2: Invalid metadata structure detection
    console.log('  Testing invalid metadata detection...');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'metadata.json'),
      JSON.stringify({
        // Missing required fields: videoFile, duration
        title: 'Test Video'
      })
    );

    const metadata = cacheManager.getMetadata(testVideoId);
    assert.strictEqual(metadata, null, 'Should return null for invalid metadata');
    assert.strictEqual(fs.existsSync(cacheDir), false, 'Should clean up cache with invalid metadata');
    console.log('  ✓ Invalid metadata detected and cache cleaned up');

    // Test 3: Malformed JSON detection
    console.log('  Testing malformed JSON handling...');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'metadata.json'),
      'invalid json {'
    );

    const malformedMetadata = cacheManager.getMetadata(testVideoId);
    assert.strictEqual(malformedMetadata, null, 'Should return null for malformed JSON');
    assert.strictEqual(fs.existsSync(cacheDir), false, 'Should clean up cache with malformed JSON');
    console.log('  ✓ Malformed JSON handled and cache cleaned up');

    // Test 4: Cache invalidation
    console.log('  Testing cache invalidation...');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'metadata.json'),
      JSON.stringify({
        videoFile: 'video.mp4',
        duration: 180,
        title: 'Test Video',
        downloadedAt: Date.now()
      })
    );
    fs.writeFileSync(path.join(cacheDir, 'video.mp4'), 'fake video data');

    // Cache should exist now
    assert.strictEqual(cacheManager.isCached(testVideoId), true, 'Cache should exist before invalidation');

    // Invalidate the cache
    cacheManager.invalidate(testVideoId);
    assert.strictEqual(fs.existsSync(cacheDir), false, 'Cache should be deleted after invalidation');
    assert.strictEqual(cacheManager.isCached(testVideoId), false, 'isCached should return false after invalidation');
    console.log('  ✓ Cache invalidation works correctly');

    // Test 5: Valid cache (fallback works correctly)
    console.log('  Testing valid cache detection...');
    fs.mkdirSync(cacheDir, { recursive: true });
    const validMetadata = {
      videoFile: 'video.mp4',
      duration: 180,
      title: 'Test Video',
      downloadedAt: Date.now()
    };
    fs.writeFileSync(
      path.join(cacheDir, 'metadata.json'),
      JSON.stringify(validMetadata)
    );
    fs.writeFileSync(path.join(cacheDir, 'video.mp4'), 'fake video data');

    assert.strictEqual(cacheManager.isCached(testVideoId), true, 'Should detect valid cache');
    const retrievedMetadata = cacheManager.getMetadata(testVideoId);
    assert.strictEqual(retrievedMetadata.videoFile, 'video.mp4', 'Should retrieve correct metadata');
    assert.strictEqual(retrievedMetadata.duration, 180, 'Should retrieve correct duration');
    console.log('  ✓ Valid cache detected correctly (fallback works)');

    console.log('✅ Cache error recovery tests passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    // Clean up test cache
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  testCacheRecovery()
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testCacheRecovery;
