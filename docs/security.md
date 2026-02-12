# Security Documentation

## Overview

YT-Kara implements several security measures to protect against common web vulnerabilities while maintaining a great user experience.

## XSS Prevention

### HTML Escaping

All user-controlled data is HTML-escaped before being rendered in the browser:

- **Song titles** from YouTube search results
- **Channel names** from search results
- **User names** entered by clients
- **Any other user-provided text**

### Implementation

The `escapeHtml()` function converts potentially dangerous characters to HTML entities:

```javascript
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

This prevents malicious scripts from executing even if a YouTube video has a malicious title like:
```html
<script>alert('XSS')</script>
```

### Where It's Applied

XSS prevention is applied in multiple locations:

**Client UI** (`public/js/client.js`):
- Song title rendering (now playing, queue, history, search, favorites)
- User name display in queue
- Channel names in search results
- All HTML generation via `createSongCard()`

**Karaoke View** (`public/js/karaoke.js`):
- Queue display with song titles and user names

## Input Validation

### Server-Side Validation

All WebSocket messages are validated before processing:

#### Search Queries
```javascript
function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }
  if (query.length > 200) {
    return { valid: false, error: 'Query too long (max 200 characters)' };
  }
  return { valid: true };
}
```

#### Song Objects
```javascript
function validateSong(song) {
  if (!song || typeof song !== 'object') {
    return { valid: false, error: 'Song must be an object' };
  }
  if (!song.videoId || typeof song.videoId !== 'string') {
    return { valid: false, error: 'Song must have a valid videoId' };
  }
  if (!song.title || typeof song.title !== 'string') {
    return { valid: false, error: 'Song must have a valid title' };
  }
  return { valid: true };
}
```

#### User Names
```javascript
function validateAndSanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  // Just trim whitespace - allow any length, all Unicode (Japanese, emoji, etc.)
  return name.trim();
}
```

### Unicode Support

User names fully support international characters:
- Japanese (ひらがな, カタカナ, 漢字)
- Chinese (汉字)
- Arabic (العربية)
- Emoji (😀🎤)
- Any valid Unicode character

This design choice prioritizes user experience for international users while maintaining security through HTML escaping on the client side.

## Cache Security

### File Access Protection

The cache manager tracks when files are accessed and implements a grace period before allowing deletion:

```javascript
// Track access time
this.lastAccessedAt.set(videoId, Date.now());

// Check safety before deletion (60-second grace period)
isSafeToDelete(videoId, gracePeriodMs = 60000) {
  const lastAccess = this.lastAccessedAt.get(videoId);
  if (!lastAccess) {
    return true; // Never accessed, safe to delete
  }
  return Date.now() - lastAccess > gracePeriodMs;
}
```

This prevents race conditions where a file could be deleted while actively streaming.

## Error Handling

### Error Categorization

The YouTube service categorizes errors for better debugging and monitoring:

- `VIDEO_UNAVAILABLE` - Video no longer available
- `ACCESS_RESTRICTED` - Private or members-only video
- `AGE_RESTRICTED` - Requires age verification
- `COPYRIGHT_BLOCKED` - Blocked due to copyright
- `NETWORK_TIMEOUT` - Request timed out
- `NETWORK_ERROR` - Connection issues
- `RATE_LIMITED` - Too many requests
- `NO_FORMATS` - No playable formats available
- `UNKNOWN` - Unclassified error

### Structured Logging

All errors include structured context for debugging:

```javascript
logger.error('Failed to get video URL', {
  videoId,
  error: error.message,
  category: errorCategory,
  stack: error.stack
});
```

## Best Practices

### For Developers

1. **Always escape user input**: Use `escapeHtml()` before rendering any user-controlled data
2. **Validate server-side**: Never trust client-side validation alone
3. **Support Unicode**: Don't restrict to ASCII - support international users
4. **Use structured logging**: Include context objects in all log calls
5. **Test security**: Run `npm test` to verify XSS prevention and input validation

### For Users

1. **Keep yt-dlp updated**: `pip3 install --upgrade yt-dlp`
2. **Use on trusted networks**: Don't expose to public internet without authentication
3. **Enable tunnel mode carefully**: ENABLE_TUNNEL creates a public URL - use with caution. Cloudflare tunnels (`TUNNEL_PROVIDER=cloudflare`) don't require a password but are still publicly accessible
4. **Review logs**: Set LOG_LEVEL=DEBUG if you suspect issues

## Testing

Security is verified through automated tests:

- `test/test-xss-prevention.js` - XSS attack scenarios
- `test/test-input-validation.js` - Input validation edge cases
- `test/test-integration.js` - System integration security

Run tests with:
```bash
npm test
```

All security measures are continuously tested to ensure they work correctly.
