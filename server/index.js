const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

require('./state');
require('./youtube-ytdlp');
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
    const videoId = req.params.id;
    const _hdMode = req.query.hd === 'true';

    // Ensure video is cached (will download if needed)
    const cacheManager = require('./cache-manager');
    const metadata = await cacheManager.ensureCached(videoId);

    // Return response for cached video (single muxed file)
    res.json({
      url: `/api/stream/${videoId}`,
      title: metadata.title,
      duration: metadata.duration
    });
  } catch (error) {
    console.error('Error getting video:', error);
    res.status(500).json({
      error: 'Failed to get video',
      message: error.message
    });
  }
});

// Stream endpoint for cached video (single muxed file)
app.get('/api/stream/:videoId', (req, res) => {
  try {
    const cacheManager = require('./cache-manager');
    const filePath = cacheManager.getCachePath(req.params.videoId);

    if (!filePath) {
      return res.status(404).json({ error: 'Video not cached' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Video stream error:', error);
    res.status(500).json({ error: true, message: error.message });
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
