## Why

During karaoke parties, users need to balance the volume between the music/backing track and their live singing through microphones. Currently, they must use system-level volume controls, which is inconvenient and doesn't allow for quick adjustments during performances. This creates a poor user experience when singers need to adjust volumes mid-song.

## What Changes

- Add volume slider control to the host view (TV/projector display)
- Add volume slider control to client remote views (phone controllers)
- Sync volume state across all connected clients via WebSocket
- Persist volume preference in localStorage for host
- Volume range: 0-100%, default 100%
- Real-time volume adjustment using HTML5 video.volume API

## Impact

- **Affected specs**: `playback-controls`
- **Affected code**:
  - `public/index.html` - Add volume slider to host UI
  - `public/client.html` - Add volume slider to remote tab
  - `public/js/karaoke.js` - Volume control logic for host
  - `public/js/client.js` - Volume control logic for clients
  - `public/css/karaoke.css` - Styling for host volume slider
  - `public/css/client.css` - Styling for client volume slider
  - `server/websocket.js` - Volume sync WebSocket events
  - `server/state.js` - Add volume to server state
