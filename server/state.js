const fs = require('fs');
const path = require('path');

// Session state management
class SessionState {
  constructor() {
    // Use separate state file for tests to avoid corrupting real session data
    const stateFileName = process.env.TEST_MODE ? 'session-state.test.json' : 'session-state.json';
    this.stateFile = path.join(__dirname, '..', 'data', stateFileName);
    this.ensureDataDirectory();
    this.loadState();
    this.saveInterval = setInterval(() => {
      // Only save if state has changed
      if (this.dirty) {
        this.saveState();
      }
    }, 5000); // Auto-save every 5 seconds
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.stateFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        const saved = JSON.parse(data);

        this.queue = saved.queue || [];
        this.currentSong = saved.currentSong || null;
        this.currentTime = saved.currentTime || 0;
        this.isPlaying = false; // Always start paused
        this.clients = new Map();
        this.history = saved.history || [];
        this.nextId = saved.nextId || 1;
        this.volume = saved.volume !== undefined ? saved.volume : 100;
        this.pitch = 0;
        this.dirty = false; // Track if state has changed since last save

        console.log('✓ Restored previous session state');
      } else {
        this.reset();
      }
    } catch (error) {
      console.error('Failed to load state:', error);
      this.reset();
    }
  }

  saveState() {
    try {
      const stateToSave = {
        queue: this.queue,
        currentSong: this.currentSong,
        currentTime: this.currentTime,
        history: this.history.slice(-50), // Keep last 50 history items
        nextId: this.nextId,
        volume: this.volume
      };

      fs.writeFileSync(this.stateFile, JSON.stringify(stateToSave, null, 2));
      this.dirty = false; // Clear dirty flag after successful save
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  reset() {
    this.queue = [];
    this.currentSong = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.clients = new Map();
    this.history = [];
    this.nextId = 1;
    this.volume = 100;
    this.pitch = 0;
    this.dirty = false;
  }

  resetQueue() {
    this.queue = [];
    this.currentSong = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.dirty = true;
    this.saveState(); // Save immediately for critical changes
  }

  resetHistory() {
    this.history = [];
    this.dirty = true;
    this.saveState(); // Save immediately for critical changes
  }

  addSong(song, clientId) {
    const client = this.clients.get(clientId);
    const queueItem = {
      id: this.nextId++,
      videoId: song.videoId,
      title: song.title,
      thumbnail: song.thumbnail,
      duration: song.duration,
      addedBy: client?.name || clientId,
      addedAt: Date.now()
    };
    this.queue.push(queueItem);
    this.dirty = true;
    this.saveState(); // Save immediately for critical changes
    return queueItem;
  }

  removeSong(queueId) {
    const index = this.queue.findIndex(item => item.id === queueId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      this.dirty = true;
      this.saveState(); // Save immediately for critical changes
      return removed;
    }
    return null;
  }

  reorderQueue(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.queue.length ||
        toIndex < 0 || toIndex >= this.queue.length) {
      return false;
    }
    const [item] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, item);
    this.dirty = true;
    this.saveState(); // Save immediately for critical changes
    return true;
  }

  playNext() {
    if (this.currentSong) {
      this.history.push({
        ...this.currentSong,
        playedAt: Date.now(),
        skipped: this.currentTime < this.currentSong.duration - 5
      });
    }

    if (this.queue.length > 0) {
      this.currentSong = this.queue.shift();
      this.currentTime = 0;
      this.isPlaying = true;
      this.pitch = 0; // Reset pitch when song changes
      this.dirty = true;
      this.saveState(); // Save immediately for critical changes
      return this.currentSong;
    } else {
      this.currentSong = null;
      this.currentTime = 0;
      this.isPlaying = false;
      this.pitch = 0;
      this.dirty = true;
      this.saveState(); // Save immediately for critical changes
      return null;
    }
  }

  playPrevious() {
    // If we have a history, restore the last played song
    if (this.history.length > 0) {
      // If there's a current song, put it back at the beginning of the queue
      if (this.currentSong) {
        this.queue.unshift(this.currentSong);
      }

      // Get the last song from history
      const previousSong = this.history.pop();

      // Remove the metadata that was added when it was put in history
      delete previousSong.playedAt;
      delete previousSong.skipped;

      // Make it the current song
      this.currentSong = previousSong;
      this.currentTime = 0;
      this.isPlaying = true;
      this.dirty = true;
      this.saveState(); // Save immediately for critical changes

      return this.currentSong;
    }
    return null;
  }

  updatePlaybackTime(time) {
    this.currentTime = time;
  }

  setPlayPause(playing) {
    this.isPlaying = playing;
  }

  seek(time) {
    this.currentTime = Math.max(0, Math.min(time, this.currentSong?.duration || 0));
  }

  addClient(clientId, info = {}) {
    this.clients.set(clientId, {
      id: clientId,
      name: info.name || `User ${this.clients.size + 1}`,
      type: this.clients.size === 0 ? 'host' : 'guest',
      connectedAt: Date.now()
    });
  }

  removeClient(clientId) {
    this.clients.delete(clientId);
  }

  updateClientName(clientId, name) {
    const client = this.clients.get(clientId);
    if (client) {
      client.name = name || `User ${Array.from(this.clients.keys()).indexOf(clientId) + 1}`;
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
    this.dirty = true;
    this.saveState(); // Save immediately for settings changes
  }

  setPitch(pitch) {
    // Allow wider range for pitch shifting (±12 semitones = 1 octave)
    this.pitch = Math.max(-12, Math.min(12, pitch));
  }

  getState() {
    return {
      queue: this.queue,
      currentSong: this.currentSong,
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      clients: Array.from(this.clients.values()),
      history: this.history.slice(-10), // Last 10 played songs
      volume: this.volume,
      pitch: this.pitch
    };
  }
}

module.exports = new SessionState();
