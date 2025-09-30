// MSE Player for HD video/audio streaming
class MSEPlayer {
  constructor(videoElement) {
    this.video = videoElement;
    this.mediaSource = null;
    this.videoBuffer = null;
    this.audioBuffer = null;
    this.videoQueue = [];
    this.audioQueue = [];
    this.isVideoSourceOpen = false;
    this.isAudioSourceOpen = false;
    this.videoUrl = null;
    this.audioUrl = null;
    this.videoCodec = null;
    this.audioCodec = null;
    this.videoExt = null;
    this.audioExt = null;
    this.fetchControllers = new Set();
    this.isDestroyed = false;
    this.bufferCheckInterval = null;
    this.lastBufferCheck = 0;

    // Buffer management
    this.minBufferLength = 20; // seconds
    this.maxBufferLength = 60; // seconds
    this.bufferRemoveThreshold = 120; // seconds
  }

  async load(videoUrl, audioUrl, videoCodec, audioCodec, videoExt, audioExt) {
    console.log('MSE Player loading:', { videoUrl, audioUrl, videoCodec, audioCodec });

    this.videoUrl = videoUrl;
    this.audioUrl = audioUrl;
    this.videoCodec = videoCodec;
    this.audioCodec = audioCodec;
    this.videoExt = videoExt;
    this.audioExt = audioExt;

    // Create MediaSource
    this.mediaSource = new MediaSource();
    this.video.src = URL.createObjectURL(this.mediaSource);

    return new Promise((resolve, reject) => {
      this.mediaSource.addEventListener('sourceopen', async () => {
        try {
          await this.onSourceOpen();
          resolve();
        } catch (error) {
          console.error('Error in sourceopen:', error);
          reject(error);
        }
      });

      this.mediaSource.addEventListener('error', (e) => {
        console.error('MediaSource error:', e);
        reject(e);
      });
    });
  }

  async onSourceOpen() {
    console.log('[MSE] MediaSource opened, readyState:', this.mediaSource.readyState);

    // Add listener for MediaSource closing unexpectedly
    this.mediaSource.addEventListener('sourceclose', () => {
      console.log('[MSE] MediaSource sourceclose event fired');
      console.log('[MSE] Video element readyState:', this.video.readyState);
      console.log('[MSE] Video element src:', this.video.src?.substring(0, 50));
      if (!this.isDestroyed) {
        console.log('[MSE] Setting isDestroyed=true due to sourceclose');
        // Stop trying to fetch/append if MediaSource closes
        this.isDestroyed = true;
      }
    });

    this.mediaSource.addEventListener('sourceended', () => {
      console.log('[MSE] MediaSource sourceended event');
    });

    try {
      // Get the codec info from the parent - it was provided by yt-dlp
      const videoCodec = this.formatCodecString(this.videoCodec, this.videoExt, 'video');
      const audioCodec = this.formatCodecString(this.audioCodec, this.audioExt, 'audio');

      console.log('Using codecs:', { videoCodec, audioCodec });

      // Create video buffer
      if (MediaSource.isTypeSupported(videoCodec)) {
        this.videoBuffer = this.mediaSource.addSourceBuffer(videoCodec);
        this.setupSourceBuffer(this.videoBuffer, 'video');
      } else {
        throw new Error(`Video codec not supported: ${videoCodec}`);
      }

      // Create audio buffer
      if (MediaSource.isTypeSupported(audioCodec)) {
        this.audioBuffer = this.mediaSource.addSourceBuffer(audioCodec);
        this.setupSourceBuffer(this.audioBuffer, 'audio');
      } else {
        throw new Error(`Audio codec not supported: ${audioCodec}`);
      }

      // Start fetching streams
      this.startFetching();

      // Start buffer management
      this.startBufferManagement();

    } catch (error) {
      console.error('Error setting up source buffers:', error);
      throw error;
    }
  }

  formatCodecString(codec, ext, type) {
    // Format the codec string for MSE based on what yt-dlp gave us
    if (!codec) {
      // Fallback if no codec info
      return type === 'video' ? 'video/mp4; codecs="avc1.4d401f"' : 'audio/mp4; codecs="mp4a.40.2"';
    }

    // Determine container format
    const container = ext === 'webm' ? 'webm' : 'mp4';
    const mediaType = `${type}/${container}`;

    // Return properly formatted codec string
    return `${mediaType}; codecs="${codec}"`;
  }

