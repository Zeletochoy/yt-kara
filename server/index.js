const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const logger = require('./logger');
const { createTunnel } = require('./tunnel');

require('./state');
require('./youtube-ytdlp');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// Global tunnel state (set when ENABLE_TUNNEL=true)
let tunnelUrl = null;
let tunnelPassword = null;
let tunnelCleanup = null;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Serve node_modules for Tone.js
app.use('/node_modules', express.static(path.join(__dirname, '..', 'node_modules')));

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
  if (tunnelUrl) {
    // Return tunnel URL and password when enabled
    res.json({ url: tunnelUrl, password: tunnelPassword });
  } else {
    // Return local network URL
    const localIP = getLocalIP();
    res.json({ url: `http://${localIP}:${PORT}` });
  }
});

// API endpoint for video URLs
app.get('/api/video/:id', async (req, res) => {
  try {
    const videoId = req.params.id;

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
    logger.error('Error getting video', { error: error.message, videoId: req.params.videoId });
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
    logger.error('Video stream error', { error: error.message, videoId: req.params.videoId });
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
server.listen(PORT, async () => {
  const localIP = getLocalIP();

  // Create tunnel if enabled
  if (process.env.ENABLE_TUNNEL === 'true') {
    try {
      const result = await createTunnel(PORT);
      tunnelUrl = result.url;
      tunnelPassword = result.password;
      tunnelCleanup = result.cleanup;

      const provider = (process.env.TUNNEL_PROVIDER || 'localtunnel').toLowerCase();

      if (tunnelPassword) {
        logger.info(`
🎤 YT-Kara Server Started

  Local:    http://localhost:${PORT}
  Network:  http://${localIP}:${PORT}
  Tunnel:   ${tunnelUrl} (${provider})
  Password: ${tunnelPassword}

  Clients can connect by scanning the QR code.
  They will need to enter the password above.
        `);
      } else {
        logger.info(`
🎤 YT-Kara Server Started

  Local:   http://localhost:${PORT}
  Network: http://${localIP}:${PORT}
  Tunnel:  ${tunnelUrl} (${provider})

  Clients can connect by scanning the QR code.
        `);
      }
    } catch (error) {
      logger.error('Failed to create tunnel', { error: error.message });
      process.exit(1);
    }
  } else {
    logger.info(`
🎤 YT-Kara Server Started

  Local:   http://localhost:${PORT}
  Network: http://${localIP}:${PORT}

  Clients can connect by scanning the QR code or entering the network URL.
    `);
  }
});

// Graceful shutdown: clean up tunnel child process
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, shutting down...`);
  if (tunnelCleanup) {
    tunnelCleanup();
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
