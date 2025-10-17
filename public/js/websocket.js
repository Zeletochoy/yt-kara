// WebSocket connection management
class WSConnection {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectInterval = null;
    this.messageHandlers = new Map();
    this.state = null;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    console.log('Connecting to WebSocket:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      if (this.onConnect) this.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.onDisconnect) this.onDisconnect();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= 10) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  handleMessage(message) {
    if (message.type === 'STATE_UPDATE') {
      this.state = message.state;
      if (message.seekTo !== undefined && this.onSeek) {
        this.onSeek(message.seekTo);
      }
    }

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  search(query) {
    this.send({ type: 'SEARCH', query });
  }

  addSong(song) {
    this.send({ type: 'ADD_SONG', song });
  }

  removeSong(queueId) {
    this.send({ type: 'REMOVE_SONG', queueId });
  }

  reorderQueue(fromIndex, toIndex) {
    this.send({ type: 'REORDER_QUEUE', fromIndex, toIndex });
  }

  skipSong() {
    this.send({ type: 'SKIP_SONG' });
  }

  previousSong() {
    this.send({ type: 'PREVIOUS_SONG' });
  }

  playPause(isPlaying) {
    this.send({ type: 'PLAY_PAUSE', isPlaying });
  }

  seek(time) {
    this.send({ type: 'SEEK', time });
  }

  updatePlayback(currentTime) {
    this.send({ type: 'PLAYBACK_UPDATE', currentTime });
  }

  updateName(name) {
    this.send({ type: 'UPDATE_NAME', name });
  }

  resetQueue() {
    this.send({ type: 'RESET_QUEUE' });
  }

  resetHistory() {
    this.send({ type: 'RESET_HISTORY' });
  }

  setVolume(volume) {
    this.send({ type: 'SET_VOLUME', volume });
  }

  setPitch(pitch) {
    this.send({ type: 'SET_PITCH', pitch });
  }
}

// Create global connection instance
const wsConnection = new WSConnection();
// Make it available globally for debugging and testing
window.wsConnection = wsConnection;
