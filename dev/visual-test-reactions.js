const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function visualTestReactions() {
  // Create screenshot directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, '..', 'screenshots', `reactions-${timestamp}`);
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('Starting reactions visual tests...');
  console.log(`Screenshots will be saved to: ${screenshotDir}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test 1: Reaction buttons on mobile client
    console.log('\n📱 Testing reaction buttons on mobile client...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 667, isMobile: true });
    await mobilePage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Switch to remote tab to see reactions
    await mobilePage.click('[data-tab="remote"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    await mobilePage.screenshot({
      path: path.join(screenshotDir, '01-mobile-reaction-buttons.png'),
      fullPage: true
    });
    console.log('  ✓ Captured reaction buttons');

    // Verify button properties
    const buttonProps = await mobilePage.evaluate(() => {
      const buttons = document.querySelectorAll('.reaction-btn');
      return Array.from(buttons).map(btn => {
        const rect = btn.getBoundingClientRect();
        return {
          emoji: btn.getAttribute('data-reaction'),
          width: rect.width,
          height: rect.height,
          visible: window.getComputedStyle(btn).display !== 'none'
        };
      });
    });

    console.log('\n📊 Reaction Button Properties:');
    buttonProps.forEach(({ emoji, width, height, visible }) => {
      const touchFriendly = width >= 60 && height >= 60;
      console.log(`  ${emoji}: ${width}x${height}px - ${touchFriendly ? '✓' : '✗'} touch-friendly (${visible ? 'visible' : 'hidden'})`);
    });

    // Test 2: Reaction button sizes on different viewports
    console.log('\n📲 Testing on tablet viewport...');
    const tabletPage = await browser.newPage();
    await tabletPage.setViewport({ width: 768, height: 1024 });
    await tabletPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await tabletPage.click('[data-tab="remote"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    await tabletPage.screenshot({
      path: path.join(screenshotDir, '02-tablet-reaction-buttons.png'),
      fullPage: true
    });
    console.log('  ✓ Captured tablet reaction buttons');

    // Test 3: Host reaction container
    console.log('\n📺 Testing host reaction display...');
    const hostPage = await browser.newPage();
    await hostPage.setViewport({ width: 1920, height: 1080 });
    await hostPage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify reaction container exists and has correct z-index
    const containerProps = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      return {
        exists: !!container,
        zIndex: container ? window.getComputedStyle(container).zIndex : null,
        position: container ? window.getComputedStyle(container).position : null,
        overflow: container ? window.getComputedStyle(container).overflow : null
      };
    });

    console.log('\n📊 Reaction Container Properties:');
    console.log(`  Exists: ${containerProps.exists ? '✓' : '✗'}`);
    console.log(`  Z-index: ${containerProps.zIndex} (expected: 900)`);
    console.log(`  Position: ${containerProps.position} (expected: absolute)`);
    console.log(`  Overflow: ${containerProps.overflow} (expected: hidden)`);

    await hostPage.screenshot({
      path: path.join(screenshotDir, '03-host-reaction-container.png'),
      fullPage: true
    });
    console.log('  ✓ Captured host view');

    // Test 4: Simulate reactions appearing
    console.log('\n🎭 Simulating reaction animations...');
    await hostPage.evaluate(() => {
      // Simulate multiple reactions at different positions
      const emojis = ['👏', '❤️', '🔥', '😂', '🎉'];
      const container = document.getElementById('reaction-container');

      emojis.forEach((emoji, i) => {
        const reaction = document.createElement('div');
        reaction.className = 'reaction';
        reaction.textContent = emoji;
        reaction.style.left = `${20 + i * 15}%`;
        reaction.style.bottom = '0';
        container.appendChild(reaction);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 500)); // Let reactions start animating

    await hostPage.screenshot({
      path: path.join(screenshotDir, '04-host-with-reactions.png'),
      fullPage: true
    });
    console.log('  ✓ Captured reactions on host');

    // Wait a bit and capture mid-animation
    await new Promise(resolve => setTimeout(resolve, 1000));

    await hostPage.screenshot({
      path: path.join(screenshotDir, '05-host-reactions-mid-animation.png'),
      fullPage: true
    });
    console.log('  ✓ Captured reactions mid-animation');

    // Test 5: Visual feedback on button press
    console.log('\n👆 Testing button press feedback...');

    // Capture before press
    await mobilePage.screenshot({
      path: path.join(screenshotDir, '06-mobile-before-press.png'),
      fullPage: false
    });

    // Simulate active state
    await mobilePage.evaluate(() => {
      const btn = document.querySelector('.reaction-btn');
      btn.classList.add('active');
    });

    await mobilePage.screenshot({
      path: path.join(screenshotDir, '07-mobile-button-active.png'),
      fullPage: false
    });
    console.log('  ✓ Captured button active state');

    // Test 6: Check CSS animation exists
    const animationExists = await hostPage.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      let hasFloatUp = false;

      for (const sheet of styles) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (const rule of rules) {
            // eslint-disable-next-line no-undef
            if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'floatUp') {
              hasFloatUp = true;
              break;
            }
          }
        // eslint-disable-next-line no-unused-vars
        } catch (_e) {
          // Cross-origin stylesheet
        }
      }
      return hasFloatUp;
    });

    console.log('\n📊 CSS Animation Check:');
    console.log(`  floatUp keyframe: ${animationExists ? '✓ exists' : '✗ missing'}`);

    // Test 7: Verify reactions don't appear during search
    console.log('\n🔍 Testing reactions only appear during playback...');
    await mobilePage.click('[data-tab="search"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Try to send a reaction while on search tab
    const displayedDuringSearch = await hostPage.evaluate(() => {
      const container = document.getElementById('reaction-container');
      const initialCount = container.children.length;

      // Call displayReaction directly (won't work if video is paused)
      const videoPlayer = document.getElementById('video-player');
      if (typeof displayReaction === 'function') {
        // eslint-disable-next-line no-undef
        displayReaction({ type: '🎉', clientId: 'test', timestamp: Date.now() });
      }

      const afterCount = container.children.length;
      return {
        initialCount,
        afterCount,
        videoPaused: videoPlayer.paused,
        displayed: afterCount > initialCount
      };
    });

    console.log(`  Video paused: ${displayedDuringSearch.videoPaused ? '✓' : '✗'}`);
    console.log(`  Reaction blocked: ${!displayedDuringSearch.displayed ? '✓ correct' : '✗ shown when paused'}`);

    // Generate summary
    console.log('\n✅ Visual tests completed successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotDir}`);

    generateSummary(screenshotDir, timestamp, buttonProps, containerProps, animationExists);

  } catch (error) {
    console.error('Visual test failed:', error);
  } finally {
    await browser.close();
  }
}

