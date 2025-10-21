/* global displaySearchResults */
const TestHelper = require('./test-helper');
const puppeteer = require('puppeteer');

async function testFavoritesFinal() {
  console.log('🎯 Final Favorites Test with Event Delegation\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capture console messages
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Favorites]') || text.includes('toggleFavoriteById')) {
        logs.push(text);
      }
    });

    await page.goto('http://localhost:8080/client', { waitUntil: 'networkidle2' });
    console.log('✓ Client page loaded\n');

    // Clear favorites
    await page.evaluate(() => localStorage.clear());

    // Inject controlled mock data
    console.log('Step 1: Setting up test data...');
    const mockData = await page.evaluate(() => {
      const mockResults = [
        { videoId: 'AAA11111111', title: 'Test Song 1', channel: 'Artist A', duration: 180, thumbnail: 'https://i.ytimg.com/vi/AAA11111111/default.jpg' },
        { videoId: 'BBB22222222', title: 'Test Song 2', channel: 'Artist B', duration: 200, thumbnail: 'https://i.ytimg.com/vi/BBB22222222/default.jpg' },
        { videoId: 'CCC33333333', title: 'Test Song 3', channel: 'Artist C', duration: 220, thumbnail: 'https://i.ytimg.com/vi/CCC33333333/default.jpg' }
      ];

      // Store in cache and display
      window.searchResultsCache = mockResults;
      displaySearchResults(mockResults);

      // Return info about the buttons
      const buttons = Array.from(document.querySelectorAll('#search-results .favorite-btn'));
      return {
        buttonCount: buttons.length,
        buttonsHaveDataAttr: buttons.every(btn => btn.dataset.videoId),
        videoIds: buttons.map(btn => btn.dataset.videoId)
      };
    });

    console.log('✓ Mock data injected');
    console.log(`  - ${mockData.buttonCount} buttons rendered`);
    console.log(`  - Data attributes present: ${mockData.buttonsHaveDataAttr}`);
    console.log(`  - Video IDs: ${mockData.videoIds.join(', ')}\n`);

    // Test clicking first button
    console.log('Step 2: Testing first favorite button...');

    // Clear logs
    logs.length = 0;

    // Click first button
    await page.evaluate(() => {
      const button = document.querySelector('#search-results .favorite-btn[data-video-id="AAA11111111"]');
      button.click();
    });

    await new Promise(r => setTimeout(r, 100));

    const firstState = await page.evaluate(() => {
      const btn = document.querySelector('#search-results .favorite-btn[data-video-id="AAA11111111"]');
      const favs = getFavorites();
      return {
        buttonActive: btn.classList.contains('active'),
        favoritesCount: favs.length,
        favorites: favs.map(f => ({ videoId: f.videoId, title: f.title }))
      };
    });

    console.log('After first click:');
    console.log(`  - Button active: ${firstState.buttonActive}`);
    console.log(`  - Favorites count: ${firstState.favoritesCount}`);
    console.log(`  - In favorites: ${JSON.stringify(firstState.favorites)}`);

    const firstCorrect = firstState.buttonActive && firstState.favoritesCount === 1 &&
                        firstState.favorites[0].videoId === 'AAA11111111';
    console.log(`  - Result: ${firstCorrect ? '✓' : '✗'}\n`);

    // Test clicking second button
    console.log('Step 3: Testing second favorite button...');

    logs.length = 0;

    await page.evaluate(() => {
      const button = document.querySelector('#search-results .favorite-btn[data-video-id="BBB22222222"]');
      button.click();
    });

    await new Promise(r => setTimeout(r, 100));

    const secondState = await page.evaluate(() => {
      const btn1 = document.querySelector('#search-results .favorite-btn[data-video-id="AAA11111111"]');
      const btn2 = document.querySelector('#search-results .favorite-btn[data-video-id="BBB22222222"]');
      const favs = getFavorites();
      return {
        button1Active: btn1.classList.contains('active'),
        button2Active: btn2.classList.contains('active'),
        favoritesCount: favs.length,
        favorites: favs.map(f => ({ videoId: f.videoId, title: f.title }))
      };
    });

    console.log('After second click:');
    console.log(`  - Button 1 active: ${secondState.button1Active}`);
    console.log(`  - Button 2 active: ${secondState.button2Active}`);
    console.log(`  - Favorites count: ${secondState.favoritesCount}`);
    console.log(`  - In favorites: ${JSON.stringify(secondState.favorites)}`);

    const secondCorrect = secondState.button1Active && secondState.button2Active &&
                          secondState.favoritesCount === 2;
    console.log(`  - Result: ${secondCorrect ? '✓' : '✗'}\n`);

    // Test toggling off
    console.log('Step 4: Testing toggle off (unfavorite)...');

    await page.evaluate(() => {
      const button = document.querySelector('#search-results .favorite-btn[data-video-id="AAA11111111"]');
      button.click();
    });

    await new Promise(r => setTimeout(r, 100));

    const toggleState = await page.evaluate(() => {
      const btn1 = document.querySelector('#search-results .favorite-btn[data-video-id="AAA11111111"]');
      const btn2 = document.querySelector('#search-results .favorite-btn[data-video-id="BBB22222222"]');
      const favs = getFavorites();
      return {
        button1Active: btn1.classList.contains('active'),
        button2Active: btn2.classList.contains('active'),
        favoritesCount: favs.length,
        favorites: favs.map(f => ({ videoId: f.videoId, title: f.title }))
      };
    });

    console.log('After toggling first off:');
    console.log(`  - Button 1 active: ${toggleState.button1Active}`);
    console.log(`  - Button 2 active: ${toggleState.button2Active}`);
    console.log(`  - Favorites count: ${toggleState.favoritesCount}`);
    console.log(`  - In favorites: ${JSON.stringify(toggleState.favorites)}`);

    const toggleCorrect = !toggleState.button1Active && toggleState.button2Active &&
                          toggleState.favoritesCount === 1 &&
                          toggleState.favorites[0].videoId === 'BBB22222222';
    console.log(`  - Result: ${toggleCorrect ? '✓' : '✗'}\n`);

    // Test that song card clicks don't interfere
    console.log('Step 5: Testing song card click doesn\'t affect favorites...');

    await page.evaluate(() => {
      // Click on song info area (should add to queue, not affect favorites)
      const songInfo = document.querySelector('#search-results .song-info.clickable');
      songInfo.click();
    });

    await new Promise(r => setTimeout(r, 100));

    const finalState = await page.evaluate(() => {
      const btn2 = document.querySelector('#search-results .favorite-btn[data-video-id="BBB22222222"]');
      const favs = getFavorites();
      return {
        button2StillActive: btn2.classList.contains('active'),
        favoritesUnchanged: favs.length === 1 && favs[0].videoId === 'BBB22222222'
      };
    });

    console.log('After clicking song card:');
    console.log(`  - Button 2 still active: ${finalState.button2StillActive}`);
    console.log(`  - Favorites unchanged: ${finalState.favoritesUnchanged}`);

    const noInterference = finalState.button2StillActive && finalState.favoritesUnchanged;
    console.log(`  - Result: ${noInterference ? '✓' : '✗'}\n`);

    // Final result
    const allTestsPassed = firstCorrect && secondCorrect && toggleCorrect && noInterference;

    if (allTestsPassed) {
      console.log('✅ All tests passed! Favorites working correctly.');
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

TestHelper.withServer(testFavoritesFinal).catch(console.error);
