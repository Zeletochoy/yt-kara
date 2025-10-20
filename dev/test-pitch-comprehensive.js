const puppeteer = require('puppeteer');

async function comprehensiveTest() {
  console.log('🎵 Comprehensive Pitch Shifting Test\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  try {
    // Open karaoke and client views
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console messages and errors
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      errors.push(error.toString());
    });

    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667 });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✓ Pages loaded\n');

    // Check if there's already a song in the queue
    const hasExistingSong = await page.evaluate(() => {
      const songTitle = document.getElementById('song-title');
      return songTitle && songTitle.textContent && songTitle.textContent !== '';
    });

    if (!hasExistingSong) {
      console.log('📱 Adding song to queue...');
      await clientPage.type('#user-name', 'TestUser');
      await clientPage.type('#search-input', 'karaoke');
      await clientPage.click('#search-btn');
      await new Promise(resolve => setTimeout(resolve, 5000));

      const addButtons = await clientPage.$$('.add-song-btn');
      if (addButtons.length === 0) {
        throw new Error('No search results found - try adding a song manually first');
      }

      await addButtons[0].click();
      console.log('✓ Song added to queue\n');
    } else {
      console.log('✓ Using existing song in queue\n');
    }

    // Wait for video to load
    console.log('🎥 Waiting for video to load...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check video status
    const videoStatus = await page.evaluate(() => {
      const video = document.getElementById('video-player');
      return {
        hasSrc: video && video.src && video.src !== '',
        readyState: video ? video.readyState : 0,
        error: video && video.error ? video.error.message : null
      };
    });

    console.log(`   Video src: ${videoStatus.hasSrc ? '✓' : '✗'}`);
    console.log(`   Ready state: ${videoStatus.readyState} ${videoStatus.readyState >= 2 ? '✓' : '✗'}`);

    if (videoStatus.error) {
      throw new Error(`Video error: ${videoStatus.error}`);
    }

    if (!videoStatus.hasSrc) {
      throw new Error('Video failed to load');
    }

    // Check Tone.js initialization
    console.log('\n🎛️  Checking Tone.js...');
    const toneStatus = await page.evaluate(() => {
      return {
        initialized: window.__test__ ? window.__test__.toneInitialized : false,
        hasPitchShifter: window.__test__?.pitchShifter !== null && window.__test__?.pitchShifter !== undefined,
        hasMediaSource: window.__test__?.mediaElementSource !== null && window.__test__?.mediaElementSource !== undefined,
        contextState: typeof Tone !== 'undefined' ? Tone.context.state : 'N/A',
        // Handle both v14 and v15 API
        pitchValue: window.__test__?.pitchShifter ?
          (typeof window.__test__.pitchShifter.pitch === 'number' ?
            window.__test__.pitchShifter.pitch :
            window.__test__.pitchShifter.pitch?.value) :
          undefined
      };
    });

    console.log(`   Initialized: ${toneStatus.initialized ? '✓' : '✗'}`);
    console.log(`   PitchShifter exists: ${toneStatus.hasPitchShifter ? '✓' : '✗'}`);
    console.log(`   MediaSource exists: ${toneStatus.hasMediaSource ? '✓' : '✗'}`);
    console.log(`   Context state: ${toneStatus.contextState}`);
    console.log(`   Current pitch: ${toneStatus.pitchValue}`);

    if (!toneStatus.initialized) {
      throw new Error('Tone.js not initialized');
    }

    if (!toneStatus.hasPitchShifter) {
      throw new Error('PitchShifter not created');
    }

    if (toneStatus.pitchValue === undefined) {
      throw new Error('PitchShifter pitch value is undefined');
    }

    // Test pitch controls
    console.log('\n🔼 Testing pitch controls...');

    // Get current pitch first
    const initialPitch = await page.evaluate(() => {
      const shifter = window.__test__?.pitchShifter;
      return {
        display: document.getElementById('pitch-value').textContent,
        actual: shifter ?
          (typeof shifter.pitch === 'number' ? shifter.pitch : shifter.pitch?.value) :
          0
      };
    });
    console.log(`   Starting pitch: display=${initialPitch.display}, actual=${initialPitch.actual}`);

    // Pitch up by 3 from current position
    const targetUpPitch = initialPitch.actual + 3;
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => document.getElementById('pitch-up').click());
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const pitchUp = await page.evaluate(() => {
      const shifter = window.__test__?.pitchShifter;
      return {
        display: document.getElementById('pitch-value').textContent,
        actual: shifter ?
          (typeof shifter.pitch === 'number' ? shifter.pitch : shifter.pitch?.value) :
          undefined
      };
    });

    const upSuccess = pitchUp.actual === targetUpPitch;
    console.log(`   After +3: Display=${pitchUp.display}, Actual=${pitchUp.actual} ${upSuccess ? '✓' : '✗'}`);

    if (!upSuccess) {
      throw new Error(`Pitch up failed: expected ${targetUpPitch}, got ${pitchUp.actual}`);
    }

    // Pitch down by 5 from current position
    const targetDownPitch = pitchUp.actual - 5;
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => document.getElementById('pitch-down').click());
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const pitchDown = await page.evaluate(() => {
      const shifter = window.__test__?.pitchShifter;
      return {
        display: document.getElementById('pitch-value').textContent,
        actual: shifter ?
          (typeof shifter.pitch === 'number' ? shifter.pitch : shifter.pitch?.value) :
          undefined
      };
    });

    const downSuccess = pitchDown.actual === targetDownPitch;
    console.log(`   After -5: Display=${pitchDown.display}, Actual=${pitchDown.actual} ${downSuccess ? '✓' : '✗'}`);

    if (!downSuccess) {
      throw new Error(`Pitch down failed: expected ${targetDownPitch}, got ${pitchDown.actual}`);
    }

    // Check for errors
    console.log('\n🔍 Checking for errors...');
    const criticalErrors = errors.filter(e =>
      !e.includes('Deprecation') &&
      !e.includes('ScriptProcessorNode')
    );

    if (criticalErrors.length > 0) {
      console.log('✗ Errors found:');
      criticalErrors.forEach(err => console.log(`   ${err}`));
      throw new Error('Critical errors detected');
    }

    console.log('✓ No critical errors\n');

    // Final verification
    console.log('📊 Final Status:');
    console.log('   ✓ Video loads successfully');
    console.log('   ✓ Tone.js initializes correctly');
    console.log('   ✓ Pitch controls work (UI + actual)');
    console.log('   ✓ No critical errors');
    console.log('\n✅ ALL TESTS PASSED!\n');

    return true;

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    return false;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  comprehensiveTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = comprehensiveTest;
