const WebSocket = require('ws');
const state = require('./state');
const youtube = require('./youtube-ytdlp');

let clientIdCounter = 1;
const clientNames = new Map();

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
    case 'SEARCH':
      const results = await youtube.search(message.query);
      ws.send(JSON.stringify({
        type: 'SEARCH_RESULTS',
        results
      }));
      break;

    case 'ADD_SONG':
      // Message should contain the full song info from search results
      if (message.song) {
        state.addSong(message.song, clientId);

        // If no song is playing, start playing
        if (!state.currentSong) {
          state.playNext();
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

    case 'SKIP_SONG':
      state.playNext();
      broadcastState(wss);
      break;

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

    case 'UPDATE_NAME':
      const clientName = message.name || '';
      clientNames.set(clientId, clientName);
      state.updateClientName(clientId, clientName);
      broadcastState(wss);
      break;

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
}

module.exports = { setupWebSocket };