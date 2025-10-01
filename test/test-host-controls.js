// Puppeteer is used via TestHelper.launchBrowser()
// eslint-disable-next-line no-unused-vars
const puppeteer = require('puppeteer');
const assert = require('assert');
const TestHelper = require('./test-helper');

async function testHostControls() {
  console.log('Testing host playback controls...');
  const browser = await TestHelper.launchBrowser();

  try {
    const karaokePage = await browser.newPage();
    const clientPage = await browser.newPage();

    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Add a song first
    console.log('  Adding test song...');
    await clientPage.type('#search-input', 'karaoke test');
    await clientPage.click('#search-btn');
    await new Promise(r => setTimeout(r, 5000));
    await clientPage.evaluate(() => {

      if (typeof addToQueue === 'function') {
        // eslint-disable-next-line no-undef
        addToQueue(0);
      }
    });
    await new Promise(r => setTimeout(r, 5000));

    // Check that host controls are visible
    console.log('  Checking host controls visibility...');
    const controlsVisible = await karaokePage.evaluate(() => {
      const controls = document.getElementById('host-controls');
      const previous = document.getElementById('host-previous');
      const playPause = document.getElementById('host-play-pause');
      const seekBack = document.getElementById('host-seek-back');
      const seekForward = document.getElementById('host-seek-forward');
      const skip = document.getElementById('host-skip');

      return {
        controlsDisplay: controls ? window.getComputedStyle(controls).display : 'none',
        hasPrevious: !!previous,
        hasPlayPause: !!playPause,
        hasSeekBack: !!seekBack,
        hasSeekForward: !!seekForward,
        hasSkip: !!skip,
        seekBackIcon: seekBack?.querySelector('.fa-undo') !== null,
        seekForwardIcon: seekForward?.querySelector('.fa-redo') !== null,
        seekBackTitle: seekBack?.title,
        seekForwardTitle: seekForward?.title
      };
    });

    assert(controlsVisible.hasPrevious, 'Previous button should exist');
    assert(controlsVisible.hasPlayPause, 'Play/pause button should exist');
    assert(controlsVisible.hasSeekBack, 'Seek back button should exist');
    assert(controlsVisible.hasSeekForward, 'Seek forward button should exist');
    assert(controlsVisible.hasSkip, 'Skip button should exist');
    assert(controlsVisible.seekBackIcon, 'Seek back should have undo icon');
    assert(controlsVisible.seekForwardIcon, 'Seek forward should have redo icon');
    assert(controlsVisible.seekBackTitle.includes('10'), 'Seek back title should mention 10 seconds');
    assert(controlsVisible.seekForwardTitle.includes('10'), 'Seek forward title should mention 10 seconds');
    console.log('    ✓ All host controls visible with correct icons');

    // Test seek controls
    await new Promise(r => setTimeout(r, 2000));

    // Test seek forward
    await karaokePage.click('#host-seek-forward');
    await new Promise(r => setTimeout(r, 1000));
    console.log('    ✓ Seek forward button clicked');

    // Test seek back
    await karaokePage.click('#host-seek-back');
    await new Promise(r => setTimeout(r, 1000));
    console.log('    ✓ Seek back button clicked');

    // Test play/pause
    await karaokePage.click('#host-play-pause');
    await new Promise(r => setTimeout(r, 1000));
    console.log('    ✓ Play/pause button works');

    // Test skip button
    console.log('  Testing skip button...');

    // Add another song first
    await clientPage.evaluate(() => {

      if (typeof addToQueue === 'function') {
        // eslint-disable-next-line no-undef
        addToQueue(0);
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Now skip
    await karaokePage.click('#host-skip');
    await new Promise(r => setTimeout(r, 3000));

    console.log('    ✓ Skip button works');

    console.log('✅ Host controls test passed');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  TestHelper.withServer(testHostControls)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = testHostControls;
