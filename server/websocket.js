const WebSocket = require('ws');
const state = require('./state');
const youtube = require('./youtube-ytdlp');
const cacheManager = require('./cache-manager');
const logger = require('./logger');

let clientIdCounter = 1;
const clientNames = new Map();
const lastReactionTime = new Map(); // Throttle reactions per client
let previousSongId = null;
let lastSongId = null;

// Input validation helpers
//
// Server-side validation is critical for security. Never trust client input!
//
// Why validate server-side:
// - Clients can be manipulated (browser console, modified code, etc.)
// - Malicious clients might send crafted payloads
// - Prevents crashes from malformed data
// - Provides clear error messages
//
// Validation strategy:
// - Type checking: Ensure correct data types
// - Length limits: Prevent abuse (200 char max for searches)
// - Required fields: Ensure all necessary data is present
// - Unicode support: Allow international characters (Japanese, emoji, etc.)
function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }
  if (query.length > 200) {
    return { valid: false, error: 'Query too long (max 200 characters)' };
  }
  return { valid: true };
}

function validateSong(song) {
  if (!song || typeof song !== 'object') {
    return { valid: false, error: 'Song must be an object' };
  }
  if (!song.videoId || typeof song.videoId !== 'string') {
    return { valid: false, error: 'Song must have a valid videoId' };
  }
  if (!song.title || typeof song.title !== 'string') {
    return { valid: false, error: 'Song must have a valid title' };
  }
  return { valid: true };
}

function validateAndSanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  // Just trim whitespace - allow any length, all Unicode (Japanese, emoji, etc.)
  return name.trim();
}

function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    const clientId = `client-${clientIdCounter++}`;
    ws.clientId = clientId;

    logger.info('Client connected', { clientId });
    state.addClient(clientId);

    // Send initial state
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      state: state.getState()
    }));

    // Notify others of new client
    broadcast(wss, {
      type: 'CLIENT_JOINED',
      client: state.clients.get(clientId)
    }, ws);

    // Set up ping/pong for connection health
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      let messageType = 'UNKNOWN';
      try {
        const message = JSON.parse(data);
        messageType = message.type || 'UNKNOWN';
        await handleMessage(wss, ws, clientId, message);
      } catch (error) {
        logger.error('Error handling message', {
          clientId,
          messageType,
          error: error.message,
          stack: error.stack
        });
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Failed to process request'
        }));
      }
    });

    ws.on('close', () => {
      logger.info('Client disconnected', { clientId });
      state.removeClient(clientId);
      lastReactionTime.delete(clientId);
      broadcast(wss, {
        type: 'CLIENT_LEFT',
        clientId
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { clientId, error: error.message });
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

async function handleMessage(wss, ws, clientId, message) {
  switch (message.type) {
  case 'SEARCH': {
    const validation = validateSearchQuery(message.query);
    if (!validation.valid) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: validation.error
      }));
      break;
    }
    const results = await youtube.search(message.query);
    ws.send(JSON.stringify({
      type: 'SEARCH_RESULTS',
      results
    }));
    break;
  }

  case 'ADD_SONG': {
    const validation = validateSong(message.song);
    if (!validation.valid) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: validation.error
      }));
      break;
    }
    state.addSong(message.song, clientId);

    // Prefetch the URL for this song
    youtube.prefetchVideoUrl(message.song.videoId);

    // If no song is playing, start playing
    if (!state.currentSong) {
      state.playNext();

      // Prefetch the next song if there is one
      if (state.queue.length > 0) {
        youtube.prefetchVideoUrl(state.queue[0].videoId);
      }
    }

    broadcastState(wss);
    break;
  }

  case 'REMOVE_SONG':
    state.removeSong(message.queueId);
    broadcastState(wss);
    break;

  case 'REORDER_QUEUE':
    state.reorderQueue(message.fromIndex, message.toIndex);
    broadcastState(wss);
    break;

  case 'SKIP_SONG': {
    state.playNext();

    // Prefetch the next song after skipping
    if (state.queue.length > 0) {
      youtube.prefetchVideoUrl(state.queue[0].videoId);
    }

    broadcastState(wss);
    break;
  }

  case 'PREVIOUS_SONG':
    state.playPrevious();
    broadcastState(wss);
    break;

  case 'PLAY_PAUSE':
    state.setPlayPause(message.isPlaying);
    broadcastState(wss);
    break;

  case 'SEEK':
    state.seek(message.time);
    broadcast(wss, {
      type: 'STATE_UPDATE',
      state: state.getState(),
      seekTo: message.time
    });
    break;

  case 'PLAYBACK_UPDATE':
    state.updatePlaybackTime(message.currentTime);
    // Don't broadcast playback updates to avoid feedback loops
    break;

  case 'UPDATE_NAME': {
    const clientName = validateAndSanitizeName(message.name);
    clientNames.set(clientId, clientName);
    state.updateClientName(clientId, clientName);
    broadcastState(wss);
    break;
  }

  case 'RESET_QUEUE':
    state.resetQueue();
    broadcastState(wss);
    break;

  case 'RESET_HISTORY':
    state.resetHistory();
    broadcastState(wss);
    break;

  case 'SET_VOLUME':
    state.setVolume(message.volume);
    broadcastState(wss);
    break;

  case 'SET_PITCH':
    state.setPitch(message.pitch);
    broadcastState(wss);
    break;

  case 'SEND_REACTION': {
    // Throttle reactions to 1 per second per client
    const now = Date.now();
    const lastTime = lastReactionTime.get(clientId) || 0;
    const throttleMs = 1000; // 1 second

    if (now - lastTime < throttleMs) {
      // Too soon, ignore
      break;
    }

    // Update last reaction time
    lastReactionTime.set(clientId, now);

    // Broadcast reaction to all clients (especially host)
    broadcast(wss, {
      type: 'REACTION_RECEIVED',
      reaction: {
        type: message.reactionType,
        clientId: clientId,
        timestamp: now
      }
    });
    break;
  }

  default:
    logger.warn('Unknown message type', { type: message.type, clientId });
  }
}

