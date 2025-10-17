## 1. Implementation

### 1.1 Host View Keyboard Handlers
- [x] 1.1.1 Add global `keydown` event listener in `public/js/karaoke.js`
- [x] 1.1.2 Implement Space key handler for play/pause toggle
- [x] 1.1.3 Implement N key handler for skip to next song
- [ ] 1.1.4 Implement Esc key handler to close search modal (N/A - karaoke view has no search modal)
- [x] 1.1.5 Implement Up/Down arrow handlers for volume adjustment
- [x] 1.1.6 Implement Left/Right arrow handlers for pitch adjustment
- [ ] 1.1.7 Implement number keys 1-9 for quick-adding search results (N/A - karaoke view has no search)
- [x] 1.1.8 Prevent shortcuts when focus is in search input field
- [x] 1.1.9 Prevent default browser behavior for handled shortcuts

### 1.2 UI Hints (Optional)
- [ ] 1.2.1 Add keyboard shortcut help overlay to `public/index.html`
- [ ] 1.2.2 Add trigger button/link to show shortcut help (e.g., "?" key or help icon)
- [ ] 1.2.3 Style help overlay in `public/css/karaoke.css`
- [ ] 1.2.4 Display list of available shortcuts in help overlay
- [ ] 1.2.5 Add close button for help overlay

## 2. Testing

### 2.1 Unit Testing
- [ ] 2.1.1 Test shortcut detection logic
- [ ] 2.1.2 Test input field focus detection (shortcuts disabled)
- [ ] 2.1.3 Test preventDefault behavior for handled shortcuts

### 2.2 Integration Testing
- [ ] 2.2.1 Test Space key triggers play/pause action
- [ ] 2.2.2 Test N key triggers next song action
- [ ] 2.2.3 Test Esc key closes search modal
- [ ] 2.2.4 Test arrow keys adjust volume and pitch
- [ ] 2.2.5 Test number keys add songs from search results

### 2.3 Visual Testing
- [ ] 2.3.1 Run `npm run visual-test` and verify host view renders correctly
- [ ] 2.3.2 Test help overlay displays all shortcuts clearly (if implemented)
- [ ] 2.3.3 Verify shortcuts do not trigger on client view

### 2.4 Manual Testing Scenarios
- [ ] 2.4.1 **Play/Pause**: Press Space, verify video toggles between play and pause
- [ ] 2.4.2 **Next song**: Press N, verify queue advances to next song
- [ ] 2.4.3 **Volume control**: Press Up/Down arrows, verify volume increases/decreases
- [ ] 2.4.4 **Pitch control**: Press Left/Right arrows, verify pitch decreases/increases
- [ ] 2.4.5 **Quick add**: Open search, press 1-9, verify corresponding song is added to queue
- [ ] 2.4.6 **Input focus**: Focus on search input, press Space, verify it types a space instead of pausing
- [ ] 2.4.7 **Modal close**: Open search modal, press Esc, verify modal closes
- [ ] 2.4.8 **No client shortcuts**: Open client view on phone, press shortcuts, verify they don't trigger
- [ ] 2.4.9 **Multiple shortcuts**: Press N three times quickly, verify three songs are skipped
- [ ] 2.4.10 **Help overlay**: Press ? or click help icon, verify shortcut list displays

## 3. Documentation
- [ ] 3.1 Update user-facing docs (if any) listing available keyboard shortcuts
