# YT-Kara 🎤

[![npm version](https://badge.fury.io/js/yt-kara.svg)](https://www.npmjs.com/package/yt-kara)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A karaoke web app thrown together for parties - plays YouTube videos on a TV while friends control the queue from their phones. Vibe-coded quickly with Claude Code to solve a real problem: every karaoke app sucks or costs money.

**Note**: This was built fast to work, not to be pretty. The code isn't the cleanest and it probably won't be actively maintained. But hey, it works! 🤷

## ✨ Features

- 🎵 **YouTube Playback** - Plays any YouTube video (actually works, unlike iframe embeds)
- 📱 **Phone Control** - Everyone connects via QR code
- 🔍 **Search & Queue** - Search YouTube, add to queue
- 🎬 **HD Streaming** - Uses MSE for better quality when possible
- 💾 **Persistent Queue** - Survives server restarts
- 🔄 **Real-time Sync** - All devices stay in sync

## Screenshots

### Player
<img width="2616" height="1572" alt="Screenshot 2025-10-09 at 11 45 48" src="https://github.com/user-attachments/assets/c80ffb3a-479d-4c13-a725-7ae452d4f31e" />

### Remote control
<img width="409" height="739" alt="Screenshot 2025-10-08 at 17 58 04" src="https://github.com/user-attachments/assets/bbb89974-b106-4562-9e7a-4b9173534ffb" />

## 📦 Installation

### Requirements
- Node.js 18+
- Python 3+ (for yt-dlp)
- A computer connected to a TV

### Quick Install (npm)

```bash
# Install globally
npm install -g yt-kara

# Install yt-dlp (required for video extraction)
pip3 install yt-dlp

# Start it
yt-kara
```

Or use npx without installing:

```bash
# Install yt-dlp first
pip3 install yt-dlp


# Run directly
npx yt-kara
```

### Alternative: Docker

```bash
# Clone the repo
git clone https://github.com/Zeletochoy/yt-kara.git
cd yt-kara

# Run with docker-compose
docker-compose up -d

# Or build and run manually
docker build -t yt-kara .
docker run -p 8080:8080 -v $(pwd)/data:/app/data yt-kara
```

### Alternative: Clone from Source

```bash
# Clone it
git clone https://github.com/Zeletochoy/yt-kara.git
cd yt-kara

# Install everything (includes yt-dlp)
npm run setup

# Start it
npm start
```

### Manual Setup

If automated setup fails:

```bash
# Install yt-dlp (the magic that makes this work)
pip3 install yt-dlp
# or: brew install yt-dlp (macOS)
# or: sudo apt install yt-dlp (Ubuntu/Debian)

# Install node stuff (if cloned from source)
npm install

# Run it
npm start  # from source
# or: yt-kara  # if installed globally
```

## 🎮 How to Use

### Setup for Party

1. Run `yt-kara` on computer connected to TV
2. Open `http://localhost:8080` on the TV browser
3. Everyone scans the QR code with their phones
4. Search and add songs
5. Party! 🎉

### Controls

**On the TV** (host):
- Space = Play/Pause
- Click buttons for skip, previous, etc.

**On phones**:
- Search songs
- Add to queue
- Basic playback controls

## 🛠️ Technical Stuff

Built with:
- **yt-dlp** - The real MVP, extracts YouTube URLs
- **Express** - Web server
- **WebSocket** - Real-time sync
- **MSE** - For HD streaming (when it works)

Files live in:
- `server/` - Backend stuff
- `public/` - Frontend stuff
- `data/` - Saved queues and cookies

## 🐛 Common Issues

**"yt-dlp not found"**
- Just run: `pip3 install yt-dlp`

**Videos won't load**
- Update yt-dlp: `pip3 install --upgrade yt-dlp`
- YouTube changes their stuff constantly, yt-dlp usually catches up

**Can't connect from phone**
- Make sure you're on the same WiFi
- Firewall might be blocking port 8080
- If your WiFi has AP Isolation (common in corporate/public WiFi), use tunnel mode:
  ```bash
  ENABLE_TUNNEL=true yt-kara
  # or: ENABLE_TUNNEL=true npm start
  ```
  This creates a public tunnel URL that bypasses network restrictions. The server will display a password (your public IP) that clients need to enter on first visit.

**Looks janky**
- Yeah, it's not pretty. PRs welcome if you want to make it look nice!

## ⚠️ Disclaimers

- This was made in a hurry for personal use
- The code is functional but not clean
- It might break when YouTube changes things
- Use at your own risk
- Respect content creators and YouTube ToS

## 🤝 Contributing

Feel free to fork and improve! Just don't expect quick responses on issues - this is a "works on my machine" project.

## 🍺 License

Beerware - If we meet someday and you think this is worth it, you can buy me a beer

---

Made for parties where someone always hogs the karaoke mic 🎤
