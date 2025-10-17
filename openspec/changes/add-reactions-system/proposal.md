## Why

During karaoke performances, the audience wants to show appreciation and support to the singer. Currently, physical applause and cheers are the only option, which doesn't provide visual feedback to the singer focused on the screen. A digital reaction system allows the audience to send visible reactions (applause, hearts, fire emojis) that appear on the TV screen, creating a more engaging and fun party atmosphere.

## What Changes

- Add reaction buttons on client remote view (👏 Applause, ❤️ Heart, 🔥 Fire, 😂 Laugh, 🎉 Party)
- Send reactions via WebSocket from clients to server
- Display reactions as animated emojis floating across the host screen
- Animate reactions to rise and fade out (CSS animations)
- Throttle reaction sending to prevent spam (e.g., 1 reaction per second per client)
- Show brief reaction count overlay when multiple clients react simultaneously
- Reactions visible only during video playback, not during search/queue management

## Impact

- **Affected specs**: `client-interaction`, `host-interface`
- **Affected code**:
  - `public/index.html` - Add reaction animation container to host view
  - `public/client.html` - Add reaction buttons to client remote
  - `public/js/karaoke.js` - Reaction display and animation logic for host
  - `public/js/client.js` - Reaction sending logic for clients
  - `public/css/karaoke.css` - Reaction animation styling
  - `public/css/client.css` - Reaction button styling
  - `server/websocket.js` - `SEND_REACTION` WebSocket event handler
  - `server/state.js` - Track reaction throttling (optional)
