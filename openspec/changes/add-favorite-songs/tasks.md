## 1. Implementation

### 1.1 Favorites Utility Module
- [ ] 1.1.1 Create `public/js/favorites.js` with shared utility functions
- [ ] 1.1.2 Implement `addFavorite(videoId, metadata)` - stores by video ID with metadata
- [ ] 1.1.3 Implement `removeFavorite(videoId)` - removes from localStorage
- [ ] 1.1.4 Implement `getFavorites()` - retrieves all favorites from localStorage
- [ ] 1.1.5 Implement `isFavorite(videoId)` - checks if video is in favorites
- [ ] 1.1.6 Store favorites as array of objects: `{videoId, title, artist, thumbnail, addedAt}`
- [ ] 1.1.7 Use video ID extraction to normalize URLs before storing

### 1.2 Host View (TV/Projector)
- [ ] 1.2.1 Add favorite button/icon to search results in `public/index.html`
- [ ] 1.2.2 Add favorite button to queue items (optional)
- [ ] 1.2.3 Add "Favorites" tab/section to search interface
- [ ] 1.2.4 Display favorites list with thumbnails, titles, and quick-add buttons
- [ ] 1.2.5 Style favorites UI in `public/css/karaoke.css`
- [ ] 1.2.6 Implement favorite toggle handler in `public/js/karaoke.js`
- [ ] 1.2.7 Implement quick-add from favorites list
- [ ] 1.2.8 Update favorite icon state when viewing search results
- [ ] 1.2.9 Load favorites on page load

### 1.3 Client View (Phone Remote)
- [ ] 1.3.1 Add favorite button to search results in `public/client.html`
- [ ] 1.3.2 Add "Favorites" section/tab to client search interface
- [ ] 1.3.3 Display favorites list with quick-add functionality
- [ ] 1.3.4 Style favorites UI in `public/css/client.css`
- [ ] 1.3.5 Implement favorite toggle handler in `public/js/client.js`
- [ ] 1.3.6 Implement quick-add from favorites on client
- [ ] 1.3.7 Update favorite icon state when viewing search results

## 2. Testing

### 2.1 Unit Testing
- [ ] 2.1.1 Test `addFavorite()` stores video with correct metadata
- [ ] 2.1.2 Test `removeFavorite()` removes video from localStorage
- [ ] 2.1.3 Test `getFavorites()` retrieves all stored favorites
- [ ] 2.1.4 Test `isFavorite()` correctly identifies favorite videos
- [ ] 2.1.5 Test video ID extraction from various URL formats
- [ ] 2.1.6 Test localStorage persistence across page reloads

### 2.2 Integration Testing
- [ ] 2.2.1 Test adding favorite from search results updates UI
- [ ] 2.2.2 Test removing favorite updates all relevant UI elements
- [ ] 2.2.3 Test favorites sync between host and client (same localStorage domain)
- [ ] 2.2.4 Test quick-add from favorites adds song to queue

### 2.3 Visual Testing
- [ ] 2.3.1 Run `npm run visual-test` and verify favorites UI appears
- [ ] 2.3.2 Test favorite icons are visible and distinguishable (filled vs outline)
- [ ] 2.3.3 Test favorites tab/section displays correctly on both views
- [ ] 2.3.4 Test empty favorites state shows helpful message

### 2.4 Manual Testing Scenarios
- [ ] 2.4.1 **Add favorite**: Click favorite icon on search result, verify icon fills and song appears in favorites list
- [ ] 2.4.2 **Remove favorite**: Click filled favorite icon, verify icon empties and song removes from list
- [ ] 2.4.3 **Persistence**: Add 3 favorites, refresh page, verify all 3 still appear
- [ ] 2.4.4 **URL change resilience**: Add favorite, manually change URL format in localStorage (same video ID), verify it still works
- [ ] 2.4.5 **Quick-add**: Click add button from favorites list, verify song adds to queue
- [ ] 2.4.6 **Metadata display**: Verify favorites show correct title, artist, and thumbnail
- [ ] 2.4.7 **State sync**: Add favorite in search results, open favorites tab, verify it appears
- [ ] 2.4.8 **Multi-client**: Add favorite on phone, check host view favorites, verify it appears (same localStorage)
- [ ] 2.4.9 **Empty state**: Clear all favorites, verify empty state message displays
- [ ] 2.4.10 **Duplicate handling**: Try to add same song twice, verify no duplicates created

## 3. Documentation
- [ ] 3.1 Update user-facing docs (if any) explaining favorites feature
