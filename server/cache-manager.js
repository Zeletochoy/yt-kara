const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const execPromise = util.promisify(exec);

class CacheManager {
  constructor() {
    this.cacheDir = path.join(__dirname, '..', 'data', 'cache');
    this.downloadQueue = []; // Array of videoIds to download
    this.downloading = null; // Currently downloading videoId
    this.downloadPromises = new Map(); // Map<videoId, Promise>
    this.lastAccessedAt = new Map(); // Map<videoId, timestamp> for tracking file access

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    this.processQueue();
  }

  // Check if video is cached
  isCached(videoId) {
    const videoDir = path.join(this.cacheDir, videoId);
    const metadataPath = path.join(videoDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return false;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const videoPath = path.join(videoDir, metadata.videoFile);

      const exists = fs.existsSync(videoPath);

      // If metadata exists but video file doesn't, clean up corrupted cache
      if (!exists) {
        logger.warn('[Cache] Corrupted cache detected', { videoId });
        this.deleteVideo(videoId);
      }

      return exists;
    } catch (error) {
      logger.error('[Cache] Error checking cache', { videoId, error: error.message });
      // Clean up corrupted cache entry
      this.deleteVideo(videoId);
      return false;
    }
  }

  // Get cached metadata
  getMetadata(videoId) {
    const metadataPath = path.join(this.cacheDir, videoId, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(data);

      // Validate metadata structure
      if (!metadata.videoFile || !metadata.duration) {
        logger.warn('[Cache] Invalid metadata structure', { videoId });
        this.deleteVideo(videoId);
        return null;
      }

      return metadata;
    } catch (error) {
      logger.error('[Cache] Error reading metadata', { videoId, error: error.message });
      // Clean up corrupted metadata
      this.deleteVideo(videoId);
      return null;
    }
  }

  // Ensure video is cached (wait if needed)
  async ensureCached(videoId) {
    // Already cached
    if (this.isCached(videoId)) {
      return this.getMetadata(videoId);
    }

    // Download in progress
    if (this.downloadPromises.has(videoId)) {
      return await this.downloadPromises.get(videoId);
    }

    // Add to queue and wait
    logger.info('[Cache] Video not cached, starting download', { videoId });
    const promise = new Promise((resolve, reject) => {
      // Add to queue with promise handlers
      this.downloadQueue.push({ videoId, resolve, reject });
    });

    this.downloadPromises.set(videoId, promise);
    this.processQueue(); // Trigger queue processing

    return await promise;
  }

  // Process download queue
  async processQueue() {
    // Already processing
    if (this.downloading) {
      return;
    }

    // Queue empty
    if (this.downloadQueue.length === 0) {
      return;
    }

    const { videoId, resolve, reject } = this.downloadQueue.shift();
    this.downloading = videoId;

    logger.info('[Cache] Starting download', { videoId, queueLength: this.downloadQueue.length });

    try {
      const metadata = await this.downloadVideo(videoId);
      resolve(metadata);
      logger.info('[Cache] Download complete', { videoId });
    } catch (error) {
      logger.error('[Cache] Download failed:', { videoId, error: error.message });
      reject(error);
    } finally {
      this.downloading = null;
      this.downloadPromises.delete(videoId);

      // Process next in queue
      setImmediate(() => this.processQueue());
    }
  }

  // Download video using yt-dlp
  async downloadVideo(videoId) {
    const videoDir = path.join(this.cacheDir, videoId);
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Create directory
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    try {
      // Download single muxed file (video+audio together) for simpler playback
      const result = await execPromise(
        `yt-dlp --extractor-args "youtube:player_js_version=actual" --cookies-from-browser chrome -f "bestvideo[height<=720][vcodec^=avc]+bestaudio[ext=m4a]/best[height<=720]" --print "%(title)s" --print "%(duration)s" --print after_move:"%(filepath)s" -o "${videoDir}/video.%(ext)s" --no-warnings "${url}"`,
        { maxBuffer: 10 * 1024 * 1024, timeout: 180000 }
      );

      // Parse results
      const lines = result.stdout.trim().split('\n');
      const title = lines[0];
      const duration = lines[1];
      const videoFile = lines[2].trim().split('/').pop();

      // Verify file exists and has size
      const videoPath = path.join(videoDir, videoFile);

      if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
        throw new Error('Video file missing or empty');
      }

      // Create metadata
      const metadata = {
        videoFile,
        duration: parseInt(duration),
        title,
        downloadedAt: Date.now()
      };

      fs.writeFileSync(
        path.join(videoDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      return metadata;

    } catch (error) {
      // Clean up on error
      if (fs.existsSync(videoDir)) {
        fs.rmSync(videoDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  // Add videos to download queue (for prefetching)
  prefetchVideos(videoIds) {
    for (const videoId of videoIds) {
      // Skip if already cached or in queue
      if (this.isCached(videoId)) {
        continue;
      }

      if (this.downloadPromises.has(videoId)) {
        continue;
      }

      if (this.downloadQueue.some(item => item.videoId === videoId)) {
        continue;
      }

      // Add to queue
      logger.debug('[Cache] Adding to prefetch queue', { videoId });
      const promise = new Promise((resolve, reject) => {
        this.downloadQueue.push({ videoId, resolve, reject });
      });

      this.downloadPromises.set(videoId, promise);

      // Don't await - prefetch in background
      promise.catch(err => {
        logger.error('[Cache] Prefetch failed for', { videoId, error: err.message });
      });
    }

    this.processQueue();
  }

  // Delete cached video
  deleteVideo(videoId) {
    const videoDir = path.join(this.cacheDir, videoId);

    try {
      if (fs.existsSync(videoDir)) {
        logger.debug('[Cache] Deleting cached video', { videoId });
        fs.rmSync(videoDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.error('[Cache] Error deleting video', { videoId, error: error.message });
      // Try again with force flag
      try {
        if (fs.existsSync(videoDir)) {
          fs.rmSync(videoDir, { recursive: true, force: true, maxRetries: 3 });
        }
      } catch (retryError) {
        console.error(`[Cache] Failed to delete ${videoId} after retry:`, retryError.message);
      }
    }
  }

  // Invalidate cache for a failed video (alias for deleteVideo with better semantics)
  invalidate(videoId) {
    logger.info('[Cache] Invalidating cache for failed video', { videoId });
    this.deleteVideo(videoId);

    // Also remove from download queue if present
    this.downloadQueue = this.downloadQueue.filter(item => item.videoId !== videoId);

    // Cancel active download if it's for this video
    if (this.downloading === videoId) {
      logger.info('[Cache] Cancelling in-progress download', { videoId });
      this.downloading = null;
      this.downloadPromises.delete(videoId);
    }
  }

  // Get cache file path
  getCachePath(videoId) {
    const metadata = this.getMetadata(videoId);
    if (!metadata) {
      return null;
    }

    // Track access time for safe cleanup
    this.lastAccessedAt.set(videoId, Date.now());

    const videoDir = path.join(this.cacheDir, videoId);
    return path.join(videoDir, metadata.videoFile);
  }

  // Check if video is safe to delete (not accessed recently)
  isSafeToDelete(videoId, gracePeriodMs = 60000) {
    const lastAccess = this.lastAccessedAt.get(videoId);
    if (!lastAccess) {
      return true; // Never accessed, safe to delete
    }
    return Date.now() - lastAccess > gracePeriodMs;
  }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
