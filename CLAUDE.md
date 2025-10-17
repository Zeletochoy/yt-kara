<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Claude Development Instructions for YT-Kara

## Project Overview
YT-Kara is a karaoke webapp for parties where a TV/projector plays YouTube videos while friends control the queue from their phones. It uses a backend-centric architecture where a Node.js server manages all state and clients are thin display layers.

**Current Status**: Design complete, ready for implementation (see `docs/design.md`)

## Visual Development Workflow

### Setting Up Visual Feedback Loop
When developing frontend features, use this automated visual testing approach:

1. **Install Puppeteer** (if not already installed):
```bash
npm install --save-dev puppeteer
```

2. **Create Visual Test Script** at `dev/visual-test.js`:
```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function visualTest() {
  // Create screenshot directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotDir = path.join('screenshots', timestamp);
  fs.mkdirSync(screenshotDir, { recursive: true });

  // Launch browser and app
  const browser = await puppeteer.launch({ headless: false });

  // Test karaoke view
  const karaokePage = await browser.newPage();
  await karaokePage.setViewport({ width: 1920, height: 1080 });
  await karaokePage.goto('http://localhost:8080');
  await karaokePage.screenshot({
    path: path.join(screenshotDir, 'karaoke-view.png'),
    fullPage: true
  });

  // Test mobile view
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 375, height: 667 });
  await mobilePage.goto('http://localhost:8080/client');
  await mobilePage.screenshot({
    path: path.join(screenshotDir, 'mobile-view.png'),
    fullPage: true
  });

  // Test with interactions (add songs, etc.)
  // ... add more test scenarios

  await browser.close();
  console.log(`Screenshots saved to ${screenshotDir}`);
}
```

3. **Add npm script** to package.json:
```json
"scripts": {
  "visual-test": "node dev/visual-test.js"
}
```

### Development Iteration Process

**For each feature, follow this loop:**

1. **Implement** the feature in code
2. **Run** `npm run visual-test` to capture screenshots
3. **Analyze** screenshots using the Read tool:
   ```
   Read screenshots/[latest]/karaoke-view.png
   Read screenshots/[latest]/mobile-view.png
   ```
4. **Identify** visual issues or improvements needed
5. **Fix** issues and improve the UI
6. **Repeat** 2-3 times for best results (UI typically needs 2-3 iterations to look polished)

### Screenshot Analysis Points

When analyzing screenshots, check for:
- **Layout**: Proper spacing, alignment, responsive behavior
- **Typography**: Readable fonts, appropriate sizes
- **Colors**: Good contrast, consistent theme
- **Empty states**: How it looks with no data
- **Error states**: How errors are displayed
- **Mobile**: Proper scaling and touch-friendly controls
- **Interactions**: Hover states, active states, focus indicators

## Quick Start for New Session

1. **Check current state**:
```bash
git status
git log --oneline -5
```

2. **Start development server**:
```bash
npm start
```

3. **Run visual test to see current UI**:
```bash
npm run visual-test
```

4. **Check latest screenshots** to understand current state

5. **Continue from TODO list** or start next phase in design doc

## Key Architecture Decisions

- **Backend owns all state** - Server is single source of truth
- **WebSocket for real-time** - All communication via WebSocket
- **Clients are thin** - Just send commands and render state
- **Server serves everything** - Static files + API from same server
- **Local network only** - No external dependencies
- **YouTube.js for extraction** - Gets direct video URLs, bypassing iframe restrictions

## Development Priorities

1. **MVP first** - Get basic queue and playback working
2. **Visual polish later** - Function before form
3. **Test with real devices** - Use actual phones for client testing
4. **Handle errors gracefully** - Never crash during a party

## Testing Scenarios

Always test these scenarios visually:

1. **Empty state** - No songs in queue
2. **Single song** - One song playing
3. **Full queue** - 10+ songs queued
4. **Error state** - Video unavailable
5. **Loading state** - Fetching video URL
6. **Disconnected** - Lost WebSocket connection
7. **Multiple clients** - 3+ phones connected

## Common Commands

```bash
# Development
npm start              # Start server
npm run visual-test    # Take screenshots

# Git
git add [files]        # Stage specific files
git commit -m "..."    # Commit with message
git push              # Push to GitHub

# Debugging
npm run lint          # Check for issues
npm test              # Run tests (when implemented)
```

## Progress Reporting

After each work session, create a brief report:

1. What was implemented
2. Screenshots showing the changes
3. Any issues encountered
4. What needs to be done next

Save reports in `dev/reports/[date].md` for reference.

## Remember

- **Use visual feedback** - Always run visual tests to see your changes
- **Iterate 2-3 times** - First version is rarely perfect
- **Test on multiple viewports** - Desktop, tablet, mobile
- **Keep it simple** - This is a personal project, not enterprise software
- **Server handles complexity** - Clients should stay dumb
- **No external services** - Everything runs locally