function broadcast(wss, message, excludeWs = null) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastState(wss) {
  broadcast(wss, {
    type: 'STATE_UPDATE',
    state: state.getState()
  });

  // Handle cache management
  manageCacheForCurrentState();
}

function manageCacheForCurrentState() {
  const currentState = state.getState();
  const currentSongId = currentState.currentSong?.videoId;

  // Prefetch all videos in queue
  if (currentState.queue.length > 0) {
    const queueVideoIds = currentState.queue.map(song => song.videoId);
    cacheManager.prefetchVideos(queueVideoIds);
  }

  // Cleanup: when song changes, delete old videos
  if (currentSongId && currentSongId !== lastSongId) {
    // Song changed - cleanup old videos
    const toKeep = new Set();

    // Keep current song
    if (currentSongId) {
      toKeep.add(currentSongId);
    }

    // Keep last 2 played songs
    const history = currentState.history || [];
    history.slice(-2).forEach(song => toKeep.add(song.videoId));

    // Keep all queued songs
    currentState.queue.forEach(song => toKeep.add(song.videoId));

    // Delete everything else (with grace period to avoid deleting active streams)
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(__dirname, '..', 'data', 'cache');

    if (fs.existsSync(cacheDir)) {
      const allCached = fs.readdirSync(cacheDir);
      allCached.forEach(videoId => {
        if (!toKeep.has(videoId) && cacheManager.isSafeToDelete(videoId)) {
          cacheManager.deleteVideo(videoId);
        }
      });
    }

    // Track song change
    if (previousSongId !== lastSongId) {
      previousSongId = lastSongId;
    }
    lastSongId = currentSongId;
  }
}

module.exports = { setupWebSocket };
