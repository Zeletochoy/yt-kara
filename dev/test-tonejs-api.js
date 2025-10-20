const puppeteer = require('puppeteer');

async function testToneJsAPI() {
  console.log('🎵 Testing Tone.js v15 API Structure\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[Tone.js]') || msg.text().includes('[Pitch]')) {
        console.log('Browser:', msg.text());
      }
    });

    // Investigate Tone.js PitchShift API
    const apiInfo = await page.evaluate(async () => {
      const results = {
        toneVersion: null,
        pitchShiftAPI: {},
        testResults: [],
        errors: []
      };

      try {
        // Check Tone.js version
        results.toneVersion = Tone.version;

        // Start Tone.js
        await Tone.start();

        // Create a PitchShift instance
        const ps = new Tone.PitchShift(0);

        // Investigate the pitch property
        results.pitchShiftAPI.pitchType = typeof ps.pitch;
        results.pitchShiftAPI.pitchValue = ps.pitch;
        results.pitchShiftAPI.pitchConstructor = ps.pitch?.constructor?.name;

        // Check if pitch has sub-properties
        if (ps.pitch && typeof ps.pitch === 'object') {
          results.pitchShiftAPI.pitchKeys = Object.keys(ps.pitch);
          results.pitchShiftAPI.hasValue = 'value' in ps.pitch;
          results.pitchShiftAPI.valueType = typeof ps.pitch.value;
        }

        // List all properties of PitchShift
        results.pitchShiftAPI.allProperties = Object.keys(ps).filter(key => !key.startsWith('_'));

        // Test different ways to set pitch
        const testMethods = [
          { method: 'direct', code: () => { ps.pitch = 5; return ps.pitch; } },
          { method: 'value', code: () => { ps.pitch.value = 5; return ps.pitch.value; } },
          { method: 'set', code: () => { ps.set({ pitch: 5 }); return ps.pitch; } },
          { method: 'rampTo', code: () => { ps.pitch.rampTo(5, 0.1); return ps.pitch.value; } }
        ];

        for (const test of testMethods) {
          try {
            const result = test.code();
            results.testResults.push({
              method: test.method,
              success: true,
              result: result
            });
          } catch (e) {
            results.testResults.push({
              method: test.method,
              success: false,
              error: e.message
            });
          }
        }

        // Check if we need to use semitones
        if (ps.pitch && ps.pitch.value !== undefined) {
          // Try setting different values
          ps.pitch.value = 0;
          const zeroValue = ps.pitch.value;
          ps.pitch.value = 1;
          const oneValue = ps.pitch.value;
          ps.pitch.value = 12;
          const twelveValue = ps.pitch.value;

          results.pitchShiftAPI.valueTests = {
            zero: zeroValue,
            one: oneValue,
            twelve: twelveValue
          };
        }

      } catch (e) {
        results.errors.push(e.message);
      }

      return results;
    });

    console.log('Tone.js Version:', apiInfo.toneVersion);
    console.log('\nPitchShift API Structure:');
    console.log('  pitch type:', apiInfo.pitchShiftAPI.pitchType);
    console.log('  pitch value:', apiInfo.pitchShiftAPI.pitchValue);
    console.log('  pitch constructor:', apiInfo.pitchShiftAPI.pitchConstructor);

    if (apiInfo.pitchShiftAPI.pitchKeys) {
      console.log('  pitch keys:', apiInfo.pitchShiftAPI.pitchKeys);
    }

    console.log('\nAll PitchShift properties:', apiInfo.pitchShiftAPI.allProperties);

    console.log('\nTest Results:');
    apiInfo.testResults.forEach(test => {
      if (test.success) {
        console.log(`  ${test.method}: ✓ (result: ${test.result})`);
      } else {
        console.log(`  ${test.method}: ✗ (${test.error})`);
      }
    });

    if (apiInfo.pitchShiftAPI.valueTests) {
      console.log('\nValue Tests:');
      console.log('  pitch.value = 0 →', apiInfo.pitchShiftAPI.valueTests.zero);
      console.log('  pitch.value = 1 →', apiInfo.pitchShiftAPI.valueTests.one);
      console.log('  pitch.value = 12 →', apiInfo.pitchShiftAPI.valueTests.twelve);
    }

    if (apiInfo.errors.length > 0) {
      console.log('\nErrors:', apiInfo.errors);
    }

    // Keep browser open for manual testing
    console.log('\n💡 Browser will stay open. Check the console for [Tone.js] and [Pitch] logs.');
    console.log('Try clicking the pitch buttons to see what happens.');

  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

testToneJsAPI().catch(console.error);
