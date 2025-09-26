const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class YouTubeService {
  constructor() {
    this.urlCache = new Map();
    this.searchCache = new Map();
    this.checkYtDlp();
  }

  async checkYtDlp() {
    try {
      await execPromise('which yt-dlp');
      console.log('✓ yt-dlp is available for video extraction');
    } catch {
      console.error('\n❌ yt-dlp is not installed!');
      console.error('Please run: node setup.js');
      console.error('Or install manually: pip3 install yt-dlp');
      process.exit(1);
    }
  }

  async getVideoUrl(videoId) {
    // Check cache
    const cached = this.urlCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    try {
      // Use yt-dlp to get video info AND the best format URL
      // Format selection: prefer up to 1080p with audio, fallback to best available
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      // First get the direct URL with optimal format selection
      // Try format 22 (720p mp4 with audio) first, then fallback to best available
      const { stdout: urlOutput } = await execPromise(
        `yt-dlp -f "22/best[height>=720]/best" --get-url --no-warnings "${url}"`,
        {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000
        }
      );

      // Then get the video metadata
      const { stdout: infoOutput } = await execPromise(
        `yt-dlp -j --no-warnings "${url}"`,
        {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000
        }
      );

      const info = JSON.parse(infoOutput);
      const videoUrl = urlOutput.trim();

      if (!videoUrl) {
        throw new Error('No video URL found');
      }

      const videoInfo = {
        url: videoUrl,  // Use the URL from yt-dlp's format selection
        title: info.title || '',
        thumbnail: info.thumbnail || '',
        duration: info.duration || 0,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
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

      // Return error response
      return {
        error: true,
        message: error.message,
        videoId: videoId
      };
    }
  }

  async search(query) {
    // Check cache
    const cached = this.searchCache.get(query);
    if (cached && cached.timestamp > Date.now() - 3600000) { // 1 hour
      return cached.results;
    }

    try {
      // Use yt-dlp to search (limited to 10 results for speed)
      const { stdout } = await execPromise(
        `yt-dlp "ytsearch10:${query}" --flat-playlist -j --no-warnings`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
      );

      // Parse results (each line is a JSON object)
      const videos = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const video = JSON.parse(line);
            return {
              videoId: video.id || video.url?.replace('https://www.youtube.com/watch?v=', ''),
              title: video.title || '',
              thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
              duration: video.duration || 0,
              channel: video.uploader || video.channel || ''
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .slice(0, 20);

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
      console.error(`Search failed for "${query}":`, error.message);

      // Return empty results instead of throwing
      return [];
    }
  }
}

module.exports = new YouTubeService();