// Puppeteer is used via TestHelper.launchBrowser()
// eslint-disable-next-line no-unused-vars
const puppeteer = require('puppeteer');
const TestHelper = require('./test-helper');

async function debugVideoLoading() {
  console.log('Debugging video loading...');
  const browser = await TestHelper.launchBrowser();

  try {
    const karaokePage = await browser.newPage();
    const clientPage = await browser.newPage();

    // Capture console and network errors
    karaokePage.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('  Karaoke error:', msg.text());
      }
    });

    karaokePage.on('response', response => {
      if (response.status() >= 400) {
        console.log(`  HTTP ${response.status()} for ${response.url()}`);
      }
    });

    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Search for something
    console.log('Searching...');
    await clientPage.type('#search-input', 'karaoke');
    await clientPage.click('#search-btn');
    await new Promise(r => setTimeout(r, 5000));

    // Check search results
    const searchResults = await clientPage.evaluate(() => {
      const results = document.querySelectorAll('#search-results .song-card');
      return Array.from(results).map(r => ({
        title: r.querySelector('.song-title')?.textContent,
        videoId: r.querySelector('.song-action')?.dataset?.videoId
      }));
    });

    console.log(`Found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log('First result:', searchResults[0]);
    }

    // Add first song
    console.log('Adding song to queue...');
    await clientPage.evaluate(() => {
      const btn = document.querySelector('.song-action');
      if (btn) {
        console.log('Button found, clicking...');
        btn.click();
      } else {
        console.log('No add button found!');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Check what was sent to server
    const queueState = await karaokePage.evaluate(() => {
      return {
        currentSong: window.wsConnection?.state?.currentSong,
        queue: window.wsConnection?.state?.queue,
        isPlaying: window.wsConnection?.state?.isPlaying
      };
    });
    console.log('Queue state:', JSON.stringify(queueState, null, 2));

    // Wait for video load attempt
    await new Promise(r => setTimeout(r, 5000));

    // Check video element
    const videoState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      return {
        src: video?.src,
        error: video?.error,
        readyState: video?.readyState,
        paused: video?.paused,
        networkState: video?.networkState
      };
    });
    console.log('Video state:', videoState);

    // Try to fetch video URL directly
    if (searchResults.length > 0 && searchResults[0].videoId) {
      console.log(`\nTrying to fetch video URL for ${searchResults[0].videoId}...`);
      const response = await fetch(`http://localhost:8080/api/video/${searchResults[0].videoId}`);
      const text = await response.text();
      console.log(`Response status: ${response.status}`);
      console.log('Response:', text.substring(0, 200));
    }

    return true;

  } catch (error) {
    console.error('Debug failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(debugVideoLoading)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = debugVideoLoading;
