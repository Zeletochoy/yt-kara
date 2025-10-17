## 1. Implementation

### 1.1 Server-Side
- [x] 1.1.1 Add `volume` field to server state (`server/state.js`)
- [x] 1.1.2 Add `SET_VOLUME` WebSocket event handler (`server/websocket.js`)
- [x] 1.1.3 Broadcast volume changes to all connected clients
- [x] 1.1.4 Persist volume in session state

### 1.2 Host View (TV/Projector)
- [x] 1.2.1 Add volume slider UI to `public/index.html`
- [x] 1.2.2 Style volume slider in `public/css/karaoke.css`
- [x] 1.2.3 Implement volume change handler in `public/js/karaoke.js`
- [x] 1.2.4 Apply volume to video element using `video.volume` API
- [x] 1.2.5 Save volume preference to localStorage
- [x] 1.2.6 Load saved volume on page load

### 1.3 Client View (Phone Remote)
- [x] 1.3.1 Add volume slider to remote tab in `public/client.html`
- [x] 1.3.2 Style volume slider in `public/css/client.css`
- [x] 1.3.3 Implement volume change handler in `public/js/client.js`
- [x] 1.3.4 Send volume changes via WebSocket
- [x] 1.3.5 Update slider position when volume changes from other sources

## 2. Testing

### 2.1 Unit Testing
- [ ] 2.1.1 Test volume state initialization (default 100%)
- [ ] 2.1.2 Test volume bounds (0-100%)
- [ ] 2.1.3 Test localStorage persistence and retrieval

### 2.2 Integration Testing
- [ ] 2.2.1 Test WebSocket volume sync between host and clients
- [ ] 2.2.2 Test volume changes propagate to all connected clients
- [ ] 2.2.3 Test reconnection preserves volume state

### 2.3 Visual Testing
- [x] 2.3.1 Run `npm run visual-test` and verify volume sliders appear on both views
- [x] 2.3.2 Test slider styling matches app theme (dark mode)
- [x] 2.3.3 Test slider is accessible on mobile (touch-friendly, appropriate size)
- [ ] 2.3.4 Test slider position updates correctly when changed from remote

### 2.4 Manual Testing Scenarios
- [ ] 2.4.1 **Host volume change**: Adjust volume on TV, verify audio changes immediately
- [ ] 2.4.2 **Client volume change**: Adjust from phone, verify TV audio changes
- [ ] 2.4.3 **Multi-client sync**: Connect 3 phones, change volume from one, verify all sliders update
- [ ] 2.4.4 **Persistence**: Set volume to 50%, refresh page, verify volume is still 50%
- [ ] 2.4.5 **Bounds**: Try to set volume below 0 and above 100%, verify it clamps correctly
- [ ] 2.4.6 **During playback**: Change volume while song is playing, verify smooth adjustment
- [ ] 2.4.7 **On muted video**: Test volume slider works after video auto-unmutes

## 3. Documentation
- [ ] 3.1 Update user-facing docs (if any) mentioning volume control feature
