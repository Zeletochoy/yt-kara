## 1. Implementation

### 1.1 Video Error Handling
- [ ] 1.1.1 Add `error` event listener to video element in `public/js/karaoke.js`
- [ ] 1.1.2 Implement timeout detection for video load failures (10 seconds)
- [ ] 1.1.3 Display user-friendly error message when video fails
- [ ] 1.1.4 Add "Skip This Song" button in error state
- [ ] 1.1.5 Auto-skip to next song after timeout (e.g., 15 seconds)
- [ ] 1.1.6 Remove failed video from cache in `server/cache-manager.js`
- [ ] 1.1.7 Log video errors to console for debugging

### 1.2 WebSocket Reconnection
- [ ] 1.2.1 Implement exponential backoff reconnection in `public/js/client.js`
- [ ] 1.2.2 Start with 1 second delay, double after each failure, max 30 seconds
- [ ] 1.2.3 Display connection status indicator on client view
- [ ] 1.2.4 Show "Reconnecting..." message during reconnection attempts
- [ ] 1.2.5 Restore client state after successful reconnection
- [ ] 1.2.6 Implement reconnection on host side in `public/js/karaoke.js`
- [ ] 1.2.7 Add server-side reconnection handling in `server/websocket.js`

### 1.3 YouTube.js Error Handling
- [ ] 1.3.1 Wrap YouTube.js calls in try-catch in `server/youtube.js`
- [ ] 1.3.2 Implement retry logic with exponential backoff (max 3 retries)
- [ ] 1.3.3 Return structured error responses to client
- [ ] 1.3.4 Handle specific error types: blocked videos, deleted videos, API rate limits
- [ ] 1.3.5 Log YouTube.js errors with context (video ID, operation)

### 1.4 UI Error States
- [ ] 1.4.1 Add error message container to `public/index.html`
- [ ] 1.4.2 Style error messages in `public/css/karaoke.css`
- [ ] 1.4.3 Add connection status indicator to `public/client.html`
- [ ] 1.4.4 Style connection status in `public/css/client.css` (green = connected, red = disconnected, yellow = reconnecting)
- [ ] 1.4.5 Display helpful error messages for common scenarios
- [ ] 1.4.6 Auto-hide error messages after successful recovery

### 1.5 Cache Error Recovery
- [ ] 1.5.1 Handle cache read/write errors in `server/cache-manager.js`
- [ ] 1.5.2 Implement cache invalidation for failed videos
- [ ] 1.5.3 Fallback to fresh fetch if cache fails
- [ ] 1.5.4 Log cache errors without crashing

## 2. Testing

### 2.1 Unit Testing
- [ ] 2.1.1 Test exponential backoff calculation
- [ ] 2.1.2 Test retry logic with max retry limits
- [ ] 2.1.3 Test error message formatting
- [ ] 2.1.4 Test connection status state transitions

### 2.2 Integration Testing
- [ ] 2.2.1 Test video error triggers auto-skip to next song
- [ ] 2.2.2 Test WebSocket reconnection restores state
- [ ] 2.2.3 Test YouTube.js retry on transient failures
- [ ] 2.2.4 Test cache fallback on read errors

### 2.3 Visual Testing
- [ ] 2.3.1 Run `npm run visual-test` and verify error UI displays correctly
- [ ] 2.3.2 Test connection status indicator colors (green/red/yellow)
- [ ] 2.3.3 Test error messages are readable and well-positioned
- [ ] 2.3.4 Test "Skip This Song" button is visible in error state

### 2.4 Manual Testing Scenarios
- [ ] 2.4.1 **Video load failure**: Add unavailable video, verify error message appears and auto-skip occurs
- [ ] 2.4.2 **Manual skip on error**: Click "Skip This Song" during error, verify immediate skip
- [ ] 2.4.3 **WebSocket disconnect**: Kill server, verify client shows "disconnected" and attempts reconnection
- [ ] 2.4.4 **WebSocket reconnect**: Restart server during disconnection, verify client reconnects and restores state
- [ ] 2.4.5 **YouTube.js failure**: Simulate API error, verify retry logic executes and eventually succeeds or fails gracefully
- [ ] 2.4.6 **Network timeout**: Simulate slow network, verify timeout detection works
- [ ] 2.4.7 **Cache corruption**: Corrupt cache file, verify fallback to fresh fetch
- [ ] 2.4.8 **Error message display**: Trigger various errors, verify user-friendly messages appear (not technical stack traces)
- [ ] 2.4.9 **Error recovery**: Verify error messages disappear after successful recovery
- [ ] 2.4.10 **Multiple failures**: Trigger 5 video failures in a row, verify system remains stable

## 3. Documentation
- [ ] 3.1 Update user-facing docs (if any) explaining error handling behavior
- [ ] 3.2 Document common error scenarios and expected behavior
