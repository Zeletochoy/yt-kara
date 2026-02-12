# YT-Kara 🎤

[![npm version](https://badge.fury.io/js/yt-kara.svg)](https://www.npmjs.com/package/yt-kara)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A karaoke web app thrown together for parties - plays YouTube videos on a TV while friends control the queue from their phones. Vibe-coded quickly with Claude Code to solve a real problem: every karaoke app sucks or costs money.

**Note**: This was built fast to work, not to be pretty. The code isn't the cleanest and it probably won't be actively maintained. But hey, it works! 🤷

## ✨ Features

- 🎵 **YouTube Playback** - Plays any YouTube video (actually works, unlike iframe embeds)
- 📱 **Phone Control** - Everyone connects via QR code
- 🔍 **Search & Queue** - Search YouTube, add to queue
- ⭐ **Favorites** - Save your go-to karaoke songs
- 🎚️ **Volume & Pitch Control** - Adjust to match your voice
- ⌨️ **Keyboard Shortcuts** - Quick controls on the TV
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
- **Space** = Play/Pause
- **N** = Skip to next song
- **P** = Previous song
- **↑/↓** = Volume up/down
- **←/→** = Seek backward/forward 10 seconds
- **-/=** = Pitch down/up
- **?** = Show keyboard shortcuts help
- Click buttons for additional controls

**On phones**:
- Search songs
- Add to queue
- Save favorite songs
- Basic playback controls

## ⚙️ Configuration

### Environment Variables

YT-Kara supports the following environment variables:

```bash
# Server Configuration
PORT=8080                    # Server port (default: 8080)
ENABLE_TUNNEL=false          # Enable tunnel for external access (default: false)
TUNNEL_PROVIDER=localtunnel  # Tunnel provider: localtunnel or cloudflare (default: localtunnel)

# Logging Configuration
LOG_LEVEL=INFO               # Log verbosity: ERROR, WARN, INFO, DEBUG (default: INFO)
```

**Log Levels:**
- `ERROR`: Only critical errors
- `WARN`: Warnings and errors
- `INFO`: General information, warnings, and errors (recommended)
- `DEBUG`: Detailed debugging information (verbose)

Example with custom settings:
```bash
LOG_LEVEL=DEBUG PORT=3000 npm start
```

### Data Persistence

YT-Kara stores data in the `data/` directory:
- `data/session-state.json` - Queue, history, and playback state
- `data/cache/` - Cached video files (auto-managed)
- `data/cookies.txt` - YouTube authentication cookies (auto-generated)

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

### Security

YT-Kara includes several security measures:
- **XSS Prevention**: All user-controlled data (song titles, user names) is HTML-escaped before rendering
- **Input Validation**: WebSocket messages are validated server-side to prevent malformed data
- **Unicode Support**: Full support for international characters (Japanese, Chinese, Arabic, emoji)
- **Cache Protection**: Grace period prevents deletion of actively streaming files

See [Security Documentation](docs/security.md) for more details.

## 🐛 Common Issues

**"yt-dlp not found"**
- Just run: `pip3 install yt-dlp`

**Videos won't load**
- The app has automatic error handling that will skip failed videos after 15 seconds
- You can manually click "Skip This Song" button when errors occur
- Update yt-dlp: `pip3 install --upgrade yt-dlp`
- YouTube changes their stuff constantly, yt-dlp usually catches up
- See [Error Handling Documentation](docs/error-handling.md) for details

**Connection lost / Disconnected**
- The app automatically reconnects with exponential backoff (wait 5-10 seconds)
- Watch the connection indicator: 🟢 connected, 🟡 reconnecting, 🔴 disconnected
- If reconnection fails, refresh the page
- See [Error Handling Documentation](docs/error-handling.md) for details

**Can't connect from phone**
- Make sure you're on the same WiFi
- Firewall might be blocking port 8080
- If your WiFi has AP Isolation (common in corporate/public WiFi), use tunnel mode:
  ```bash
  # Using localtunnel (default, no extra install needed)
  ENABLE_TUNNEL=true yt-kara

  # Using Cloudflare Tunnel (faster & more reliable, requires cloudflared)
  ENABLE_TUNNEL=true TUNNEL_PROVIDER=cloudflare yt-kara
  ```
  **localtunnel**: Built-in, no extra install. Creates a public URL with your public IP as password.
  **Cloudflare Tunnel**: Faster and more reliable, no password needed. Requires `cloudflared`:
  - macOS: `brew install cloudflared`
  - Ubuntu/Debian: `sudo apt install cloudflared`
  - Other: [Download from Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

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
