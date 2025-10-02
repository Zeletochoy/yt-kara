// Puppeteer is used via TestHelper.launchBrowser()
// eslint-disable-next-line no-unused-vars
const puppeteer = require('puppeteer');
const TestHelper = require('./test-helper');

async function debugQueue() {
  console.log('Debugging queue functionality...');
  const browser = await TestHelper.launchBrowser();

  try {
    const karaokePage = await browser.newPage();
    const clientPage = await browser.newPage();

    // Capture all console messages
    clientPage.on('console', msg => {
      console.log('  Client console:', msg.text());
    });

    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Search
    console.log('\n1. Searching...');
    await clientPage.type('#search-input', 'karaoke');
    await clientPage.click('#search-btn');
    await new Promise(r => setTimeout(r, 5000));

    // Check if searchResultsCache is populated
    const cacheStatus = await clientPage.evaluate(() => {
      return {
        hasCache: !!window.searchResultsCache,
        cacheLength: window.searchResultsCache ? window.searchResultsCache.length : 0,
        firstItem: window.searchResultsCache ? window.searchResultsCache[0] : null
      };
    });
    console.log('Search cache:', cacheStatus);

    // Check button setup
    const buttonInfo = await clientPage.evaluate(() => {
      const btn = document.querySelector('.song-action');
      return {
        exists: !!btn,
        onclick: btn ? btn.onclick ? btn.onclick.toString() : 'null' : 'no button',
        outerHTML: btn ? btn.outerHTML : 'no button'
      };
    });
    console.log('Button info:', buttonInfo);

    // Try to add song
    console.log('\n2. Adding song...');
    await clientPage.evaluate(() => {

      if (typeof addToQueue === 'function') {
        console.log('Calling addToQueue(0)...');
        // eslint-disable-next-line no-undef
        addToQueue(0);
      } else {
        console.log('addToQueue function not found!');
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    // Check WebSocket connection
    const wsState = await clientPage.evaluate(() => {
      return {
        hasWsConnection: !!window.wsConnection,
        wsState: window.wsConnection ? window.wsConnection.ws.readyState : null,
        state: window.wsConnection ? window.wsConnection.state : null
      };
    });
    console.log('WebSocket state:', wsState);

    // Check queue after adding
    await clientPage.click('[data-tab="queue"]');
    await new Promise(r => setTimeout(r, 1000));

    const clientQueue = await clientPage.evaluate(() => {
      const items = document.querySelectorAll('#queue-list .song-card');
      return {
        count: items.length,
        titles: Array.from(items).map(item =>
          item.querySelector('.song-title')?.textContent
        )
      };
    });
    console.log('Client queue:', clientQueue);

    // Check karaoke state
    const karaokeState = await karaokePage.evaluate(() => {
      return {
        wsState: window.wsConnection ? window.wsConnection.state : null,
        hasVideo: !!document.getElementById('video-player').src
      };
    });
    console.log('Karaoke state:', karaokeState);

    return clientQueue.count > 0;

  } catch (error) {
    console.error('Debug failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(debugQueue)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = debugQueue;
