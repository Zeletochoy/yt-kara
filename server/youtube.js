const { Innertube } = require('youtubei.js');

class YouTubeService {
  constructor() {
    this.youtube = null;
    this.urlCache = new Map();
    this.searchCache = new Map();
    this.init();
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
      const info = await this.youtube.getBasicInfo(videoId);

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
      console.error(`Failed to get video URL for ${videoId}:`, error.message);

      // Clear from cache if it exists
      this.urlCache.delete(videoId);

      // Return a fallback error response instead of throwing
      return {
        error: true,
        message: error.message,
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
      const searchResults = await this.youtube.search(query);

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
      console.error(`Search failed for "${query}":`, error);
      throw error;
    }
  }
}

module.exports = new YouTubeService();
