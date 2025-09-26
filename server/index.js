const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const state = require('./state');
const youtube = require('./youtube-ytdlp');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Serve main karaoke view
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Serve client view
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'client.html'));
});

// API endpoint to get network info
app.get('/api/network-info', (req, res) => {
  const localIP = getLocalIP();
  res.json({
    ip: localIP,
    port: PORT
  });
});

// API endpoint for video URLs
app.get('/api/video/:id', async (req, res) => {
  try {
    const videoInfo = await youtube.getVideoUrl(req.params.id);

    // Check if we got an error response
    if (videoInfo.error) {
      console.error('Video URL extraction failed:', videoInfo.message);
      res.status(500).json({
        error: 'Failed to get video URL',
        message: videoInfo.message
      });
    } else {
      res.json(videoInfo);
    }
  } catch (error) {
    console.error('Error getting video URL:', error);
    res.status(500).json({
      error: 'Failed to get video URL',
      message: error.message
    });
  }
});

// Set up WebSocket handling
setupWebSocket(wss);

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log(`
╔═══════════════════════════════════════════╗
║           YT-Kara Server Started          ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Local:  http://localhost:${PORT}            ║
║  Network: http://${localIP}:${PORT}         ║
║                                           ║
║  Clients can connect by scanning the      ║
║  QR code or entering the network URL      ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});