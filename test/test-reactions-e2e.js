// Puppeteer is used via TestHelper.launchBrowser()
// eslint-disable-next-line no-unused-vars
const puppeteer = require('puppeteer');
const assert = require('assert');
const TestHelper = require('./test-helper');

async function testReactionsE2E() {
  console.log('Testing end-to-end reactions flow...');
  const browser = await TestHelper.launchBrowser();

  try {
    // Create host page and 3 client pages to simulate multiple users
    const hostPage = await browser.newPage();
    const client1 = await browser.newPage();
    const client2 = await browser.newPage();
    const client3 = await browser.newPage();

    // Set up viewports
    await hostPage.setViewport({ width: 1920, height: 1080 });
    await client1.setViewport({ width: 375, height: 667 });
    await client2.setViewport({ width: 375, height: 667 });
    await client3.setViewport({ width: 375, height: 667 });

    // Navigate all pages
    console.log('  Setting up host and 3 clients...');
    await Promise.all([
      hostPage.goto('http://localhost:8080', { waitUntil: 'networkidle2' }),
      client1.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' }),
      client2.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' }),
      client3.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' })
    ]);

    await new Promise(r => setTimeout(r, 2000)); // Wait for WebSocket connections

    // Switch all clients to remote tab
    console.log('  Switching clients to remote tab...');
    await Promise.all([
      client1.evaluate(() => {
        const tab = document.querySelector('[data-tab="remote"]');
        if (tab) tab.click();
      }),
      client2.evaluate(() => {
        const tab = document.querySelector('[data-tab="remote"]');
        if (tab) tab.click();
      }),
      client3.evaluate(() => {
        const tab = document.querySelector('[data-tab="remote"]');
        if (tab) tab.click();
      })
    ]);

    await new Promise(r => setTimeout(r, 500));

    // Test 1: Single reaction from client1
    console.log('  Testing single reaction (client 1 → host)...');

    // Simulate video playing on host (set paused to false to allow reactions)
    await hostPage.evaluate(() => {
      const video = document.getElementById('video-player');
      if (video) {
        // Create a mock video that appears to be playing
        Object.defineProperty(video, 'paused', {
          get: () => false,
          configurable: true
        });
        video.style.display = 'block';
      }
    });

    // Send reaction from client1
    const beforeReactions1 = await hostPage.evaluate(() => {
      return document.getElementById('reaction-container')?.children.length || 0;
    });

    await client1.evaluate(() => {
      const btn = document.querySelector('.reaction-btn[data-reaction="👏"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 500)); // Wait for reaction to appear

    const afterReactions1 = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      const reactions = Array.from(container?.children || []);
      return {
        count: reactions.length,
        types: reactions.map(r => r.textContent),
        hasApplause: reactions.some(r => r.textContent === '👏')
      };
    });

    assert(afterReactions1.count > beforeReactions1, 'Should have more reactions after client1 sent one');
    assert(afterReactions1.hasApplause, 'Should have applause emoji from client1');
    console.log('    ✓ Single reaction sent and displayed');

    // Test 2: Multiple simultaneous reactions from different clients
    console.log('  Testing multiple simultaneous reactions...');

    // Wait for throttling to reset from previous test
    await new Promise(r => setTimeout(r, 1200));

    // Clear existing reactions
    await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      if (container) container.innerHTML = '';
    });

    // Send different reactions from all 3 clients simultaneously
    // Use different buttons to avoid any potential conflicts
    await Promise.all([
      client1.evaluate(() => {
        const btn = document.querySelector('.reaction-btn[data-reaction="❤️"]');
        if (btn && !btn.disabled) btn.click();
      }),
      client2.evaluate(() => {
        const btn = document.querySelector('.reaction-btn[data-reaction="🔥"]');
        if (btn && !btn.disabled) btn.click();
      }),
      client3.evaluate(() => {
        const btn = document.querySelector('.reaction-btn[data-reaction="🎉"]');
        if (btn && !btn.disabled) btn.click();
      })
    ]);

    await new Promise(r => setTimeout(r, 800)); // Wait for all reactions to appear

    const multipleReactions = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      const reactions = Array.from(container?.children || []);
      return {
        count: reactions.length,
        types: reactions.map(r => r.textContent),
        hasHeart: reactions.some(r => r.textContent === '❤️'),
        hasFire: reactions.some(r => r.textContent === '🔥'),
        hasParty: reactions.some(r => r.textContent === '🎉'),
        allVisible: reactions.every(r => {
          const style = window.getComputedStyle(r);
          return style.display !== 'none' && parseFloat(style.opacity) > 0;
        })
      };
    });

    assert(multipleReactions.count >= 3, `Should have at least 3 reactions, got ${multipleReactions.count}`);
    assert(multipleReactions.hasHeart, 'Should have heart emoji from client1');
    assert(multipleReactions.hasFire, 'Should have fire emoji from client2');
    assert(multipleReactions.hasParty, 'Should have party emoji from client3');
    assert(multipleReactions.allVisible, 'All reactions should be visible');
    console.log('    ✓ Multiple simultaneous reactions displayed');

    // Test 3: Verify reactions have different horizontal positions
    console.log('  Testing random horizontal positioning...');

    const positions = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      const reactions = Array.from(container?.children || []);
      return reactions.map(r => {
        const left = r.style.left;
        return parseFloat(left); // Extract percentage value
      });
    });

    // Check that not all positions are the same (random positioning working)
    const allSamePosition = positions.every(pos => pos === positions[0]);
    assert(!allSamePosition, 'Reactions should have different horizontal positions');

    // Check that all positions are within valid range (10-90%)
    const validRange = positions.every(pos => pos >= 10 && pos <= 90);
    assert(validRange, `All positions should be 10-90%, got: ${positions}`);
    console.log(`    ✓ Random positioning working (positions: ${positions.join('%, ')}%)`);

    // Test 4: Verify animations are running
    console.log('  Testing animations are active...');

    const animationCheck = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      const reactions = Array.from(container?.children || []);
      return reactions.map(r => {
        const style = window.getComputedStyle(r);
        return {
          hasAnimation: style.animation && style.animation !== 'none',
          className: r.className,
          animationName: style.animationName,
          animationDuration: style.animationDuration
        };
      });
    });

    const allAnimating = animationCheck.every(r =>
      r.hasAnimation &&
      r.animationName === 'floatUp' &&
      r.animationDuration === '2.5s'
    );

    assert(allAnimating, 'All reactions should be animating with floatUp for 2.5s');
    console.log('    ✓ All reactions animating correctly');

    // Test 5: Verify cleanup happens
    console.log('  Testing automatic cleanup...');

    const beforeCleanup = await hostPage.evaluate(() => {
      return document.getElementById('reaction-container')?.children.length || 0;
    });

    assert(beforeCleanup > 0, 'Should have reactions before cleanup');

    // Wait for animations to complete (2.5s + buffer)
    await new Promise(r => setTimeout(r, 3000));

    const afterCleanup = await hostPage.evaluate(() => {
      return document.getElementById('reaction-container')?.children.length || 0;
    });

    assert(afterCleanup === 0, `All reactions should be cleaned up after animation, but ${afterCleanup} remain`);
    console.log('    ✓ Reactions cleaned up after animation');

    // Test 6: Performance test - send many reactions rapidly
    console.log('  Testing performance with rapid reactions...');

    const startTime = Date.now();
    const reactionPromises = [];

    // Send 15 reactions rapidly (5 from each client)
    for (let i = 0; i < 5; i++) {
      reactionPromises.push(
        client1.evaluate(() => {
          const btn = document.querySelector('.reaction-btn');
          if (btn && !btn.disabled) btn.click();
        }),
        client2.evaluate(() => {
          const btn = document.querySelector('.reaction-btn');
          if (btn && !btn.disabled) btn.click();
        }),
        client3.evaluate(() => {
          const btn = document.querySelector('.reaction-btn');
          if (btn && !btn.disabled) btn.click();
        })
      );
      await new Promise(r => setTimeout(r, 1100)); // Wait for throttle to reset
    }

    await Promise.all(reactionPromises);
    const endTime = Date.now();

    await new Promise(r => setTimeout(r, 500)); // Let reactions appear

    const performanceCheck = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      return {
        reactionCount: container?.children.length || 0,
        containerExists: !!container
      };
    });

    assert(performanceCheck.containerExists, 'Container should still exist after many reactions');
    console.log(`    ✓ Performance test completed (${endTime - startTime}ms, ${performanceCheck.reactionCount} reactions displayed)`);

    console.log('✅ End-to-end reactions test passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testReactionsE2E)
    .then(() => process.exit(0))
    .catch((error) => { console.error('\n❌ Test failed:', error); process.exit(1); });
}

module.exports = testReactionsE2E;
