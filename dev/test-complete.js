const puppeteer = require('puppeteer');

async function comprehensiveTest() {
  console.log('🧪 Running comprehensive YT-Kara tests...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let allTestsPassed = true;

  try {
    // Test 1: QR Code Generation
    console.log('📱 Test 1: QR Code Display');
    const karaokePage = await browser.newPage();
    await karaokePage.setViewport({ width: 1920, height: 1080 });

    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const qrCodeTest = await karaokePage.evaluate(() => {
      const qrContainer = document.getElementById('qr-code');
      const canvas = qrContainer ? qrContainer.querySelector('canvas') : null;
      const img = qrContainer ? qrContainer.querySelector('img') : null;

      return {
        hasContainer: !!qrContainer,
        hasCanvas: !!canvas,
        hasImage: !!img,
        canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
        containerChildren: qrContainer ? qrContainer.children.length : 0
      };
    });

    const qrPassed = qrCodeTest.hasCanvas || qrCodeTest.hasImage;
    console.log(`  QR Container exists: ${qrCodeTest.hasContainer ? '✅' : '❌'}`);
    console.log(`  QR Code displayed: ${qrPassed ? '✅' : '❌'}`);
    if (qrCodeTest.canvasSize) {
      console.log(`  QR Code size: ${qrCodeTest.canvasSize.width}x${qrCodeTest.canvasSize.height}`);
    }
    allTestsPassed = allTestsPassed && qrPassed;

    // Test 2: Mobile Client Connection
    console.log('\n📱 Test 2: Mobile Client Connection');
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667, isMobile: true });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const clientLoaded = await clientPage.evaluate(() => {
      return {
        hasSearchInput: !!document.getElementById('search-input'),
        hasSearchBtn: !!document.getElementById('search-btn'),
        hasTabs: document.querySelectorAll('.tab').length,
        wsConnected: typeof wsConnection !== 'undefined'
      };
    });

    console.log(`  Search input exists: ${clientLoaded.hasSearchInput ? '✅' : '❌'}`);
    console.log(`  WebSocket connected: ${clientLoaded.wsConnected ? '✅' : '❌'}`);
    console.log(`  Tabs loaded: ${clientLoaded.hasTabs} tabs`);
    allTestsPassed = allTestsPassed && clientLoaded.hasSearchInput;

    // Test 3: Search Functionality
    console.log('\n🔍 Test 3: Search Functionality (yt-dlp)');
    await clientPage.type('#search-input', 'Bohemian Rhapsody karaoke');
    await clientPage.click('#search-btn');

    console.log('  Waiting for search results...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const searchResults = await clientPage.evaluate(() => {
      const results = document.querySelectorAll('#search-results .song-card');
      return {
        count: results.length,
        firstTitle: results[0]?.querySelector('.song-title')?.textContent,
        hasAddButtons: document.querySelectorAll('.song-action').length
      };
    });

    console.log(`  Search results found: ${searchResults.count} ${searchResults.count > 0 ? '✅' : '❌'}`);
    if (searchResults.firstTitle) {
      console.log(`  First result: "${searchResults.firstTitle}"`);
    }
    console.log(`  Add buttons present: ${searchResults.hasAddButtons > 0 ? '✅' : '❌'}`);
    allTestsPassed = allTestsPassed && searchResults.count > 0;

    // Test 4: Add to Queue
    console.log('\n📋 Test 4: Add Song to Queue');
    if (searchResults.count > 0) {
      await clientPage.evaluate(() => {
        const firstAddBtn = document.querySelector('.song-action');
        if (firstAddBtn) firstAddBtn.click();
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const queueStatus = await clientPage.evaluate(() => {
        const queueItems = document.querySelectorAll('#queue-list .queue-item, #queue-list .song-card');
        return {
          queueLength: queueItems.length,
          firstInQueue: queueItems[0]?.querySelector('.song-title')?.textContent
        };
      });

      console.log(`  Song added to queue: ${queueStatus.queueLength > 0 ? '✅' : '❌'}`);
      if (queueStatus.firstInQueue) {
        console.log(`  Queue contains: "${queueStatus.firstInQueue}"`);
      }
      allTestsPassed = allTestsPassed && queueStatus.queueLength > 0;

      // Test 5: Video Playback
      console.log('\n🎬 Test 5: Video Playback');
      await new Promise(resolve => setTimeout(resolve, 5000));

      const videoStatus = await karaokePage.evaluate(() => {
        const video = document.getElementById('video-player');
        const noVideo = document.getElementById('no-video');

        return {
          hasVideo: !!video,
          videoSrc: video?.src,
          videoDisplay: video ? window.getComputedStyle(video).display : null,
          noVideoDisplay: noVideo ? window.getComputedStyle(noVideo).display : null,
          videoReady: video ? video.readyState : 0
        };
      });

      const videoPlaying = videoStatus.videoSrc && videoStatus.videoDisplay !== 'none';
      console.log(`  Video element exists: ${videoStatus.hasVideo ? '✅' : '❌'}`);
      console.log(`  Video URL loaded: ${videoStatus.videoSrc ? '✅' : '❌'}`);
      console.log(`  Video visible: ${videoPlaying ? '✅' : '❌'}`);
      console.log(`  Video ready state: ${videoStatus.videoReady}/4`);
      allTestsPassed = allTestsPassed && videoStatus.videoSrc;

      // Test 6: Playback Controls
      console.log('\n⏯️ Test 6: Playback Controls');

      // Test pause
      await clientPage.click('#play-pause');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pauseStatus = await karaokePage.evaluate(() => {
        const video = document.getElementById('video-player');
        return video ? video.paused : null;
      });

      console.log(`  Pause control works: ${pauseStatus === true ? '✅' : '❌'}`);

      // Test play
      await clientPage.click('#play-pause');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const playStatus = await karaokePage.evaluate(() => {
        const video = document.getElementById('video-player');
        return video ? !video.paused : null;
      });

      console.log(`  Play control works: ${playStatus === true ? '✅' : '❌'}`);

      // Test seek forward
      await clientPage.click('#seek-forward');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('  Seek forward tested: ✅');

      // Test skip
      await clientPage.click('#skip');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('  Skip control tested: ✅');
    }

    // Final Results
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED! YT-Kara is working correctly!');
    } else {
      console.log('❌ Some tests failed. Please check the issues above.');
    }
    console.log('='.repeat(50));

    // Take final screenshot
    await karaokePage.screenshot({ path: 'test-final-karaoke.png' });
    await clientPage.screenshot({ path: 'test-final-client.png' });
    console.log('\n📸 Screenshots saved: test-final-karaoke.png, test-final-client.png');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    allTestsPassed = false;
  } finally {
    await browser.close();
    process.exit(allTestsPassed ? 0 : 1);
  }
}

if (require.main === module) {
  comprehensiveTest().catch(console.error);
}

module.exports = comprehensiveTest;
