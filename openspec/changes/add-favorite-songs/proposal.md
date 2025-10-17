## Why

During karaoke parties, users often have go-to songs they love to perform. Currently, they must search for these songs every time, which is time-consuming and interrupts the flow. A favorites system allows users to quickly access their preferred songs without repeated searches, improving the party experience.

## What Changes

- Add "Favorite" button/icon on search results and queue items
- Store favorites in localStorage by video ID (not full URL, to handle URL changes)
- Add "Favorites" tab/section in search interface
- Display favorites list with quick-add functionality
- Persist favorites across sessions
- Allow removal of songs from favorites
- Sync favorites state (visual indication) when viewing search results
- Store video metadata (title, artist, thumbnail) with favorites for display

## Impact

- **Affected specs**: `search-interface`, `client-interaction`
- **Affected code**:
  - `public/index.html` - Add favorites tab/section to host search UI
  - `public/client.html` - Add favorites section to client search
  - `public/js/karaoke.js` - Favorites management logic for host
  - `public/js/client.js` - Favorites management logic for clients
  - `public/css/karaoke.css` - Styling for favorites UI
  - `public/css/client.css` - Styling for client favorites UI
  - `public/js/favorites.js` (new) - Shared favorites utility functions
