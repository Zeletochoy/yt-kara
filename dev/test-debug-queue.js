const puppeteer = require('puppeteer');

async function debugQueue() {
  console.log('🔍 Debugging queue and playback...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Setup pages
    const karaokePage = await browser.newPage();
    const clientPage = await browser.newPage();

    // Add console logging
    karaokePage.on('console', msg => {
      if (msg.type() === 'error') console.log('KARAOKE ERROR:', msg.text());
    });
    clientPage.on('console', msg => {
      if (msg.type() === 'error') console.log('CLIENT ERROR:', msg.text());
    });

    await karaokePage.setViewport({ width: 1920, height: 1080 });
    await clientPage.setViewport({ width: 375, height: 667, isMobile: true });

    // Load pages
    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Search for a song
    console.log('1️⃣ Searching for song...');
    await clientPage.type('#search-input', 'Rick Astley Never Gonna Give You Up');
    await clientPage.click('#search-btn');
    await new Promise(resolve => setTimeout(resolve, 4000));

    const searchResults = await clientPage.evaluate(() => {
      const results = document.querySelectorAll('#search-results .song-card');
      return results.length;
    });
    console.log(`   Found ${searchResults} results`);

    // Add to queue
    console.log('\n2️⃣ Adding song to queue...');
    await clientPage.evaluate(() => {
      const firstAddBtn = document.querySelector('.song-action');
      console.log('Add button found:', !!firstAddBtn);
      if (firstAddBtn) {
        firstAddBtn.click();
        console.log('Clicked add button');
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check WebSocket state
    console.log('\n3️⃣ Checking WebSocket state...');
    const wsState = await clientPage.evaluate(() => {
      if (typeof wsConnection !== 'undefined' && wsConnection.state) {
        return {
          queue: wsConnection.state.queue,
          currentSong: wsConnection.state.currentSong,
          isPlaying: wsConnection.state.isPlaying
        };
      }
      return null;
    });

    if (wsState) {
      console.log('   Queue length:', wsState.queue?.length || 0);
      console.log('   Current song:', wsState.currentSong?.title || 'None');
      console.log('   Is playing:', wsState.isPlaying);

      if (wsState.queue && wsState.queue.length > 0) {
        console.log('   Queue contents:');
        wsState.queue.forEach((song, i) => {
          console.log(`     ${i+1}. ${song.title}`);
        });
      }
    } else {
      console.log('   WebSocket state not available');
    }

    // Check queue display
    console.log('\n4️⃣ Checking queue display...');

    // Check client queue tab
    await clientPage.click('[data-tab="queue"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const clientQueueDisplay = await clientPage.evaluate(() => {
      const queueList = document.getElementById('queue-list');
      const queueItems = document.querySelectorAll('#queue-list .queue-item, #queue-list .song-card');
      return {
        queueListExists: !!queueList,
        queueListHTML: queueList ? queueList.innerHTML.substring(0, 200) : null,
        itemCount: queueItems.length,
        emptyMessage: queueList?.querySelector('.empty-state')?.textContent
      };
    });

    console.log('   Client queue display:');
    console.log('     Queue list exists:', clientQueueDisplay.queueListExists);
    console.log('     Items displayed:', clientQueueDisplay.itemCount);
    if (clientQueueDisplay.emptyMessage) {
      console.log('     Empty message:', clientQueueDisplay.emptyMessage);
    }

    // Check karaoke queue display
    const karaokeQueueDisplay = await karaokePage.evaluate(() => {
      const queueList = document.getElementById('queue-list');
      const queueItems = document.querySelectorAll('#queue-list .queue-item');
      return {
        queueListExists: !!queueList,
        itemCount: queueItems.length,
        emptyMessage: queueList?.querySelector('.empty-state')?.textContent
      };
    });

    console.log('   Karaoke queue display:');
    console.log('     Queue list exists:', karaokeQueueDisplay.queueListExists);
    console.log('     Items displayed:', karaokeQueueDisplay.itemCount);

    // Check video playback
    console.log('\n5️⃣ Checking video playback...');
    const videoState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      const noVideo = document.getElementById('no-video');
      return {
        videoExists: !!video,
        videoSrc: video?.src,
        videoDisplay: video ? window.getComputedStyle(video).display : null,
        noVideoDisplay: noVideo ? window.getComputedStyle(noVideo).display : null,
        videoError: video?.error,
        readyState: video?.readyState
      };
    });

    console.log('   Video element exists:', videoState.videoExists);
    console.log('   Video src:', videoState.videoSrc ? 'Set' : 'Not set');
    console.log('   Video visible:', videoState.videoDisplay !== 'none');
    console.log('   No-video visible:', videoState.noVideoDisplay !== 'none');
    console.log('   Ready state:', videoState.readyState);

    // Try manual play start
    console.log('\n6️⃣ Attempting manual play start...');
    await clientPage.evaluate(() => {
      if (wsConnection && wsConnection.state && wsConnection.state.queue.length > 0) {
        // Send play command
        wsConnection.send({
          type: 'PLAY_NEXT'
        });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Final check
    const finalVideoState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      return {
        src: video?.src,
        playing: video && !video.paused,
        currentTime: video?.currentTime
      };
    });

    console.log('\n7️⃣ Final state:');
    console.log('   Video has URL:', !!finalVideoState.src);
    console.log('   Video playing:', finalVideoState.playing);
    console.log('   Current time:', finalVideoState.currentTime);

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    console.log('\nClosing browser...');
    await browser.close();
  }
}

if (require.main === module) {
  debugQueue().catch(console.error);
}

module.exports = debugQueue;
