# YT-Kara 🎤

A local karaoke webapp for parties where a TV/projector plays YouTube videos while friends control the queue from their phones.

## ✨ Features

- 🎵 Play karaoke videos from YouTube on a big screen
- 📱 Control from any phone via QR code
- 🔍 Search and queue songs
- ⏯️ Full playback controls
- 📜 Song history tracking
- 🔄 Real-time sync between all devices
- 🚫 No iframe restrictions - works with ALL videos

## 📦 Installation

### Quick Setup (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd yt-kara

# Run automatic setup (installs yt-dlp and dependencies)
npm run setup

# Start the server
npm start
```

### Manual Setup

1. **Install yt-dlp** (required for reliable video extraction):
   ```bash
   # macOS
   brew install yt-dlp

   # Ubuntu/Debian
   sudo apt install yt-dlp

   # Using pip
   pip3 install yt-dlp
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## 🎮 Usage

1. Start the server: `npm start`
2. Open the displayed URL on your TV/projector (usually http://localhost:8080)
3. Scan the QR code with your phone
4. Search for songs and add them to the queue
5. Party! 🎉

## 🛠️ Why yt-dlp?

This app uses **yt-dlp** instead of JavaScript libraries because:
- ✅ Works with 99% of YouTube videos
- ✅ Actively maintained and updated daily
- ✅ Handles YouTube's frequent API changes
- ✅ Much more reliable than browser-based extraction

## 📖 Documentation

See [docs/design.md](docs/design.md) for the full technical documentation and architecture details.

## 🚀 Status

✅ **Ready to use!** The core functionality is complete and working.

---

Made for karaoke parties 🎤🎉