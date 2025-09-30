const { exec } = require('child_process');
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
      console.log('✓ yt-dlp is available for video extraction');
    } catch {
      console.error('\n❌ yt-dlp is not installed!');
      console.error('Please run: node setup.js');
      console.error('Or install manually: pip3 install yt-dlp');
      process.exit(1);
    }
  }

  async setupCookies() {
    if (fs.existsSync(this.cookiesFile)) {
      console.log('✓ Using cached cookies from data/cookies.txt');
      return;
    }

    console.log('Setting up YouTube cookies (one-time setup)...');
    console.log('You may be prompted to unlock your keychain ONCE.');

    // Ensure data directory exists
    const dataDir = path.dirname(this.cookiesFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      // Export cookies using yt-dlp (will prompt for keychain once)
      await execPromise(
        `yt-dlp --cookies-from-browser chrome --cookies "${this.cookiesFile}" --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
      );

      if (fs.existsSync(this.cookiesFile)) {
        console.log('✓ Cookies cached successfully');
      }
    } catch (error) {
      console.log('⚠ Could not cache cookies. Videos may be restricted.');
    }
  }

  getCookiesArg() {
    if (fs.existsSync(this.cookiesFile)) {
      return ` --cookies "${this.cookiesFile}"`;
    }
    return '';
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
        console.log(`Getting HD streams for ${videoId}`);

        const cookiesArg = this.getCookiesArg();

        // Run all three yt-dlp commands in parallel for better performance
        const [videoResult, audioResult, infoResult] = await Promise.all([
          // Get video URL with codec info
          execPromise(
            `yt-dlp${cookiesArg} -f "bestvideo[height<=720][vcodec^=avc]/bestvideo[height<=720]" --print "%(url)s|%(vcodec)s|%(ext)s" --no-warnings "${url}"`,
            {
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            }
          ),
          // Get audio URL with codec info
          execPromise(
            `yt-dlp${cookiesArg} -f "bestaudio[ext=m4a]/bestaudio" --print "%(url)s|%(acodec)s|%(ext)s" --no-warnings "${url}"`,
            {
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            }
          ),
          // Get video metadata
          execPromise(
            `yt-dlp${cookiesArg} -j --no-warnings "${url}"`,
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
        const cookiesArg = this.getCookiesArg();
        const { stdout: urlOutput } = await execPromise(
          `yt-dlp${cookiesArg} -f "22/best[height>=720]/best" --get-url --no-warnings "${url}"`,
          {
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
          }
        );

        // Then get the video metadata
        const { stdout: infoOutput } = await execPromise(
          `yt-dlp${cookiesArg} -j --no-warnings "${url}"`,
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
      console.error(`Failed to get video URL for ${videoId}:`, error.message);

      // Clear from cache if it exists
      this.urlCache.delete(cacheKey);
      this.urlCache.delete(`${videoId}_hd`);
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
      const cookiesArg = this.getCookiesArg();
      const { stdout } = await execPromise(
        `yt-dlp${cookiesArg} "ytsearch10:${query}" --flat-playlist -j --no-warnings`,
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

  // Prefetch video URL without blocking
  async prefetchVideoUrl(videoId) {
    // Check if already cached
    const hdCacheKey = `${videoId}_hd`;
    const normalCacheKey = videoId;

    if (this.urlCache.has(hdCacheKey) || this.urlCache.has(normalCacheKey)) {
      console.log(`URL already cached for ${videoId}`);
      return;
    }

    console.log(`Prefetching URL for ${videoId}...`);

    // Run in background without awaiting
    this.getVideoUrl(videoId, true).catch(error => {
      console.error(`Failed to prefetch ${videoId}:`, error.message);
    });
  }
}

module.exports = new YouTubeService();
