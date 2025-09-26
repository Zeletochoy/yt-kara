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
    this.fetchControllers = new Set();
    this.isDestroyed = false;
    this.bufferCheckInterval = null;
    this.lastBufferCheck = 0;

    // Buffer management
    this.minBufferLength = 20; // seconds
    this.maxBufferLength = 60; // seconds
    this.bufferRemoveThreshold = 120; // seconds
  }

  async load(videoUrl, audioUrl) {
    console.log('MSE Player loading:', { videoUrl, audioUrl });

    // Clean up any existing playback
    this.destroy();
    this.isDestroyed = false;

    this.videoUrl = videoUrl;
    this.audioUrl = audioUrl;

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
    console.log('MediaSource opened');

    try {
      // Get media info first to determine codecs
      const [videoInfo, audioInfo] = await Promise.all([
        this.getStreamInfo(this.videoUrl),
        this.getStreamInfo(this.audioUrl)
      ]);

      console.log('Stream info:', { videoInfo, audioInfo });

      // Create source buffers with detected codecs
      const videoCodec = this.detectVideoCodec(videoInfo);
      const audioCodec = this.detectAudioCodec(audioInfo);

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

  detectVideoCodec(info) {
    // Try to detect from content-type or default to common codec
    const contentType = info.contentType?.toLowerCase() || '';

    if (contentType.includes('webm')) {
      return 'video/webm; codecs="vp9"';
    } else if (contentType.includes('mp4')) {
      return 'video/mp4; codecs="avc1.4d401f"'; // H.264 Main Profile
    }

    // Default to MP4 as it's most common from YouTube
    return 'video/mp4; codecs="avc1.4d401f"';
  }

  detectAudioCodec(info) {
    // Try to detect from content-type or default to common codec
    const contentType = info.contentType?.toLowerCase() || '';

    if (contentType.includes('webm')) {
      return 'audio/webm; codecs="opus"';
    } else if (contentType.includes('mp4')) {
      return 'audio/mp4; codecs="mp4a.40.2"'; // AAC-LC
    }

    // Default to AAC
    return 'audio/mp4; codecs="mp4a.40.2"';
  }

  async getStreamInfo(url) {
    const response = await fetch(url, {
      method: 'HEAD'
    });

    return {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      acceptRanges: response.headers.get('accept-ranges') === 'bytes'
    };
  }

  setupSourceBuffer(buffer, type) {
    buffer.mode = 'segments';

    buffer.addEventListener('updateend', () => {
      if (this.isDestroyed) return;

      if (type === 'video' && this.videoQueue.length > 0 && !buffer.updating) {
        const data = this.videoQueue.shift();
        this.appendBuffer(buffer, data);
      } else if (type === 'audio' && this.audioQueue.length > 0 && !buffer.updating) {
        const data = this.audioQueue.shift();
        this.appendBuffer(buffer, data);
      }
    });

    buffer.addEventListener('error', (e) => {
      console.error(`${type} buffer error:`, e);
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
    if (this.isDestroyed || !buffer) return;

    try {
      buffer.appendBuffer(data);
    } catch (error) {
      console.error('Error appending to buffer:', error);
      // If quota exceeded, try to remove old data
      if (error.name === 'QuotaExceededError') {
        this.cleanupBuffer(buffer);
      }
    }
  }

  async waitForBufferSpace(type) {
    const buffer = type === 'video' ? this.videoBuffer : this.audioBuffer;
    if (!buffer) return;

    // Wait if we have too much buffered
    while (!this.isDestroyed && buffer.buffered.length > 0) {
      const bufferedEnd = buffer.buffered.end(buffer.buffered.length - 1);
      const bufferedStart = buffer.buffered.start(0);
      const bufferedAmount = bufferedEnd - this.video.currentTime;

      if (bufferedAmount > this.maxBufferLength) {
        // Too much buffered, wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
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
    [this.videoBuffer, this.audioBuffer].forEach(buffer => {
      if (!buffer || buffer.updating) return;

      try {
        if (buffer.buffered.length > 0) {
          const currentTime = this.video.currentTime;
          const bufferedStart = buffer.buffered.start(0);
          const bufferedEnd = buffer.buffered.end(buffer.buffered.length - 1);

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
        console.error('Error managing buffer:', error);
      }
    });
  }

  cleanupBuffer(buffer) {
    if (!buffer || buffer.updating) return;

    try {
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
      console.error('Error cleaning up buffer:', error);
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
    console.log('Destroying MSE player');
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
      try {
        if (this.videoBuffer) {
          this.mediaSource.removeSourceBuffer(this.videoBuffer);
        }
        if (this.audioBuffer) {
          this.mediaSource.removeSourceBuffer(this.audioBuffer);
        }
      } catch (error) {
        console.error('Error removing source buffers:', error);
      }
    }

    // Clear video src
    if (this.video.src && this.video.src.startsWith('blob:')) {
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
