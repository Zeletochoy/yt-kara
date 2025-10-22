const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const localtunnel = require('localtunnel');
const logger = require('./logger');

require('./state');
require('./youtube-ytdlp');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// Global tunnel URL and password (set when ENABLE_TUNNEL=true)
let tunnelUrl = null;
let tunnelPassword = null;

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
      logger.info('Creating tunnel...');
      const tunnel = await localtunnel({ port: PORT });
      tunnelUrl = tunnel.url;

      // Handle tunnel errors (crash if tunnel fails)
      tunnel.on('error', (err) => {
        logger.error('Tunnel error', { error: err.message });
        process.exit(1);
      });

      tunnel.on('close', () => {
        logger.info('Tunnel closed');
      });

      // Fetch the tunnel password (which is the server's public IP address)
      try {
        const https = require('https');
        const ipResponse = await new Promise((resolve, reject) => {
          https.get('https://ipv4.icanhazip.com', (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });
        tunnelPassword = ipResponse.trim();
      } catch (err) {
        logger.warn('Could not fetch public IP for tunnel password', { error: err.message });
      }

      if (tunnelPassword) {
        logger.info(`
🎤 YT-Kara Server Started

  Local:    http://localhost:${PORT}
  Network:  http://${localIP}:${PORT}
  Tunnel:   ${tunnelUrl}
  Password: ${tunnelPassword}

  Clients can connect by scanning the QR code.
  They will need to enter the password above.
        `);
      } else {
        logger.info(`
🎤 YT-Kara Server Started

  Local:   http://localhost:${PORT}
  Network: http://${localIP}:${PORT}
  Tunnel:  ${tunnelUrl}

  Clients can connect by scanning the QR code.
  Note: First visitor will see a password prompt.
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
