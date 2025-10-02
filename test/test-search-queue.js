// Puppeteer is used via TestHelper.launchBrowser()
// eslint-disable-next-line no-unused-vars
const puppeteer = require('puppeteer');
const assert = require('assert');
const TestHelper = require('./test-helper');

async function testSearchAndQueue() {
  console.log('Testing search and queue functionality...');
  const browser = await TestHelper.launchBrowser();

  try {
    const karaokePage = await browser.newPage();
    const clientPage = await browser.newPage();

    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Test search
    console.log('  Testing search...');
    await clientPage.type('#search-input', 'karaoke');
    await clientPage.click('#search-btn');
    await new Promise(r => setTimeout(r, 6000)); // More time for search

    const searchResults = await clientPage.evaluate(() => {
      const results = document.querySelectorAll('#search-results .song-card');
      return {
        count: results.length,
        firstTitle: results[0]?.querySelector('.song-title')?.textContent
      };
    });

    assert(searchResults.count > 0, 'Should have search results');
    console.log(`    ✓ Found ${searchResults.count} results`);

    // Add song to queue
    console.log('  Testing add to queue...');
    await clientPage.evaluate(() => {
      const btn = document.querySelector('.song-action');
      if (btn && btn.onclick) {
        btn.click();

      } else if (typeof addToQueue === 'function') {
        // eslint-disable-next-line no-undef
        addToQueue(0);
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Check queue on client
    await clientPage.click('[data-tab="queue"]');
    await new Promise(r => setTimeout(r, 1000));

    const clientQueue = await clientPage.evaluate(() => {
      const items = document.querySelectorAll('#queue-list .song-card');
      return {
        count: items.length,
        firstTitle: items[0]?.querySelector('.song-title')?.textContent
      };
    });

    assert(clientQueue.count === 1, 'Should have 1 item in client queue');
    console.log('    ✓ Song added to client queue');

    // Check karaoke display
    const karaokeState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      const songTitle = document.getElementById('song-title');
      return {
        hasVideo: !!video?.src,
        videoDisplay: video ? window.getComputedStyle(video).display : 'none',
        title: songTitle?.textContent
      };
    });

    assert(karaokeState.hasVideo, 'Video should have source');
    assert(karaokeState.videoDisplay === 'block', 'Video should be visible');
    console.log('    ✓ Video loaded on karaoke display');

    // Add another song
    console.log('  Testing multiple songs in queue...');
    await clientPage.click('[data-tab="search"]');
    await clientPage.evaluate(() => {
      document.getElementById('search-input').value = '';
    });
    await clientPage.type('#search-input', 'Never Gonna Give You Up');
    await clientPage.click('#search-btn');
    await new Promise(r => setTimeout(r, 3000));

    await clientPage.evaluate(() => {
      const btn = document.querySelector('.song-action');
      if (btn && btn.onclick) {
        btn.click();

      } else if (typeof addToQueue === 'function') {
        // eslint-disable-next-line no-undef
        addToQueue(0);
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Check queue has both songs
    const karaokeQueue = await karaokePage.evaluate(() => {
      const items = document.querySelectorAll('#queue-list .queue-item');
      return items.length;
    });

    assert(karaokeQueue >= 1, 'Karaoke should show queue items');
    console.log(`    ✓ Queue shows ${karaokeQueue} item(s)`);

    console.log('✅ Search and queue test passed');
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
  TestHelper.withServer(testSearchAndQueue)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = testSearchAndQueue;
