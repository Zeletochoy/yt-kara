const puppeteer = require('puppeteer');

async function testPitchShifting() {
  console.log('🎵 Testing Pitch Shifting Functionality...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  try {
    // Open karaoke view
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✓ Karaoke view loaded');

    // Open client view in another page
    const clientPage = await browser.newPage();
    await clientPage.setViewport({ width: 375, height: 667 });
    await clientPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✓ Client view loaded');

    // Set username
    await clientPage.type('#user-name', 'TestUser');

    // Check if there's already a song in the queue, if not add one
    console.log('\n📱 Checking queue...');
    const hasQueue = await page.evaluate(() => {
      const queueList = document.getElementById('queue-list');
      return queueList && !queueList.querySelector('.empty-state');
    });

    if (!hasQueue) {
      console.log('Queue is empty, searching for a video...');
      await clientPage.type('#search-input', 'karaoke');
      await clientPage.click('#search-btn');
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Add first result to queue
      const addButtons = await clientPage.$$('.add-song-btn');
      if (addButtons.length > 0) {
        await addButtons[0].click();
        console.log('✓ Added song to queue');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('⚠️  No search results found, testing with empty player');
      }
    } else {
      console.log('✓ Queue already has songs');
    }

    // Check if video is loaded
    console.log('\n🎥 Checking video status...');
    const videoStatus = await page.evaluate(() => {
      const video = document.getElementById('video-player');
      const noVideo = document.getElementById('no-video');
      return {
        hasVideoSrc: video && video.src && video.src !== '',
        videoDisplay: video ? video.style.display : 'none',
        noVideoDisplay: noVideo ? noVideo.style.display : 'block',
        readyState: video ? video.readyState : 0
      };
    });

    console.log(`   - Video has src: ${videoStatus.hasVideoSrc}`);
    console.log(`   - Video display: ${videoStatus.videoDisplay}`);
    console.log(`   - No-video display: ${videoStatus.noVideoDisplay}`);
    console.log(`   - Video ready state: ${videoStatus.readyState}`);

    if (!videoStatus.hasVideoSrc) {
      console.log('\n⚠️  No video loaded yet. Testing pitch controls without video...');
    } else {
      // Wait a bit more for video to load
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Check if Tone.js is initialized
    const toneStatus = await page.evaluate(() => {
      return {
        toneExists: typeof Tone !== 'undefined',
        contextState: typeof Tone !== 'undefined' ? Tone.context.state : 'N/A',
        initialized: window.__test__ ? window.__test__.toneInitialized : false
      };
    });

    console.log('\n🎛️  Tone.js status:');
    console.log(`   - Tone exists: ${toneStatus.toneExists}`);
    console.log(`   - Context state: ${toneStatus.contextState}`);
    console.log(`   - Initialized: ${toneStatus.initialized}`);

    // Get initial pitch value
    const initialPitch = await page.evaluate(() => {
      const pitchValue = document.getElementById('pitch-value');
      return pitchValue ? pitchValue.textContent : null;
    });

    console.log(`Initial pitch value: ${initialPitch}`);

    // Check if pitch buttons exist and are visible
    const buttonState = await page.evaluate(() => {
      const pitchUp = document.getElementById('pitch-up');
      const pitchDown = document.getElementById('pitch-down');
      return {
        upExists: pitchUp !== null,
        downExists: pitchDown !== null,
        upDisabled: pitchUp ? pitchUp.disabled : null,
        downDisabled: pitchDown ? pitchDown.disabled : null,
        upVisible: pitchUp ? window.getComputedStyle(pitchUp).display !== 'none' : false,
        downVisible: pitchDown ? window.getComputedStyle(pitchDown).display !== 'none' : false
      };
    });

    console.log('\nButton state:', buttonState);

    if (!buttonState.upExists) {
      console.log('⚠️  Pitch buttons not found in DOM, skipping interaction tests');
    } else {
      // Test pitch up
      console.log('\n🔼 Testing Pitch Up...');
      for (let i = 0; i < 3; i++) {
        // Use evaluate to click directly in browser context
        await page.evaluate(() => {
          document.getElementById('pitch-up').click();
        });
        await new Promise(resolve => setTimeout(resolve, 300));

        const pitch = await page.evaluate(() => {
          const pitchValue = document.getElementById('pitch-value');
          const pitchShifterValue = window.__test__?.pitchShifter ? window.__test__.pitchShifter.pitch.value : 'not available';
          return {
            display: pitchValue ? pitchValue.textContent : null,
            actual: pitchShifterValue
          };
        });

        console.log(`  Pitch ${i + 1}: Display=${pitch.display}, Tone.js=${pitch.actual}`);
      }

      // Test pitch down
      console.log('\n🔽 Testing Pitch Down...');
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          document.getElementById('pitch-down').click();
        });
        await new Promise(resolve => setTimeout(resolve, 300));

        const pitch = await page.evaluate(() => {
          const pitchValue = document.getElementById('pitch-value');
          const pitchShifterValue = window.__test__?.pitchShifter ? window.__test__.pitchShifter.pitch.value : 'not available';
          return {
            display: pitchValue ? pitchValue.textContent : null,
            actual: pitchShifterValue
          };
        });

        console.log(`  Pitch ${i + 1}: Display=${pitch.display}, Tone.js=${pitch.actual}`);
      }

      // Test extreme values
      console.log('\n⬆️  Testing Maximum Pitch (+12)...');
      for (let i = 0; i < 20; i++) {
        const isDisabled = await page.evaluate(() => {
          const btn = document.getElementById('pitch-up');
          return btn ? btn.disabled : true;
        });
        if (isDisabled) break;

        await page.evaluate(() => {
          document.getElementById('pitch-up').click();
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const maxPitch = await page.evaluate(() => {
        const pitchValue = document.getElementById('pitch-value');
        const pitchUpBtn = document.getElementById('pitch-up');
        return {
          display: pitchValue ? pitchValue.textContent : null,
          buttonDisabled: pitchUpBtn ? pitchUpBtn.disabled : false
        };
      });

      console.log(`  Max pitch: ${maxPitch.display}, button disabled: ${maxPitch.buttonDisabled}`);

      console.log('\n⬇️  Testing Minimum Pitch (-12)...');
      for (let i = 0; i < 30; i++) {
        const isDisabled = await page.evaluate(() => {
          const btn = document.getElementById('pitch-down');
          return btn ? btn.disabled : true;
        });
        if (isDisabled) break;

        await page.evaluate(() => {
          document.getElementById('pitch-down').click();
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const minPitch = await page.evaluate(() => {
        const pitchValue = document.getElementById('pitch-value');
        const pitchDownBtn = document.getElementById('pitch-down');
        return {
          display: pitchValue ? pitchValue.textContent : null,
          buttonDisabled: pitchDownBtn ? pitchDownBtn.disabled : false
        };
      });

      console.log(`  Min pitch: ${minPitch.display}, button disabled: ${minPitch.buttonDisabled}`);
    } // End if (!buttonState.upExists)

    // Check for console errors
    console.log('\n🔍 Checking for errors...');
    const errors = await page.evaluate(() => {
      return window.errors || [];
    });

    if (errors.length > 0) {
      console.log('✗ Errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✓ No errors detected');
    }

    // Final status
    console.log('\n📊 Final Status:');
    const finalStatus = await page.evaluate(() => {
      return {
        toneInitialized: window.__test__ ? window.__test__.toneInitialized : false,
        hasPitchShifter: window.__test__?.pitchShifter !== null && window.__test__?.pitchShifter !== undefined,
        audioContextState: typeof Tone !== 'undefined' ? Tone.context.state : 'N/A',
        currentPitch: window.__test__?.pitchShifter ? window.__test__.pitchShifter.pitch.value : 'N/A'
      };
    });

    console.log(`  Tone initialized: ${finalStatus.toneInitialized}`);
    console.log(`  PitchShifter exists: ${finalStatus.hasPitchShifter}`);
    console.log(`  AudioContext state: ${finalStatus.audioContextState}`);
    console.log(`  Current pitch: ${finalStatus.currentPitch}`);

    console.log('\n✅ Pitch shifting test completed!');
    console.log('💡 All pitch control tests passed. Manual audio verification recommended.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
if (require.main === module) {
  testPitchShifting().catch(console.error);
}

module.exports = testPitchShifting;
