## Why

Karaoke singers often need songs in different keys to match their vocal range. Songs that are too high or too low can be uncomfortable or impossible to sing. Currently, users have no way to adjust the pitch, forcing them to either struggle with uncomfortable keys or skip songs entirely.

## What Changes

- Add pitch control UI with ±3 semitone adjustment range
- Use HTML5 `preservesPitch` and `playbackRate` to shift pitch
- Provide pitch controls on both host and client views
- Display current pitch offset (+0, +1, -2, etc.)
- Sync pitch state across all clients via WebSocket
- Reset pitch to 0 when song changes

## Impact

- **Affected specs**: `playback-controls`
- **Affected code**:
  - `public/index.html` - Add pitch control buttons to host UI
  - `public/client.html` - Add pitch controls to remote tab
  - `public/js/karaoke.js` - Pitch adjustment logic for host
  - `public/js/client.js` - Pitch control logic for clients
  - `public/css/karaoke.css` - Styling for pitch controls
  - `public/css/client.css` - Styling for client pitch controls
  - `server/websocket.js` - Pitch sync WebSocket events
  - `server/state.js` - Add pitch to server state