function generateSummary(screenshotDir, timestamp, buttonProps, containerProps, animationExists) {
  const screenshots = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Reactions Visual Test Results - ${timestamp}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      background: #f5f5f5;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 40px; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .summary table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary td, .summary th {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .summary th {
      background: #f9f9f9;
      font-weight: 600;
    }
    .pass { color: #4caf50; font-weight: bold; }
    .fail { color: #f44336; font-weight: bold; }
    .screenshot {
      margin: 20px 0;
      background: white;
      padding: 20px;
      border-radius: 8px;
    }
    .screenshot img {
      width: 100%;
      max-width: 1000px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .screenshot h3 {
      color: #666;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <h1>🎉 Reactions System Visual Test Results</h1>
  <p>Generated: ${timestamp}</p>

  <div class="summary">
    <h2>Test Summary</h2>

    <h3>Reaction Buttons (Mobile)</h3>
    <table>
      <tr>
        <th>Emoji</th>
        <th>Size</th>
        <th>Touch-Friendly (≥60px)</th>
      </tr>
      ${buttonProps.map(b => `
        <tr>
          <td>${b.emoji}</td>
          <td>${b.width}×${b.height}px</td>
          <td class="${b.width >= 60 && b.height >= 60 ? 'pass' : 'fail'}">
            ${b.width >= 60 && b.height >= 60 ? '✓ Pass' : '✗ Fail'}
          </td>
        </tr>
      `).join('')}
    </table>

    <h3>Reaction Container (Host)</h3>
    <table>
      <tr>
        <th>Property</th>
        <th>Value</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Exists</td>
        <td>${containerProps.exists ? 'Yes' : 'No'}</td>
        <td class="${containerProps.exists ? 'pass' : 'fail'}">
          ${containerProps.exists ? '✓ Pass' : '✗ Fail'}
        </td>
      </tr>
      <tr>
        <td>Z-index</td>
        <td>${containerProps.zIndex}</td>
        <td class="${containerProps.zIndex === '900' ? 'pass' : 'fail'}">
          ${containerProps.zIndex === '900' ? '✓ Pass (900)' : '⚠ Expected 900'}
        </td>
      </tr>
      <tr>
        <td>Position</td>
        <td>${containerProps.position}</td>
        <td class="${containerProps.position === 'absolute' ? 'pass' : 'fail'}">
          ${containerProps.position === 'absolute' ? '✓ Pass' : '⚠ Expected absolute'}
        </td>
      </tr>
    </table>

    <h3>CSS Animations</h3>
    <table>
      <tr>
        <th>Animation</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>floatUp keyframe</td>
        <td class="${animationExists ? 'pass' : 'fail'}">
          ${animationExists ? '✓ Exists' : '✗ Missing'}
        </td>
      </tr>
    </table>
  </div>

  <h2>Screenshots</h2>
  ${screenshots.map(file => `
    <div class="screenshot">
      <h3>${file.replace(/^\d+-/, '').replace('.png', '').replace(/-/g, ' ')}</h3>
      <img src="${file}" alt="${file}" loading="lazy">
    </div>
  `).join('')}
</body>
</html>
  `;

  fs.writeFileSync(path.join(screenshotDir, 'index.html'), html);
  console.log(`\n📄 Summary page generated: ${path.join(screenshotDir, 'index.html')}`);
}

// Run if called directly
if (require.main === module) {
  visualTestReactions().catch(console.error);
}

module.exports = visualTestReactions;
