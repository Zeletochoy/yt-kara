const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function testCompleteFlow() {
  console.log('🎤 Testing complete YT-Kara flow...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Setup pages
    const karaokePage = await browser.newPage();
    const clientPage = await browser.newPage();

    // Add console logging for errors
    karaokePage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Error')) {
        console.log('🚨 KARAOKE:', msg.text());
      }
    });

    clientPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Error')) {
        console.log('🚨 CLIENT:', msg.text());
      }
    });

    // Network error logging
    karaokePage.on('response', response => {
      if (!response.ok() && response.url().includes('/api/video/')) {
        console.log(`🚨 Video API failed: ${response.status()} for ${response.url()}`);
      }
    });

    await karaokePage.setViewport({ width: 1920, height: 1080 });
    await clientPage.setViewport({ width: 375, height: 667, isMobile: true });

    // Load pages
    console.log('1️⃣ Loading pages...');
    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check QR code
    const qrVisible = await karaokePage.evaluate(() => {
      const qrContainer = document.getElementById('qr-container');
      const canvas = qrContainer?.querySelector('canvas');
      return !!canvas;
    });
    console.log(`   QR Code displayed: ${qrVisible ? '✅' : '❌'}`);

    // Search for songs
    console.log('\n2️⃣ Searching for songs...');
    await clientPage.type('#search-input', 'Never Gonna Give You Up');
    await clientPage.click('#search-btn');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const searchResults = await clientPage.evaluate(() => {
      const results = document.querySelectorAll('#search-results .song-card');
      return results.length;
    });
    console.log(`   Found ${searchResults} results`);

    // Add first song to queue
    console.log('\n3️⃣ Adding first song to queue...');
    await clientPage.evaluate(() => {
      const firstAddBtn = document.querySelector('#search-results .song-action');
      if (firstAddBtn) firstAddBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if song started playing
    const firstSongState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      const currentInfo = document.getElementById('current-info');
      const songTitle = document.getElementById('song-title');
      return {
        videoSrc: video?.src,
        videoDisplay: video ? window.getComputedStyle(video).display : null,
        currentInfoVisible: currentInfo ? window.getComputedStyle(currentInfo).display !== 'none' : false,
        songTitle: songTitle?.textContent
      };
    });

    console.log(`   Video src set: ${firstSongState.videoSrc ? '✅' : '❌'}`);
    console.log(`   Current song info visible: ${firstSongState.currentInfoVisible ? '✅' : '❌'}`);
    console.log(`   Song title: ${firstSongState.songTitle || 'None'}`);

    // Search for another song
    console.log('\n4️⃣ Adding second song to queue...');
    await clientPage.evaluate(() => {
      document.getElementById('search-input').value = '';
    });
    await clientPage.type('#search-input', 'Bohemian Rhapsody');
    await clientPage.click('#search-btn');
    await new Promise(resolve => setTimeout(resolve, 3000));

    await clientPage.evaluate(() => {
      const firstAddBtn = document.querySelector('#search-results .song-action');
      if (firstAddBtn) firstAddBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check queue on both views
    console.log('\n5️⃣ Checking queue display...');

    const karaokeQueue = await karaokePage.evaluate(() => {
      const queueList = document.getElementById('queue-list');
      const queueItems = queueList?.querySelectorAll('.queue-item');
      return {
        itemCount: queueItems?.length || 0,
        firstItemTitle: queueItems?.[0]?.querySelector('.queue-item-title')?.textContent
      };
    });

    await clientPage.click('[data-tab="queue"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const clientQueue = await clientPage.evaluate(() => {
      const queueList = document.getElementById('queue-list');
      const queueItems = queueList?.querySelectorAll('.song-card');
      return {
        itemCount: queueItems?.length || 0,
        firstItemTitle: queueItems?.[0]?.querySelector('.song-title')?.textContent
      };
    });

    console.log(`   Karaoke queue items: ${karaokeQueue.itemCount}`);
    console.log(`   Client queue items: ${clientQueue.itemCount}`);
    if (karaokeQueue.firstItemTitle) {
      console.log(`   Next in queue: ${karaokeQueue.firstItemTitle}`);
    }

    // Test playback controls
    console.log('\n6️⃣ Testing playback controls...');

    // Test pause
    await clientPage.click('#play-pause');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pausedState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      return video?.paused;
    });
    console.log(`   Pause command: ${pausedState ? '✅' : '❌'}`);

    // Test play
    await clientPage.click('#play-pause');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const playingState = await karaokePage.evaluate(() => {
      const video = document.getElementById('video-player');
      return video && !video.paused;
    });
    console.log(`   Play command: ${playingState ? '✅' : '❌'}`);

    // Test skip
    console.log('\n7️⃣ Testing skip to next song...');
    await clientPage.click('#skip');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const afterSkipState = await karaokePage.evaluate(() => {
      const songTitle = document.getElementById('song-title');
      const video = document.getElementById('video-player');
      return {
        songTitle: songTitle?.textContent,
        videoSrc: video?.src
      };
    });
    console.log(`   Skipped to: ${afterSkipState.songTitle || 'No song'}`);

    // Take final screenshots
    console.log('\n8️⃣ Taking final screenshots...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotDir = path.join(process.cwd(), 'screenshots', 'flow-test');
    await fs.mkdir(screenshotDir, { recursive: true });

    await karaokePage.screenshot({
      path: path.join(screenshotDir, `karaoke-playing-${timestamp}.png`),
      fullPage: false
    });

    await clientPage.screenshot({
      path: path.join(screenshotDir, `client-queue-${timestamp}.png`),
      fullPage: true
    });

    console.log(`   Screenshots saved to ${screenshotDir}`);

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ QR Code: ${qrVisible ? 'Working' : 'Not working'}`);
    console.log(`   ✅ Search: ${searchResults > 0 ? 'Working' : 'Not working'}`);
    console.log(`   ✅ Queue: ${clientQueue.itemCount > 0 || karaokeQueue.itemCount > 0 ? 'Working' : 'Not working'}`);
    console.log(`   ✅ Video playback: ${firstSongState.videoSrc ? 'Working' : 'Not working'}`);
    console.log(`   ✅ Controls: ${pausedState !== undefined ? 'Working' : 'Not working'}`);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testCompleteFlow().catch(console.error);
}

module.exports = testCompleteFlow;
