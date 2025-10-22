const { exec } = require('child_process');
const logger = require('./logger');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

class YouTubeService {
  constructor() {
    this.urlCache = new Map();
    this.searchCache = new Map();
    this.cookiesFile = path.join(__dirname, '..', 'data', 'cookies.txt');
    this.checkYtDlp();
    this.setupCookies();
  }

  async checkYtDlp() {
    try {
      await execPromise('which yt-dlp');
      logger.info('yt-dlp is available for video extraction');
    } catch {
      logger.error('yt-dlp is not installed');
      logger.error('Please run: node setup.js');
      logger.error('Or install manually: pip3 install yt-dlp');
      process.exit(1);
    }
  }

  async setupCookies() {
    if (fs.existsSync(this.cookiesFile)) {
      logger.info('Using cached cookies from data/cookies.txt');
      return;
    }

    logger.info('Setting up YouTube cookies (one-time setup)');
    logger.info('You may be prompted to unlock your keychain ONCE');

    // Ensure data directory exists
    const dataDir = path.dirname(this.cookiesFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      // Export cookies using yt-dlp (will prompt for keychain once)
      await execPromise(
        `yt-dlp --extractor-args "youtube:player_js_version=actual" --cookies-from-browser chrome --cookies "${this.cookiesFile}" --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
      );

      if (fs.existsSync(this.cookiesFile)) {
        logger.info('Cookies cached successfully');
      }
    } catch {
      logger.warn('Could not cache cookies - videos may be restricted');
    }
  }

  getCookiesArg() {
    // In CI environments, don't try to use Chrome cookies (they don't exist)
    if (process.env.CI) {
      return '';
    }
    return ' --cookies-from-browser chrome';
  }

  getCommonArgs() {
    // Always include extractor args for YouTube compatibility
    const extractorArgs = ' --extractor-args "youtube:player_js_version=actual"';
    const cookiesArg = this.getCookiesArg();
    return extractorArgs + cookiesArg;
  }


  async getVideoUrl(videoId, hdMode = false, forceRefresh = false) {
    // Check cache unless forcing refresh due to expired URL
    const cacheKey = hdMode ? `${videoId}_hd` : videoId;
    if (!forceRefresh) {
      const cached = this.urlCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached;
      }
    }

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      if (hdMode) {
        // Get separate video and audio URLs for HD playback
        logger.debug('Getting HD streams', { videoId });

        const commonArgs = this.getCommonArgs();

        // Run all three yt-dlp commands in parallel for better performance
        const [videoResult, audioResult, infoResult] = await Promise.all([
          // Get video URL with codec info
          execPromise(
            `yt-dlp${commonArgs} -f "bestvideo[height<=720][vcodec^=avc]/bestvideo[height<=720]" --print "%(url)s|%(vcodec)s|%(ext)s" --no-warnings "${url}"`,
            {
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            }
          ),
          // Get audio URL with codec info
          execPromise(
            `yt-dlp${commonArgs} -f "bestaudio[ext=m4a]/bestaudio" --print "%(url)s|%(acodec)s|%(ext)s" --no-warnings "${url}"`,
            {
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            }
          ),
          // Get video metadata
          execPromise(
            `yt-dlp${commonArgs} -j --no-warnings "${url}"`,
            {
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            }
          )
        ]);

        // Parse the outputs
        const [videoUrl, videoCodec, videoExt] = videoResult.stdout.trim().split('|');
        const [audioUrl, audioCodec, audioExt] = audioResult.stdout.trim().split('|');
        const infoOutput = infoResult.stdout;

        const info = JSON.parse(infoOutput);

        if (!videoUrl || !audioUrl) {
          throw new Error('No HD streams found');
        }

        const videoInfo = {
          videoUrl: videoUrl,  // Separate video URL
          audioUrl: audioUrl,  // Separate audio URL
          videoCodec: videoCodec, // e.g. "avc1.4d401f" or "av01.0.08M.08"
          audioCodec: audioCodec, // e.g. "mp4a.40.2"
          videoExt: videoExt,     // "mp4" or "webm"
          audioExt: audioExt,     // "m4a" or "webm"
          hdMode: true,
          title: info.title || '',
          thumbnail: info.thumbnail || '',
          duration: info.duration || 0,
          expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
        };

        // Cache the result
        this.urlCache.set(cacheKey, videoInfo);

        return videoInfo;
      } else {
        // Original mode - get combined video+audio for standard playback
        const commonArgs = this.getCommonArgs();
        const { stdout: urlOutput } = await execPromise(
          `yt-dlp${commonArgs} -f "22/best[height>=720]/best" --get-url --no-warnings "${url}"`,
          {
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
          }
        );

        // Then get the video metadata
        const { stdout: infoOutput } = await execPromise(
          `yt-dlp${commonArgs} -j --no-warnings "${url}"`,
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
          hdMode: false,
          title: info.title || '',
          thumbnail: info.thumbnail || '',
          duration: info.duration || 0,
          expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
        };

        // Cache the result
        this.urlCache.set(cacheKey, videoInfo);

        // Clean old cache entries
        if (this.urlCache.size > 100) {
          const entries = Array.from(this.urlCache.entries());
          entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
          this.urlCache.delete(entries[0][0]);
        }

        return videoInfo;
      }
    } catch (error) {
      const errorCategory = this.categorizeError(error);
      logger.error('Failed to get video URL', {
        videoId,
        error: error.message,
        category: errorCategory,
        stack: error.stack
      });

      // Clear from cache if it exists
      this.urlCache.delete(cacheKey);
      this.urlCache.delete(`${videoId}_hd`);
      this.urlCache.delete(videoId);

      // Return error response
      return {
        error: true,
        message: error.message,
        category: errorCategory,
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
      const commonArgs = this.getCommonArgs();
      const { stdout } = await execPromise(
        `yt-dlp${commonArgs} "ytsearch10:${query}" --flat-playlist -j --no-warnings`,
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
      const errorCategory = this.categorizeError(error);
      logger.error('Search failed', {
        query,
        error: error.message,
        category: errorCategory
      });

      // Return empty results instead of throwing
      return [];
    }
  }

  // Prefetch video URL without blocking
  async prefetchVideoUrl(videoId) {
    // Check if already cached
    const hdCacheKey = `${videoId}_hd`;
    const normalCacheKey = videoId;

    if (this.urlCache.has(hdCacheKey) || this.urlCache.has(normalCacheKey)) {
      logger.debug('URL already cached', { videoId });
      return;
    }

    logger.debug('Prefetching URL', { videoId });

    // Run in background without awaiting
    this.getVideoUrl(videoId, true).catch(error => {
      const errorCategory = this.categorizeError(error);
      logger.error('Failed to prefetch', {
        videoId,
        error: error.message,
        category: errorCategory
      });
    });
  }

  // Categorize errors for better debugging
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const stderr = error.stderr?.toLowerCase() || '';
    const combined = message + ' ' + stderr;

    if (combined.includes('video unavailable') || combined.includes('video not available')) {
      return 'VIDEO_UNAVAILABLE';
    }
    if (combined.includes('private video') || combined.includes('members-only')) {
      return 'ACCESS_RESTRICTED';
    }
    if (combined.includes('age-restricted') || combined.includes('sign in to confirm')) {
      return 'AGE_RESTRICTED';
    }
    if (combined.includes('copyright') || combined.includes('blocked')) {
      return 'COPYRIGHT_BLOCKED';
    }
    if (combined.includes('timeout') || combined.includes('timed out')) {
      return 'NETWORK_TIMEOUT';
    }
    if (combined.includes('connection') || combined.includes('network')) {
      return 'NETWORK_ERROR';
    }
    if (combined.includes('rate limit') || combined.includes('too many requests')) {
      return 'RATE_LIMITED';
    }
    if (combined.includes('no video formats')) {
      return 'NO_FORMATS';
    }

    return 'UNKNOWN';
  }
}

module.exports = new YouTubeService();
