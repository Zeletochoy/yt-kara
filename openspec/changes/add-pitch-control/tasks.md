## 1. Implementation

### 1.1 Server-Side
- [x] 1.1.1 Add `pitch` field to server state (`server/state.js`)
- [x] 1.1.2 Add `SET_PITCH` WebSocket event handler (`server/websocket.js`)
- [x] 1.1.3 Broadcast pitch changes to all connected clients
- [x] 1.1.4 Reset pitch to 0 when song changes
- [x] 1.1.5 Enforce pitch bounds (±3 semitones) on server

### 1.2 Host View (TV/Projector)
- [x] 1.2.1 Add pitch control buttons (+/-) to `public/index.html`
- [x] 1.2.2 Add pitch offset display to show current pitch (+0, +1, -2, etc.)
- [x] 1.2.3 Style pitch controls in `public/css/karaoke.css`
- [x] 1.2.4 Implement pitch adjustment logic in `public/js/karaoke.js`
- [x] 1.2.5 Apply pitch using `video.preservesPitch = false` and `video.playbackRate`
- [x] 1.2.6 Calculate playbackRate using formula: `rate = Math.pow(2, semitones/12)`
- [x] 1.2.7 Reset pitch display when song changes

### 1.3 Client View (Phone Remote)
- [x] 1.3.1 Add pitch control buttons to remote tab in `public/client.html`
- [x] 1.3.2 Add pitch offset display to client remote
- [x] 1.3.3 Style pitch controls in `public/css/client.css`
- [x] 1.3.4 Implement pitch change handler in `public/js/client.js`
- [x] 1.3.5 Send pitch changes via WebSocket
- [x] 1.3.6 Update pitch display when changes come from other sources

## 2. Testing

### 2.1 Unit Testing
- [ ] 2.1.1 Test pitch state initialization (default 0)
- [ ] 2.1.2 Test pitch bounds enforcement (±3 semitones)
- [ ] 2.1.3 Test playbackRate calculation formula for various semitone values
- [ ] 2.1.4 Test pitch reset on song change

### 2.2 Integration Testing
- [ ] 2.2.1 Test WebSocket pitch sync between host and clients
- [ ] 2.2.2 Test pitch changes propagate to all connected clients
- [ ] 2.2.3 Test pitch resets when new song starts playing
- [ ] 2.2.4 Test reconnection preserves current pitch state

### 2.3 Visual Testing
- [x] 2.3.1 Run `npm run visual-test` and verify pitch controls appear on both views
- [x] 2.3.2 Test pitch offset display shows correct format (+0, +1, -2, etc.)
- [x] 2.3.3 Test buttons are touch-friendly on mobile (appropriate size)
- [ ] 2.3.4 Test pitch display updates correctly when changed from remote

### 2.4 Manual Testing Scenarios
- [ ] 2.4.1 **Pitch up**: Click + button, verify pitch increases by 1 semitone and audio sounds higher
- [ ] 2.4.2 **Pitch down**: Click - button, verify pitch decreases by 1 semitone and audio sounds lower
- [ ] 2.4.3 **Multi-client sync**: Connect 3 phones, change pitch from one, verify all displays update
- [ ] 2.4.4 **Bounds enforcement**: Try to go beyond +3 or -3, verify it stops at limits
- [ ] 2.4.5 **Song change reset**: Set pitch to +2, skip to next song, verify pitch resets to 0
- [ ] 2.4.6 **During playback**: Change pitch while song is playing, verify smooth audio adjustment
- [ ] 2.4.7 **Multiple adjustments**: Click + three times, verify display shows +3 and audio is higher
- [ ] 2.4.8 **Audio quality**: Test at +3 and -3, verify audio doesn't distort excessively
- [ ] 2.4.9 **Client control**: Adjust pitch from phone remote, verify TV audio changes
- [ ] 2.4.10 **Playback continuity**: Change pitch mid-song, verify video continues playing smoothly

## 3. Documentation
- [ ] 3.1 Update user-facing docs (if any) mentioning pitch control feature
