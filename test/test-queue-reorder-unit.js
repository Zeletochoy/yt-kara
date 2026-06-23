const assert = require('assert');
const SessionState = require('../server/state');

// Set TEST_MODE to prevent corrupting real session data
process.env.TEST_MODE = 'true';

async function testQueueReordering() {
  console.log('Testing Queue Reordering (Unit Test)...');

  const state = new SessionState();
  state.reset(); // start with clean state

  // 1. Seed the queue with 3 songs
  const song1 = state.addSong({ videoId: 'V1', title: 'Song 1', thumbnail: 'T1', duration: 100 }, 'client1');
  const song2 = state.addSong({ videoId: 'V2', title: 'Song 2', thumbnail: 'T2', duration: 120 }, 'client1');
  const song3 = state.addSong({ videoId: 'V3', title: 'Song 3', thumbnail: 'T3', duration: 140 }, 'client1');

  assert.strictEqual(state.queue.length, 3);
  assert.deepStrictEqual(state.queue.map(s => s.id), [song1.id, song2.id, song3.id]);
  console.log('  ✓ Initial queue state is correct');

  // Test Case 1: Move song to the bottom (beforeId = null)
  console.log('  Testing move to bottom (beforeId = null)...');
  let success = state.reorderQueue(song1.id, null);
  assert.strictEqual(success, true);
  assert.deepStrictEqual(state.queue.map(s => s.id), [song2.id, song3.id, song1.id]);
  console.log('  ✓ Move to bottom works');

  // Test Case 2: Move song before another song
  // Move Song 1 (now at bottom) to be before Song 3 (middle)
  console.log('  Testing move before another song...');
  success = state.reorderQueue(song1.id, song3.id);
  assert.strictEqual(success, true);
  assert.deepStrictEqual(state.queue.map(s => s.id), [song2.id, song1.id, song3.id]);
  console.log('  ✓ Move before another song works');

  // Test Case 3: Move a song that was deleted (should abort)
  console.log('  Testing move of non-existent song (should abort)...');
  success = state.reorderQueue(999, song3.id); // 999 does not exist
  assert.strictEqual(success, false);
  assert.deepStrictEqual(state.queue.map(s => s.id), [song2.id, song1.id, song3.id]); // unchanged
  console.log('  ✓ Non-existent song aborts gracefully');

  // Test Case 4: Move a song before a target that was deleted (should abort)
  console.log('  Testing move before non-existent target (should abort)...');
  success = state.reorderQueue(song1.id, 999); // 999 does not exist
  assert.strictEqual(success, false);
  assert.deepStrictEqual(state.queue.map(s => s.id), [song2.id, song1.id, song3.id]); // unchanged
  console.log('  ✓ Non-existent target aborts gracefully');

  console.log('✅ Queue reordering unit tests passed!');
  return true;
}

module.exports = testQueueReordering;

// Run standalone if executed directly
if (require.main === module) {
  (async () => {
    try {
      await testQueueReordering();
      process.exit(0); // Explicitly exit to stop SessionState auto-save interval
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  })();
}
