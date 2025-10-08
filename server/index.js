const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

require('./state');
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
    const hdMode = req.query.hd === 'true';
    const videoInfo = await youtube.getVideoUrl(req.params.id, hdMode);

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

// Proxy endpoints for streaming HD video and audio
app.get('/api/stream/video/:videoId', async (req, res) => {
  async function attemptProxy(forceRefresh = false) {
    try {
      const videoInfo = await youtube.getVideoUrl(req.params.videoId, true, forceRefresh);

      if (videoInfo.error || !videoInfo.videoUrl) {
        return res.status(500).json({ error: true, message: 'Failed to get video stream' });
      }

      // Proxy the video stream
      const https = require('https');
      const videoUrl = new URL(videoInfo.videoUrl);

      const headers = {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Forward range header if present
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const options = {
        method: req.method,
        hostname: videoUrl.hostname,
        path: videoUrl.pathname + videoUrl.search,
        headers: headers
      };

      const proxyReq = https.request(options, (proxyRes) => {
        // If we get a redirect, the URL has expired - retry with fresh URL
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && !forceRefresh) {
          console.log('Video URL expired (got 302), fetching fresh URL...');
          proxyReq.destroy();
          attemptProxy(true); // Retry with forceRefresh
          return;
        }

        // Forward important headers
        const responseHeaders = {};

        if (proxyRes.headers['content-type']) {
          responseHeaders['Content-Type'] = proxyRes.headers['content-type'];
        }
        if (proxyRes.headers['content-length']) {
          responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
        }
        if (proxyRes.headers['accept-ranges']) {
          responseHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
        }
        if (proxyRes.headers['content-range']) {
          responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
        }

        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('Video proxy error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: true, message: 'Stream proxy error' });
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

      proxyReq.end();

    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: error.message
        });
      }
    }
  }

  attemptProxy();
});

app.get('/api/stream/audio/:videoId', async (req, res) => {
  async function attemptProxy(forceRefresh = false) {
    try {
      const videoInfo = await youtube.getVideoUrl(req.params.videoId, true, forceRefresh);

      if (videoInfo.error || !videoInfo.audioUrl) {
        return res.status(500).json({ error: true, message: 'Failed to get audio stream' });
      }

      // Proxy the audio stream
      const https = require('https');
      const audioUrl = new URL(videoInfo.audioUrl);

      const headers = {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Forward range header if present
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const options = {
        method: req.method,
        hostname: audioUrl.hostname,
        path: audioUrl.pathname + audioUrl.search,
        headers: headers
      };

      const proxyReq = https.request(options, (proxyRes) => {
        // If we get a redirect, the URL has expired - retry with fresh URL
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && !forceRefresh) {
          console.log('Audio URL expired (got 302), fetching fresh URL...');
          proxyReq.destroy();
          attemptProxy(true); // Retry with forceRefresh
          return;
        }

        // Forward important headers
        const responseHeaders = {};

        if (proxyRes.headers['content-type']) {
          responseHeaders['Content-Type'] = proxyRes.headers['content-type'];
        }
        if (proxyRes.headers['content-length']) {
          responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
        }
        if (proxyRes.headers['accept-ranges']) {
          responseHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
        }
        if (proxyRes.headers['content-range']) {
          responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
        }

        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('Audio proxy error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: true, message: 'Stream proxy error' });
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

      proxyReq.end();

    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: error.message
        });
      }
    }
  }

  attemptProxy();
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
