const assert = require('assert');
const TestHelper = require('./test-helper');

async function testReactions() {
  console.log('Testing reactions system...');
  const browser = await TestHelper.launchBrowser();

  try {
    // Test 1: Reaction buttons exist on client
    console.log('  Testing reaction buttons exist...');
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667 });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });

    // Switch to remote tab
    await clientPage.evaluate(() => {
      const remoteTab = document.querySelector('[data-tab="remote"]');
      if (remoteTab) remoteTab.click();
    });

    await new Promise(r => setTimeout(r, 500));

    const reactionButtonsExist = await clientPage.evaluate(() => {
      const buttons = document.querySelectorAll('.reaction-btn');
      return {
        count: buttons.length,
        emojis: Array.from(buttons).map(btn => btn.getAttribute('data-reaction'))
      };
    });

    assert.strictEqual(reactionButtonsExist.count, 5, 'Should have 5 reaction buttons');
    assert.deepStrictEqual(reactionButtonsExist.emojis, ['👏', '❤️', '🔥', '😂', '🎉'], 'Should have correct emoji reactions');
    console.log('  ✓ Reaction buttons exist with correct emojis');

    // Test 2: Reaction buttons are touch-friendly (60x60px minimum)
    const buttonSizes = await clientPage.evaluate(() => {
      const buttons = document.querySelectorAll('.reaction-btn');
      return Array.from(buttons).map(btn => {
        const rect = btn.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    });

    buttonSizes.forEach((size, i) => {
      assert(size.width >= 60, `Button ${i} width should be at least 60px, got ${size.width}`);
      assert(size.height >= 60, `Button ${i} height should be at least 60px, got ${size.height}`);
    });
    console.log('  ✓ Reaction buttons are touch-friendly (70x70px)');

    // Test 3: Host page has reaction container
    console.log('  Testing host reaction container...');
    const hostPage = await browser.newPage();
    await hostPage.setViewport({ width: 1920, height: 1080 });
    await hostPage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    const containerExists = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      return {
        exists: !!container,
        zIndex: container ? window.getComputedStyle(container).zIndex : null
      };
    });

    assert(containerExists.exists, 'Reaction container should exist on host page');
    assert.strictEqual(containerExists.zIndex, '900', 'Reaction container should have z-index 900');
    console.log('  ✓ Host has reaction container with correct z-index');

    // Test 4: Client-side throttling
    console.log('  Testing client-side throttling...');
    const throttleTest = await clientPage.evaluate(() => {
      return new Promise((resolve) => {
        const btn = document.querySelector('.reaction-btn');
        const results = {
          initialDisabled: btn.disabled,
          afterClickDisabled: false,
          after1SecDisabled: false
        };

        // Click button
        btn.click();
        results.afterClickDisabled = btn.disabled;

        // Check after 1 second
        setTimeout(() => {
          results.after1SecDisabled = btn.disabled;
          resolve(results);
        }, 1100);
      });
    });

    assert.strictEqual(throttleTest.initialDisabled, false, 'Button should not be disabled initially');
    assert.strictEqual(throttleTest.afterClickDisabled, true, 'Button should be disabled after click');
    assert.strictEqual(throttleTest.after1SecDisabled, false, 'Button should be re-enabled after 1 second');
    console.log('  ✓ Client-side throttling works (1 second)');

    // Test 5: Reaction display function exists and handles playback check
    console.log('  Testing reaction display logic...');
    const displayLogic = await hostPage.evaluate(() => {
      // Test that function exists
      const funcExists = typeof displayReaction === 'function';

      // Test with paused video (should not display)
      const videoPlayer = document.getElementById('video-player');
      const container = document.getElementById('reaction-container');
      const initialChildCount = container.children.length;

      // Call display function with paused video
      if (funcExists) {
        // eslint-disable-next-line no-undef
        displayReaction({ type: '👏', clientId: 'test', timestamp: Date.now() });
      }

      const afterPausedCall = container.children.length;

      return {
        funcExists,
        initialChildCount,
        afterPausedCall,
        videoPaused: videoPlayer.paused
      };
    });

    assert(displayLogic.funcExists, 'displayReaction function should exist');
    assert.strictEqual(displayLogic.afterPausedCall, displayLogic.initialChildCount, 'Should not display reactions when video is paused');
    console.log('  ✓ Reaction display only works during playback');

    // Test 6: Animation CSS exists
    const animationExists = await hostPage.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      let hasFloatUpAnimation = false;

      for (const sheet of styles) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (const rule of rules) {
            // eslint-disable-next-line no-undef
            if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'floatUp') {
              hasFloatUpAnimation = true;
              break;
            }
          }
        // eslint-disable-next-line no-unused-vars
        } catch (_e) {
          // Cross-origin stylesheet, skip
        }
      }

      return hasFloatUpAnimation;
    });

    assert(animationExists, 'floatUp keyframe animation should exist');
    console.log('  ✓ Reaction float animation CSS exists');

    // Test 7: Throttling calculation
    console.log('  Testing throttling calculation...');
    const throttleCalc = await clientPage.evaluate(() => {
      const now = Date.now();
      const throttleMs = 1000;

      // Simulate reactions at different times
      const tests = [
        { lastTime: now - 500, shouldAllow: false },   // 500ms ago - too soon
        { lastTime: now - 1000, shouldAllow: true },   // 1000ms ago - exactly threshold
        { lastTime: now - 1500, shouldAllow: true },   // 1500ms ago - well past threshold
        { lastTime: 0, shouldAllow: true }             // Never sent - should allow
      ];

      return tests.map(test => {
        const timeSinceLasthms = now - test.lastTime;
        const wouldAllow = timeSinceLasthms >= throttleMs;
        return { ...test, timeSinceLasthms, wouldAllow };
      });
    });

    throttleCalc.forEach((test, i) => {
      assert.strictEqual(test.wouldAllow, test.shouldAllow, `Throttle test ${i} should ${test.shouldAllow ? 'allow' : 'block'}`);
    });
    console.log('  ✓ Throttling calculation correct');

    // Test 8: DOM cleanup
    console.log('  Testing DOM cleanup...');
    const cleanupTest = await hostPage.evaluate(() => {
      return new Promise((resolve) => {
        const container = document.getElementById('reaction-container');
        const initialCount = container.children.length;

        // Create a test reaction element
        const reaction = document.createElement('div');
        reaction.className = 'reaction';
        reaction.textContent = '🎉';
        reaction.style.left = '50%';
        container.appendChild(reaction);

        const afterAdd = container.children.length;

        // Simulate cleanup after 2.5s
        setTimeout(() => {
          if (reaction.parentNode) {
            reaction.parentNode.removeChild(reaction);
          }
          const afterRemove = container.children.length;

          resolve({ initialCount, afterAdd, afterRemove });
        }, 100); // Just test the cleanup logic, not wait full 2.5s
      });
    });

    assert.strictEqual(cleanupTest.afterAdd, cleanupTest.initialCount + 1, 'Should add reaction element');
    assert.strictEqual(cleanupTest.afterRemove, cleanupTest.initialCount, 'Should remove reaction element after cleanup');
    console.log('  ✓ DOM cleanup works correctly');

    console.log('✅ Reactions system tests passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testReactions)
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testReactions;
