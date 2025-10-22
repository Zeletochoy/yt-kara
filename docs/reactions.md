# Reactions System

The reactions system allows audience members to send emoji reactions from their phones that appear as floating animations on the TV/projector display during karaoke performances.

## Features

### Available Reactions

Five emoji reactions are available:
- 👏 **Applause** - Show appreciation for great performance
- ❤️ **Heart** - Express love for a song choice
- 🔥 **Fire** - Hype up an amazing performance
- 😂 **Laugh** - React to funny moments
- 🎉 **Party** - Celebrate and energize the room

### How It Works

#### On the Phone (Client View)

1. Navigate to the **Remote** tab on your phone
2. Scroll down to see the reaction buttons
3. Tap any emoji to send it to the TV
4. Buttons are large (70x70px) and touch-friendly
5. After tapping, the button is disabled for 1 second to prevent spam

#### On the TV (Host View)

1. When someone sends a reaction, the emoji appears at the bottom of the screen
2. The emoji floats upward while growing slightly larger
3. It fades out as it rises over 2.5 seconds
4. Each reaction appears at a random horizontal position (10-90% of screen width)
5. Multiple reactions can appear simultaneously from different people

### Technical Details

#### Throttling

To prevent spam and maintain performance:
- **Client-side**: Buttons disabled for 1 second after each tap
- **Server-side**: Maximum 1 reaction per second per client
- Both layers ensure smooth experience even with enthusiastic audiences

#### Display Rules

Reactions only display during active video playback:
- ✅ **Shows during**: Video playing or paused mid-song
- ❌ **Hidden during**: Search screen, queue management, no video loaded

This prevents reactions from appearing during song selection.

#### Animation

Reactions use CSS keyframe animation (`floatUp`):
```css
@keyframes floatUp {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-500px) scale(1.2);
    opacity: 0;
  }
}
```

Duration: 2.5 seconds with ease-out timing

#### DOM Cleanup

Reaction elements are automatically removed from the DOM after their animation completes to prevent memory leaks and maintain performance.

## Architecture

### WebSocket Events

**Client → Server**
```javascript
{
  type: 'SEND_REACTION',
  reactionType: '👏' // or any of the 5 emoji types
}
```

**Server → All Clients**
```javascript
{
  type: 'REACTION_RECEIVED',
  reaction: {
    type: '👏',
    clientId: 'unique-client-id',
    timestamp: 1234567890
  }
}
```

### File Structure

#### Server-Side
- `server/websocket.js` - Reaction event handling and throttling

#### Client-Side
- `public/client.html` - Reaction buttons in Remote tab
- `public/css/client.css` - Button styling
- `public/js/client.js` - Button handlers and client throttling
- `public/js/websocket.js` - WebSocket `sendReaction()` method

#### Host-Side
- `public/index.html` - Reaction container
- `public/css/karaoke.css` - Animation and container styling
- `public/js/karaoke.js` - Display logic and animation

### Testing

#### Automated Tests
- `test/test-reactions.js` - Comprehensive unit and integration tests
  - Button existence and sizing
  - Throttling validation
  - Display logic
  - Animation CSS verification
  - DOM cleanup

#### Visual Tests
- `dev/visual-test-reactions.js` - Visual validation with screenshots
  - Run with: `npm run visual-test:reactions`
  - Generates HTML report with validation results
  - Verifies button appearance across viewports
  - Checks animation properties

## Usage Tips

### For Hosts

- Reactions add energy to performances without being distracting
- They appear over the video with semi-transparent styling
- Container has z-index 900 to appear above video but below error overlays
- No configuration needed - works automatically

### For Audience Members

- Use reactions to engage with performers without interrupting
- Tap freely - throttling prevents spam automatically
- All phones can send reactions simultaneously
- Reactions appear for everyone to see on the main screen

### For Developers

- Reactions are stateless - no persistence needed
- Server doesn't track reaction history
- No database required
- Performance optimized with throttling and automatic cleanup
- Fully tested with automated test suite

## Performance Considerations

### Optimizations

1. **Client-side throttling** reduces unnecessary network traffic
2. **Server-side throttling** protects against malicious spam
3. **CSS animations** use GPU acceleration (transform, opacity)
4. **Automatic cleanup** prevents memory leaks from accumulated DOM elements
5. **Random positioning** calculated once per reaction (not animated)

### Scalability

The system handles:
- Multiple simultaneous reactions from different clients
- Continuous reaction streams during performances
- Large audiences (tested with automated multi-client scenarios)

Memory usage remains constant due to automatic DOM cleanup after each animation.

## Future Enhancements (Optional)

### Reaction Count Overlay
Display a count of simultaneous reactions (e.g., "×3" badge) when multiple people send the same reaction at the same time. This is tracked as optional task 1.2.8 in the openspec.

### Custom Reactions
Allow hosts to configure custom emoji sets for themed parties or special occasions.

### Reaction Analytics
Track popular reactions per song for post-party analytics (would require database).

## Troubleshooting

### Reactions Not Appearing

1. **Check video state**: Reactions only show during playback
2. **Verify WebSocket**: Connection status indicator should be green
3. **Check console**: Look for JavaScript errors
4. **Test throttling**: Wait 1 second between button taps

### Performance Issues

1. **Check DOM size**: Reactions should auto-cleanup after 2.5s
2. **Browser DevTools**: Monitor memory and DOM node count
3. **Reduce concurrent reactions**: Server throttling should handle this automatically

### Button Not Working

1. **Check disabled state**: Buttons disable for 1s after tap
2. **Verify WebSocket**: Must be connected to send
3. **Check browser console**: Look for click handler errors
