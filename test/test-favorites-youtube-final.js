const TestHelper = require('./test-helper');
const puppeteer = require('puppeteer');

async function testFavoritesYouTubeFinal() {
  console.log('🎬 Testing Favorites with Real YouTube Search (Final)\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    console.log('✓ Client page loaded\n');

    // Clear favorites
    await page.evaluate(() => localStorage.clear());

    // Perform real YouTube search
    console.log('1. Searching for "rick astley karaoke"...');
    await page.type('#search-input', 'rick astley');
    await page.click('#search-btn');

    // Wait for results with lenient timeout
    await new Promise(r => setTimeout(r, 6000));

    const hasResults = await page.evaluate(() => {
      const cards = document.querySelectorAll('#search-results .song-card');
      return cards.length > 0;
    });

    if (!hasResults) {
      console.log('⚠ No search results (YouTube/yt-dlp might be blocking). Test skipped.');
      await browser.close();
      process.exit(0); // Exit with success since this is expected in CI
    }

    const searchInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#search-results .favorite-btn'));
      const firstButton = buttons[0];
      const secondButton = buttons[1];

      return {
        resultCount: buttons.length,
        hasDataAttributes: buttons.every(btn => btn.dataset.videoId),
        firstVideoId: firstButton?.dataset.videoId || null,
        secondVideoId: secondButton?.dataset.videoId || null,
        firstTitle: firstButton?.closest('.song-card')?.querySelector('.song-title')?.textContent || null,
        secondTitle: secondButton?.closest('.song-card')?.querySelector('.song-title')?.textContent || null
      };
    });

    console.log(`✓ Got ${searchInfo.resultCount} search results`);
    console.log(`✓ All buttons have data attributes: ${searchInfo.hasDataAttributes}\n`);

    if (!searchInfo.firstVideoId || !searchInfo.secondVideoId) {
      console.log('❌ Missing video IDs in search results');
      await browser.close();
      process.exit(1);
    }

    // Test first favorite
    console.log('2. Testing first favorite button...');
    console.log(`   Song: ${searchInfo.firstTitle?.substring(0, 50)}...`);
    console.log(`   Video ID: ${searchInfo.firstVideoId}`);

    await page.evaluate((videoId) => {
      const button = document.querySelector(`#search-results .favorite-btn[data-video-id="${videoId}"]`);
      if (button) button.click();
    }, searchInfo.firstVideoId);

    await new Promise(r => setTimeout(r, 200));

    const firstState = await page.evaluate((videoId) => {
      const button = document.querySelector(`#search-results .favorite-btn[data-video-id="${videoId}"]`);
      const favs = getFavorites();
      return {
        buttonActive: button?.classList.contains('active'),
        inFavorites: favs.some(f => f.videoId === videoId),
        favoriteCount: favs.length
      };
    }, searchInfo.firstVideoId);

    console.log(`   Button active: ${firstState.buttonActive}`);
    console.log(`   In favorites: ${firstState.inFavorites}`);
    console.log(`   Total favorites: ${firstState.favoriteCount}`);
    console.log(`   Result: ${firstState.buttonActive && firstState.inFavorites ? '✓' : '✗'}\n`);

    // Test second favorite
    console.log('3. Testing second favorite button...');
    console.log(`   Song: ${searchInfo.secondTitle?.substring(0, 50)}...`);
    console.log(`   Video ID: ${searchInfo.secondVideoId}`);

    await page.evaluate((videoId) => {
      const button = document.querySelector(`#search-results .favorite-btn[data-video-id="${videoId}"]`);
      if (button) button.click();
    }, searchInfo.secondVideoId);

    await new Promise(r => setTimeout(r, 200));

    const secondState = await page.evaluate((firstId, secondId) => {
      const button1 = document.querySelector(`#search-results .favorite-btn[data-video-id="${firstId}"]`);
      const button2 = document.querySelector(`#search-results .favorite-btn[data-video-id="${secondId}"]`);
      const favs = getFavorites();
      return {
        button1Active: button1?.classList.contains('active'),
        button2Active: button2?.classList.contains('active'),
        both1nFavorites: favs.some(f => f.videoId === firstId) && favs.some(f => f.videoId === secondId),
        favoriteCount: favs.length
      };
    }, searchInfo.firstVideoId, searchInfo.secondVideoId);

    console.log(`   Button 1 still active: ${secondState.button1Active}`);
    console.log(`   Button 2 active: ${secondState.button2Active}`);
    console.log(`   Both in favorites: ${secondState.bothInFavorites}`);
    console.log(`   Total favorites: ${secondState.favoriteCount}`);
    console.log(`   Result: ${secondState.button1Active && secondState.button2Active && secondState.favoriteCount === 2 ? '✓' : '✗'}\n`);

    // Test toggle off
    console.log('4. Testing toggle off first song...');

    await page.evaluate((videoId) => {
      const button = document.querySelector(`#search-results .favorite-btn[data-video-id="${videoId}"]`);
      if (button) button.click();
    }, searchInfo.firstVideoId);

    await new Promise(r => setTimeout(r, 200));

    const toggleState = await page.evaluate((firstId, secondId) => {
      const button1 = document.querySelector(`#search-results .favorite-btn[data-video-id="${firstId}"]`);
      const button2 = document.querySelector(`#search-results .favorite-btn[data-video-id="${secondId}"]`);
      const favs = getFavorites();
      return {
        button1Active: button1?.classList.contains('active'),
        button2Active: button2?.classList.contains('active'),
        onlySecondInFavorites: !favs.some(f => f.videoId === firstId) && favs.some(f => f.videoId === secondId),
        favoriteCount: favs.length
      };
    }, searchInfo.firstVideoId, searchInfo.secondVideoId);

    console.log(`   Button 1 active: ${toggleState.button1Active}`);
    console.log(`   Button 2 still active: ${toggleState.button2Active}`);
    console.log(`   Only second in favorites: ${toggleState.onlySecondInFavorites}`);
    console.log(`   Total favorites: ${toggleState.favoriteCount}`);
    console.log(`   Result: ${!toggleState.button1Active && toggleState.button2Active && toggleState.onlySecondInFavorites ? '✓' : '✗'}\n`);

    const allPassed =
      firstState.buttonActive && firstState.inFavorites &&
      secondState.button1Active && secondState.button2Active && secondState.favoriteCount === 2 &&
      !toggleState.button1Active && toggleState.button2Active && toggleState.onlySecondInFavorites;

    if (allPassed) {
      console.log('✅ All tests passed! Favorites working with YouTube search.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Check results above.');
      await browser.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await browser.close();
    process.exit(1);
  }
}

TestHelper.withServer(testFavoritesYouTubeFinal).catch(console.error);
