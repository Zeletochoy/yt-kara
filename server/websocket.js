const WebSocket = require('ws');
const state = require('./state');
const youtube = require('./youtube-ytdlp');
const cacheManager = require('./cache-manager');

let clientIdCounter = 1;
const clientNames = new Map();
let previousSongId = null;
let lastSongId = null;

function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    const clientId = `client-${clientIdCounter++}`;
    ws.clientId = clientId;

    console.log(`Client connected: ${clientId}`);
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
      try {
        const message = JSON.parse(data);
        await handleMessage(wss, ws, clientId, message);
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Failed to process request'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      state.removeClient(clientId);
      broadcast(wss, {
        type: 'CLIENT_LEFT',
        clientId
      });
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
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
    const results = await youtube.search(message.query);
    ws.send(JSON.stringify({
      type: 'SEARCH_RESULTS',
      results
    }));
    break;
  }

  case 'ADD_SONG':
    // Message should contain the full song info from search results
    if (message.song) {
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
    }
    break;

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
    const clientName = message.name || '';
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

  default:
    console.warn(`Unknown message type: ${message.type}`);
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

    // Delete everything else
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(__dirname, '..', 'data', 'cache');

    if (fs.existsSync(cacheDir)) {
      const allCached = fs.readdirSync(cacheDir);
      allCached.forEach(videoId => {
        if (!toKeep.has(videoId)) {
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
