## Why

During karaoke parties, the host often needs to control playback, adjust settings, and manage the queue quickly. Using a mouse or touchscreen for every action is slow and interrupts the flow. Keyboard shortcuts enable faster control, especially when the host is managing the system from a computer rather than a mobile device.

## What Changes

- Add global keyboard shortcuts for common actions on the host view
- Keyboard shortcuts:
  - **Space**: Play/Pause
  - **N**: Skip to next song
  - **Esc**: Close search modal/overlays
  - **Up/Down arrows**: Volume up/down
  - **Left/Right arrows**: Pitch down/up
  - **1-9**: Quick add song from search results by position
- Display keyboard shortcut hints in the UI (optional tooltip or help overlay)
- Prevent shortcuts from triggering when typing in search input
- Ensure shortcuts work only on host view, not client view

## Impact

- **Affected specs**: `host-interface`, `playback-controls`
- **Affected code**:
  - `public/index.html` - Add keyboard shortcut help overlay (optional)
  - `public/js/karaoke.js` - Keyboard event listeners and action handlers
  - `public/css/karaoke.css` - Styling for shortcut hints/help overlay
