const { Innertube } = require('youtubei.js');

class YouTubeService {
  constructor() {
    this.youtube = null;
    this.urlCache = new Map();
    this.searchCache = new Map();
    this.init();
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @param {string} operation - Operation name for logging
   * @returns {Promise<any>} Result of the function
   */
  async retryWithBackoff(fn, maxRetries = 3, operation = 'operation') {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          console.log(`[YouTube] ${operation} failed with non-retryable error:`, error.message);
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
          console.log(`[YouTube] ${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          console.log(`  Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`[YouTube] ${operation} failed after ${maxRetries} attempts:`, error.message);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if an error should not be retried
   * @param {Error} error - The error to check
   * @returns {boolean} True if error should not be retried
   */
  isNonRetryableError(error) {
    const message = error.message?.toLowerCase() || '';

    // Don't retry these error types
    const nonRetryablePatterns = [
      'video unavailable',
      'private video',
      'deleted',
      'removed',
      'blocked',
      'copyright',
      'age-restricted',
      'not found'
    ];

    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Categorize error type for better user messaging
   * @param {Error} error - The error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('unavailable') || message.includes('not found')) {
      return 'VIDEO_UNAVAILABLE';
    }
    if (message.includes('private')) {
      return 'VIDEO_PRIVATE';
    }
    if (message.includes('deleted') || message.includes('removed')) {
      return 'VIDEO_DELETED';
    }
    if (message.includes('blocked') || message.includes('copyright')) {
      return 'VIDEO_BLOCKED';
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'RATE_LIMITED';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  async init() {
    try {
      this.youtube = await Innertube.create();
      console.log('YouTube service initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube service:', error);
    }
  }

  async ensureInitialized() {
    if (!this.youtube) {
      await this.init();
    }
    if (!this.youtube) {
      throw new Error('YouTube service not available');
    }
  }

  async getVideoUrl(videoId) {
    await this.ensureInitialized();

    // Check cache
    const cached = this.urlCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    try {
      // Use retry logic for fetching video info
      const info = await this.retryWithBackoff(
        () => this.youtube.getBasicInfo(videoId),
        3,
        `getVideoUrl(${videoId})`
      );

      // Try different approaches to get the stream URL
      let url = null;

      // First, try to get a format with both video and audio
      const formats = info.streaming_data?.formats || [];
      const adaptiveFormats = info.streaming_data?.adaptive_formats || [];
      const allFormats = [...formats, ...adaptiveFormats];

      // Look for a format with both video and audio
      let format = allFormats.find(f =>
        f.has_video && f.has_audio && f.quality_label
      );

      // If not found, try any format with video
      if (!format) {
        format = allFormats.find(f => f.has_video);
      }

      // If still no format, try the chooseFormat method
      if (!format) {
        format = info.chooseFormat({
          quality: 'best',
          type: 'video+audio'
        });
      }

      if (!format) {
        throw new Error('No suitable format found');
      }

      // Try to get the URL - handle signature decipher errors
      try {
        // If URL is already deciphered
        if (format.url) {
          url = format.url;
        } else if (format.decipher && this.youtube.session.player) {
          // Try to decipher
          url = await format.decipher(this.youtube.session.player);
        } else if (format.signatureCipher) {
          // If we can't decipher, at least log the issue
          console.warn(`Cannot decipher video ${videoId} - signature cipher present but no decipher method`);
          throw new Error('Video requires signature deciphering');
        }
      } catch (decipherError) {
        console.error('Decipher error:', decipherError.message);
        // Try to get any available URL as fallback
        if (format.url) {
          url = format.url;
        } else {
          throw decipherError;
        }
      }

      if (!url) {
        throw new Error('Could not extract video URL');
      }

      const videoInfo = {
        url: url,
        title: info.basic_info.title,
        thumbnail: info.basic_info.thumbnail?.[0]?.url,
        duration: info.basic_info.duration,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours (reduced from 5)
      };

      // Cache the result
      this.urlCache.set(videoId, videoInfo);

      // Clean old cache entries
      if (this.urlCache.size > 100) {
        const entries = Array.from(this.urlCache.entries());
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        this.urlCache.delete(entries[0][0]);
      }

      return videoInfo;
    } catch (error) {
      const errorCategory = this.categorizeError(error);
      console.error(`[YouTube] Failed to get video URL for ${videoId}:`, {
        error: error.message,
        category: errorCategory,
        videoId
      });

      // Clear from cache if it exists
      this.urlCache.delete(videoId);

      // Return a structured error response with category
      return {
        error: true,
        message: error.message,
        category: errorCategory,
        videoId: videoId
      };
    }
  }

  async search(query) {
    await this.ensureInitialized();

    // Check cache
    const cached = this.searchCache.get(query);
    if (cached && cached.timestamp > Date.now() - 3600000) { // 1 hour
      return cached.results;
    }

    try {
      // Use retry logic for search
      const searchResults = await this.retryWithBackoff(
        () => this.youtube.search(query),
        3,
        `search("${query}")`
      );

      // Filter to only videos and extract relevant info
      const videos = searchResults.results
        .filter(item => item.type === 'Video')
        .slice(0, 20)
        .map(video => ({
          videoId: video.id,
          title: video.title?.text || '',
          thumbnail: video.thumbnails?.[0]?.url,
          duration: video.duration?.seconds || 0,
          channel: video.author?.name || ''
        }));

      // Cache results
      this.searchCache.set(query, {
        results: videos,
        timestamp: Date.now()
      });

      // Clean old cache entries
      if (this.searchCache.size > 50) {
        const oldest = Array.from(this.searchCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        this.searchCache.delete(oldest[0]);
      }

      return videos;
    } catch (error) {
      const errorCategory = this.categorizeError(error);
      console.error(`[YouTube] Search failed for "${query}":`, {
        error: error.message,
        category: errorCategory,
        query
      });

      // Return empty results instead of throwing
      // This prevents search errors from crashing the client
      return [];
    }
  }
}

module.exports = new YouTubeService();
