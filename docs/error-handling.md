# Error Handling and Recovery

This document explains how YT-Kara handles errors and recovers from failures to ensure a smooth karaoke experience.

## Overview

YT-Kara implements comprehensive error handling across all critical systems:

- **Video playback errors** - Automatic skip and retry logic
- **WebSocket disconnections** - Automatic reconnection with exponential backoff
- **YouTube API failures** - Retry logic with intelligent error categorization
- **Cache corruption** - Automatic detection and cleanup

## Video Error Handling

### What Happens When a Video Fails

When a video fails to load or encounters an error:

1. **Error Detection**: The system detects video errors through:
   - HTML5 video `error` event
   - 10-second loading timeout
   - HTTP status codes from video sources

2. **User Feedback**: An error overlay displays:
   - Clear error message explaining what went wrong
   - 15-second countdown to auto-skip
   - "Skip This Song" button for immediate skip

3. **Automatic Recovery**:
   - Video automatically skips after 15 seconds
   - Failed video is removed from cache
   - Queue advances to next song

### Common Error Messages

| Error Message | Cause | What Happens Next |
|--------------|-------|-------------------|
| "Video failed to load" | Video source unreachable | Auto-skip after 15s |
| "Video is taking too long to load" | Loading timeout (10s) | Auto-skip after 15s |
| "This video is unavailable" | Video deleted/private | Immediate skip |

### Manual Override

Users can click the "Skip This Song" button at any time to immediately skip the failed video without waiting for the countdown.

## WebSocket Reconnection

### Connection States

The client connection indicator shows three states:

- **🟢 Connected** (green) - Normal operation
- **🟡 Reconnecting** (yellow, pulsing) - Attempting to reconnect
- **🔴 Disconnected** (red) - Connection lost, will retry

### Automatic Reconnection

When the WebSocket connection is lost:

1. **Immediate Detection**: Connection status changes to "disconnected"
2. **Exponential Backoff**: Reconnection attempts with increasing delays:
   - Attempt 1: 1 second
   - Attempt 2: 2 seconds
   - Attempt 3: 4 seconds
   - Attempt 4: 8 seconds
   - ...
   - Maximum: 30 seconds between attempts
3. **Maximum Attempts**: Up to 10 reconnection attempts
4. **State Restoration**: After reconnection, client state is fully restored

### What to Do When Disconnected

**For Users:**
- Wait for automatic reconnection (usually under 5 seconds)
- Check your network connection if reconnection fails
- Refresh the page as a last resort

**For Host:**
- Host view will also attempt to reconnect automatically
- Server restart will trigger reconnection for all clients

## YouTube API Error Handling

### Retry Logic

YouTube.js operations use intelligent retry logic:

- **Retry Attempts**: Maximum 3 retries per operation
- **Backoff Strategy**: Exponential (1s → 2s → 4s → max 10s)
- **Non-Retryable Errors**: Some errors are not retried:
  - Video unavailable
  - Private videos
  - Deleted videos
  - Blocked/copyright violations
  - Age-restricted content

### Error Categories

The system categorizes errors for better handling:

| Category | Description | Example |
|----------|-------------|---------|
| `VIDEO_UNAVAILABLE` | Video doesn't exist or can't be accessed | "This video is unavailable" |
| `VIDEO_PRIVATE` | Video is set to private | "This video is private" |
| `VIDEO_DELETED` | Video has been removed | "This video has been removed" |
| `VIDEO_BLOCKED` | Geo-blocked or copyright claim | "Not available in your country" |
| `RATE_LIMITED` | Too many API requests | "Please try again later" |
| `NETWORK_ERROR` | Network connectivity issues | "Connection timeout" |
| `UNKNOWN_ERROR` | Other errors | Generic error message |

### Search Failures

If YouTube search fails:
- Empty results are returned instead of crashing
- Error is logged for debugging
- User can try searching again

## Cache Error Recovery

### Corruption Detection

The cache system automatically detects and handles:

1. **Missing Video Files**: Metadata exists but video file is gone
2. **Invalid Metadata**: Malformed or incomplete metadata
3. **Corrupt JSON**: Unparseable metadata files

### Recovery Actions

When corruption is detected:

1. **Cleanup**: Corrupted cache entry is deleted
2. **Re-download**: System falls back to fresh download
3. **Logging**: Error is logged for debugging
4. **No Crash**: Application continues normally

### Cache Invalidation

Failed videos are automatically invalidated:
- Removed from download queue
- Deleted from cache directory
- In-progress downloads are cancelled

## Testing Error Scenarios

### For Developers

Run automated tests:

```bash
# All error recovery tests
npm test

# Specific test suites
node test/test-error-handling.js
node test/test-websocket-reconnection.js
node test/test-retry-logic.js
node test/test-cache-recovery.js
node test/test-visual-error-recovery.js
```

### Manual Testing Checklist

To verify error handling manually:

1. **Video Load Failure**
   - Add an unavailable video ID to the queue
   - Verify error message appears
   - Verify auto-skip after 15 seconds

2. **WebSocket Disconnect**
   - Stop the server while client is connected
   - Verify "disconnected" indicator appears
   - Restart server and verify automatic reconnection

3. **Network Timeout**
   - Throttle network in browser DevTools
   - Add a large video to queue
   - Verify timeout after 10 seconds

4. **Cache Corruption**
   - Manually corrupt a cache metadata file
   - Request the corrupted video
   - Verify automatic cleanup and re-download

5. **Multiple Failures**
   - Add 5 unavailable videos in a row
   - Verify system remains stable
   - Verify all videos are skipped appropriately

## Best Practices for Users

### Preventing Errors

- **Use valid video IDs** from YouTube
- **Check video availability** before adding to queue
- **Maintain stable network** connection
- **Keep cache clean** by periodically clearing old videos

### When Things Go Wrong

1. **Video won't play**: Wait for auto-skip or click "Skip This Song"
2. **Client disconnects**: Wait 5-10 seconds for auto-reconnect
3. **Search not working**: Try again or use direct video ID
4. **Multiple failures**: Check internet connection and YouTube status

## Monitoring and Debugging

### Console Logs

Error recovery events are logged with prefixes:

- `[Cache]` - Cache operations and errors
- `[YouTube]` - YouTube API operations
- `[WebSocket]` - Connection status changes
- `[Video Error]` - Video playback errors

### Example Logs

```
[Cache] Corrupted cache detected for video_abc123, cleaning up
[YouTube] getVideoUrl(video_xyz789) failed (attempt 1/3), retrying in 1000ms...
[WebSocket] Connection status: reconnecting (attempt 2/10)
[Video Error] code: 4, message: MEDIA_ERR_SRC_NOT_SUPPORTED
```

## Performance Impact

Error handling is designed to be lightweight:

- **Retry delays**: Minimal impact on normal operations
- **Cache cleanup**: Runs asynchronously
- **Reconnection**: Does not block UI
- **Logging**: Minimal overhead

## Future Improvements

Potential enhancements to error handling:

- [ ] User notification system for persistent errors
- [ ] Error analytics and reporting
- [ ] Configurable retry limits and timeouts
- [ ] Graceful degradation for partial failures
- [ ] Offline mode with cached-only playback
