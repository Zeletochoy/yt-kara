## 1. Implementation

### 1.1 Server-Side
- [ ] 1.1.1 Add `SEND_REACTION` WebSocket event handler in `server/websocket.js`
- [ ] 1.1.2 Broadcast reactions to the host (and optionally all clients)
- [ ] 1.1.3 Implement throttling to prevent reaction spam (1 reaction per second per client)
- [ ] 1.1.4 Add reaction metadata: type (emoji), clientId, timestamp

### 1.2 Host View (TV/Projector)
- [ ] 1.2.1 Add reaction animation container to `public/index.html`
- [ ] 1.2.2 Create CSS animations for floating reactions in `public/css/karaoke.css`
- [ ] 1.2.3 Implement reaction display logic in `public/js/karaoke.js`
- [ ] 1.2.4 Listen for `REACTION_RECEIVED` WebSocket events
- [ ] 1.2.5 Spawn animated emoji at random horizontal position
- [ ] 1.2.6 Animate reaction to rise and fade out (2-3 second duration)
- [ ] 1.2.7 Remove reaction element from DOM after animation completes
- [ ] 1.2.8 Show reaction count overlay for simultaneous reactions (optional)
- [ ] 1.2.9 Only display reactions during video playback, not during search

### 1.3 Client View (Phone Remote)
- [ ] 1.3.1 Add reaction buttons to remote tab in `public/client.html`
- [ ] 1.3.2 Style reaction buttons as large touch-friendly emojis in `public/css/client.css`
- [ ] 1.3.3 Implement reaction sending logic in `public/js/client.js`
- [ ] 1.3.4 Send reaction via WebSocket with type and timestamp
- [ ] 1.3.5 Implement client-side throttling (disable buttons for 1 second after sending)
- [ ] 1.3.6 Provide visual feedback when reaction is sent (button pulse/scale animation)

## 2. Testing

### 2.1 Unit Testing
- [ ] 2.1.1 Test reaction throttling logic (prevent spam)
- [ ] 2.1.2 Test reaction data structure (type, clientId, timestamp)
- [ ] 2.1.3 Test animation cleanup after completion

### 2.2 Integration Testing
- [ ] 2.2.1 Test reaction sent from client appears on host
- [ ] 2.2.2 Test multiple simultaneous reactions from different clients
- [ ] 2.2.3 Test throttling prevents rapid-fire reactions
- [ ] 2.2.4 Test reactions only display during playback

### 2.3 Visual Testing
- [ ] 2.3.1 Run `npm run visual-test` and verify reaction buttons appear on client
- [ ] 2.3.2 Test reaction buttons are large and touch-friendly (minimum 60x60px)
- [ ] 2.3.3 Test reaction animations are smooth and visually appealing
- [ ] 2.3.4 Test reactions don't obstruct video content excessively

### 2.4 Manual Testing Scenarios
- [ ] 2.4.1 **Send reaction**: Tap applause on phone, verify 👏 emoji floats up on TV
- [ ] 2.4.2 **Multiple reactions**: Have 3 people send reactions simultaneously, verify all appear
- [ ] 2.4.3 **Throttling**: Tap reaction button rapidly, verify only 1 per second is sent
- [ ] 2.4.4 **Animation timing**: Watch full reaction animation, verify it lasts 2-3 seconds
- [ ] 2.4.5 **Random positioning**: Send 10 reactions, verify they appear at different horizontal positions
- [ ] 2.4.6 **Visual feedback**: Tap reaction button, verify button provides immediate feedback (pulse/scale)
- [ ] 2.4.7 **During playback only**: Try sending reaction during search, verify it doesn't appear
- [ ] 2.4.8 **All reaction types**: Test each emoji type (👏 ❤️ 🔥 😂 🎉), verify all display correctly
- [ ] 2.4.9 **DOM cleanup**: Send 50 reactions, verify old elements are removed from DOM
- [ ] 2.4.10 **Performance**: Send reactions during video playback, verify no frame drops or lag

## 3. Documentation
- [ ] 3.1 Update user-facing docs (if any) explaining reactions feature
