## Why

During karaoke parties, errors can disrupt the flow and kill the energy. Common issues include video load failures (blocked/deleted videos), network disconnections, WebSocket connection drops, and API failures. Currently, many errors crash the app or leave users stuck with no clear recovery path. Better error handling ensures the party continues smoothly even when things go wrong.

## What Changes

- Detect and handle video load failures gracefully
- Auto-skip to next song when current video fails to load after timeout
- Display user-friendly error messages instead of technical errors
- Implement WebSocket reconnection with exponential backoff
- Show connection status indicator (connected/disconnected)
- Retry failed YouTube.js operations (with limits)
- Add "Skip This Song" button when video errors occur
- Log errors to console but don't crash the application
- Provide fallback UI states for all error conditions
- Display helpful error messages to users (e.g., "This video is unavailable. Skipping to next song...")

## Impact

- **Affected specs**: `host-interface`, `playback-controls`, `client-interaction`
- **Affected code**:
  - `public/index.html` - Error message display areas
  - `public/client.html` - Connection status indicator
  - `public/js/karaoke.js` - Video error handlers, retry logic
  - `public/js/client.js` - WebSocket reconnection logic
  - `public/css/karaoke.css` - Error message styling
  - `public/css/client.css` - Connection status styling
  - `server/websocket.js` - Connection error handling
  - `server/youtube.js` - YouTube.js retry logic and error handling
  - `server/cache-manager.js` - Cache error recovery