  setupSourceBuffer(buffer, type) {
    buffer.mode = 'segments';
    console.log(`[MSE ${type}] Buffer setup, mode: segments`);

    buffer.addEventListener('updateend', () => {
      if (this.isDestroyed) {
        console.log(`[MSE ${type}] updateend ignored - player destroyed`);
        return;
      }

      // Check if MediaSource is still valid
      if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
        console.log(`[MSE ${type}] updateend ignored - MediaSource not open: ${this.mediaSource?.readyState}`);
        return;
      }

      // Check if buffer is still in MediaSource
      if (!this.mediaSource.sourceBuffers || !Array.from(this.mediaSource.sourceBuffers).includes(buffer)) {
        console.log(`[MSE ${type}] updateend ignored - buffer removed from MediaSource`);
        return;
      }

      if (type === 'video' && this.videoQueue.length > 0 && !buffer.updating) {
        const data = this.videoQueue.shift();
        this.appendBuffer(buffer, data);
      } else if (type === 'audio' && this.audioQueue.length > 0 && !buffer.updating) {
        const data = this.audioQueue.shift();
        this.appendBuffer(buffer, data);
      }
    });

    buffer.addEventListener('error', (e) => {
      console.error(`[MSE ${type}] Buffer error event:`, e);
      console.error(`[MSE ${type}] MediaSource state: ${this.mediaSource?.readyState}`);
      console.error(`[MSE ${type}] Buffer updating: ${buffer.updating}`);
      console.error(`[MSE ${type}] isDestroyed: ${this.isDestroyed}`);
      // Mark as destroyed to stop further operations if buffer errors
      if (!this.isDestroyed) {
        console.error(`[MSE ${type}] Setting isDestroyed=true due to buffer error`);
        this.isDestroyed = true;
      }
    });
  }

  async startFetching() {
    // Fetch video and audio streams in parallel
    await Promise.all([
      this.fetchStream(this.videoUrl, 'video'),
      this.fetchStream(this.audioUrl, 'audio')
    ]);
  }

  async fetchStream(url, type) {
    if (this.isDestroyed) return;

    console.log(`Starting fetch for ${type} stream`);

    const controller = new AbortController();
    this.fetchControllers.add(controller);

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      let buffer = new Uint8Array(0);
      const chunkSize = 64 * 1024; // Process in 64KB chunks

      while (true) {
        if (this.isDestroyed) break;

        const { done, value } = await reader.read();

        if (done) {
          // Append any remaining data
          if (buffer.length > 0) {
            await this.appendToBuffer(buffer, type);
          }
          break;
        }

        // Accumulate data
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Append chunks when we have enough data
        while (buffer.length >= chunkSize) {
          const chunk = buffer.slice(0, chunkSize);
          buffer = buffer.slice(chunkSize);
          await this.appendToBuffer(chunk, type);

          // Wait if buffer is getting full
          await this.waitForBufferSpace(type);
        }
      }

      console.log(`Finished fetching ${type} stream`);

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`Error fetching ${type} stream:`, error);
      }
    } finally {
      this.fetchControllers.delete(controller);
    }
  }

  async appendToBuffer(data, type) {
    if (this.isDestroyed) return;

    const buffer = type === 'video' ? this.videoBuffer : this.audioBuffer;
    const queue = type === 'video' ? this.videoQueue : this.audioQueue;

    if (!buffer || buffer.updating) {
      // Queue the data if buffer is busy
      queue.push(data);
    } else {
      this.appendBuffer(buffer, data);
    }
  }

  appendBuffer(buffer, data) {
    if (this.isDestroyed || !buffer) {
      console.log(`[MSE] appendBuffer skipped - destroyed:${this.isDestroyed} buffer:${!!buffer}`);
      return;
    }

    try {
      // Double-check buffer is still valid before appending
      if (this.mediaSource && this.mediaSource.sourceBuffers) {
        if (!Array.from(this.mediaSource.sourceBuffers).includes(buffer)) {
          console.error('[MSE] Buffer not in sourceBuffers, skipping append');
          return;
        }
      }

      buffer.appendBuffer(data);
    } catch (error) {
      console.error('[MSE] Error appending to buffer:', error.name, error.message);
      console.error('[MSE] MediaSource state during append error:', this.mediaSource?.readyState);
      // If quota exceeded, try to remove old data
      if (error.name === 'QuotaExceededError') {
        console.log('[MSE] Quota exceeded, cleaning up buffer');
        this.cleanupBuffer(buffer);
      }
    }
  }

  async waitForBufferSpace(type) {
    const buffer = type === 'video' ? this.videoBuffer : this.audioBuffer;
    if (!buffer || this.isDestroyed) return;

    // Wait if we have too much buffered
    while (!this.isDestroyed && this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        // Check if the buffer is still in the MediaSource
        if (!this.mediaSource.sourceBuffers || !Array.from(this.mediaSource.sourceBuffers).includes(buffer)) {
          break;
        }

        if (buffer.buffered.length > 0) {
          const bufferedEnd = buffer.buffered.end(buffer.buffered.length - 1);
          const bufferedStart = buffer.buffered.start(0);
          const bufferedAmount = bufferedEnd - this.video.currentTime;

          if (bufferedAmount > this.maxBufferLength) {
            // Too much buffered, wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        // Buffer was likely removed, exit gracefully
        break;
      }
    }
  }

  startBufferManagement() {
    if (this.bufferCheckInterval) {
      clearInterval(this.bufferCheckInterval);
    }

    this.bufferCheckInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(this.bufferCheckInterval);
        return;
      }

      this.manageBuffers();
    }, 5000); // Check every 5 seconds
  }

  manageBuffers() {
    // Exit early if player is destroyed or MediaSource is not open
    if (this.isDestroyed || !this.mediaSource || this.mediaSource.readyState !== 'open') {
      return;
    }

    [this.videoBuffer, this.audioBuffer].forEach(buffer => {
      if (!buffer || buffer.updating || this.isDestroyed) return;

      try {
        // Check if the buffer is still in the MediaSource
        if (!this.mediaSource.sourceBuffers || !Array.from(this.mediaSource.sourceBuffers).includes(buffer)) {
          return;
        }

        if (buffer.buffered.length > 0) {
          const currentTime = this.video.currentTime;
          const bufferedStart = buffer.buffered.start(0);

          // Remove old buffered data that's far behind current time
          if (currentTime - bufferedStart > this.bufferRemoveThreshold) {
            const removeEnd = currentTime - this.minBufferLength;
            if (removeEnd > bufferedStart) {
              console.log(`Removing buffer from ${bufferedStart} to ${removeEnd}`);
              buffer.remove(bufferedStart, removeEnd);
            }
          }
        }
      } catch (error) {
        // Don't log errors if we're destroyed or MediaSource is closed - it's expected
        if (!this.isDestroyed && this.mediaSource && this.mediaSource.readyState === 'open') {
          console.error('Error managing buffer:', error);
        }
      }
    });
  }

  cleanupBuffer(buffer) {
    if (!buffer || buffer.updating || this.isDestroyed) return;

    // Check MediaSource is still valid
    if (!this.mediaSource || this.mediaSource.readyState !== 'open') return;

    try {
      // Check if the buffer is still in the MediaSource
      if (!this.mediaSource.sourceBuffers || !Array.from(this.mediaSource.sourceBuffers).includes(buffer)) {
        return;
      }

      const currentTime = this.video.currentTime;
      if (buffer.buffered.length > 0) {
        const bufferedStart = buffer.buffered.start(0);
        const removeEnd = Math.max(bufferedStart, currentTime - 10);

        if (removeEnd > bufferedStart) {
          console.log(`Cleanup: removing buffer from ${bufferedStart} to ${removeEnd}`);
          buffer.remove(bufferedStart, removeEnd);
        }
      }
    } catch (error) {
      // Don't log errors if we're destroyed or MediaSource is closed - it's expected
      if (!this.isDestroyed && this.mediaSource && this.mediaSource.readyState === 'open') {
        console.error('Error cleaning up buffer:', error);
      }
    }
  }

  play() {
    if (this.video && this.video.paused) {
      return this.video.play();
    }
  }

  pause() {
    if (this.video && !this.video.paused) {
      this.video.pause();
    }
  }

  seek(time) {
    if (this.video) {
      this.video.currentTime = time;
    }
  }

  destroy() {
    console.log('[MSE] destroy() called');
    console.log('[MSE] Current MediaSource state:', this.mediaSource?.readyState);
    console.log('[MSE] Video element state:', this.video?.readyState);
    this.isDestroyed = true;

    // Abort all fetches
    this.fetchControllers.forEach(controller => controller.abort());
    this.fetchControllers.clear();

    // Clear buffer check interval
    if (this.bufferCheckInterval) {
      clearInterval(this.bufferCheckInterval);
      this.bufferCheckInterval = null;
    }

    // Clear queues
    this.videoQueue = [];
    this.audioQueue = [];

    // Clean up source buffers
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      console.log('[MSE] Removing source buffers from MediaSource');
      try {
        if (this.videoBuffer) {
          console.log('[MSE] Removing video buffer');
          this.mediaSource.removeSourceBuffer(this.videoBuffer);
        }
        if (this.audioBuffer) {
          console.log('[MSE] Removing audio buffer');
          this.mediaSource.removeSourceBuffer(this.audioBuffer);
        }
      } catch (error) {
        console.error('[MSE] Error removing source buffers:', error.name, error.message);
      }
    } else {
      console.log('[MSE] Skipping buffer removal - MediaSource state:', this.mediaSource?.readyState);
    }

    // Clear video src
    if (this.video.src && this.video.src.startsWith('blob:')) {
      console.log('[MSE] Revoking blob URL');
      URL.revokeObjectURL(this.video.src);
      this.video.src = '';
    }

    // Reset references
    this.mediaSource = null;
    this.videoBuffer = null;
    this.audioBuffer = null;
  }
}

// Export for use in other modules
window.MSEPlayer = MSEPlayer;
