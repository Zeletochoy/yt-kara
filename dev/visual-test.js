const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function visualTest() {
  // Create screenshot directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, '..', 'screenshots', timestamp);
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('Starting visual tests...');
  console.log(`Screenshots will be saved to: ${screenshotDir}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test 1: Karaoke view (Desktop/TV)
    console.log('\n📺 Testing Karaoke View...');
    const karaokePage = await browser.newPage();
    await karaokePage.setViewport({ width: 1920, height: 1080 });
    await karaokePage.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for WebSocket connection

    await karaokePage.screenshot({
      path: path.join(screenshotDir, '01-karaoke-empty.png'),
      fullPage: true
    });
    console.log('  ✓ Captured empty karaoke view');

    // Test 2: Mobile client view
    console.log('\n📱 Testing Mobile Client View...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 667, isMobile: true });
    await mobilePage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Screenshot search tab
    await mobilePage.screenshot({
      path: path.join(screenshotDir, '02-mobile-search.png'),
      fullPage: true
    });
    console.log('  ✓ Captured mobile search view');

    // Test search functionality
    await mobilePage.type('#search-input', 'Queen Bohemian Rhapsody');
    await mobilePage.click('#search-btn');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for search results

    await mobilePage.screenshot({
      path: path.join(screenshotDir, '03-mobile-search-results.png'),
      fullPage: true
    });
    console.log('  ✓ Captured search results');

    // Click on queue tab
    await mobilePage.click('[data-tab="queue"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    await mobilePage.screenshot({
      path: path.join(screenshotDir, '04-mobile-queue-empty.png'),
      fullPage: true
    });
    console.log('  ✓ Captured empty queue');

    // Click on history tab
    await mobilePage.click('[data-tab="history"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    await mobilePage.screenshot({
      path: path.join(screenshotDir, '05-mobile-history.png'),
      fullPage: true
    });
    console.log('  ✓ Captured history view');

    // Test 3: Tablet view
    console.log('\n📲 Testing Tablet View...');
    const tabletPage = await browser.newPage();
    await tabletPage.setViewport({ width: 768, height: 1024 });
    await tabletPage.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await tabletPage.screenshot({
      path: path.join(screenshotDir, '06-tablet-view.png'),
      fullPage: true
    });
    console.log('  ✓ Captured tablet view');

    // Test 4: Different states
    console.log('\n🎨 Testing Different States...');

    // Simulate disconnected state
    await mobilePage.evaluate(() => {
      document.getElementById('connection-status').classList.add('disconnected');
    });

    await mobilePage.screenshot({
      path: path.join(screenshotDir, '07-mobile-disconnected.png'),
      fullPage: false
    });
    console.log('  ✓ Captured disconnected state');

    console.log('\n✅ Visual tests completed successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotDir}`);

    // Generate summary HTML
    generateSummary(screenshotDir, timestamp);

  } catch (error) {
    console.error('Visual test failed:', error);
  } finally {
    await browser.close();
  }
}

function generateSummary(screenshotDir, timestamp) {
  const screenshots = fs.readdirSync(screenshotDir);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Test Results - ${timestamp}</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .screenshot { margin: 20px 0; background: white; padding: 20px; border-radius: 8px; }
    .screenshot img { width: 100%; max-width: 1000px; border: 1px solid #ddd; }
    .screenshot h3 { color: #666; }
  </style>
</head>
<body>
  <h1>Visual Test Results - ${timestamp}</h1>
  ${screenshots.map(file => `
    <div class="screenshot">
      <h3>${file}</h3>
      <img src="${file}" alt="${file}">
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
  visualTest().catch(console.error);
}

module.exports = visualTest;
