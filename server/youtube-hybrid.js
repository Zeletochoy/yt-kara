const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Try to load YouTube.js as fallback
let YouTubeJS;
try {
  const { Innertube } = require('youtubei.js');
  YouTubeJS = { Innertube };
} catch (e) {
  console.log('YouTube.js not available');
}

class YouTubeService {
  constructor() {
    this.urlCache = new Map();
    this.searchCache = new Map();
    this.youtube = null;
    this.ytdlpAvailable = false;
    this.init();
  }

  async init() {
    // Check if yt-dlp is available
    try {
      await execPromise('which yt-dlp');
      this.ytdlpAvailable = true;
      console.log('✓ Using yt-dlp for video extraction');
    } catch {
      console.log('yt-dlp not found, using YouTube.js fallback');
      this.ytdlpAvailable = false;

      // Initialize YouTube.js
      if (YouTubeJS) {
        try {
          this.youtube = await YouTubeJS.Innertube.create();
          console.log('✓ YouTube.js initialized as fallback');
        } catch (error) {
          console.error('Failed to initialize YouTube.js:', error.message);
        }
      }
    }
  }

  async getVideoUrl(videoId) {
    // Check cache
    const cached = this.urlCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    // Try yt-dlp first if available
    if (this.ytdlpAvailable) {
      const result = await this.getVideoUrlYtDlp(videoId);
      if (!result.error) {
        return result;
      }
      console.log('yt-dlp failed, trying YouTube.js fallback');
    }

    // Fallback to YouTube.js
    if (this.youtube) {
      return await this.getVideoUrlYouTubeJS(videoId);
    }

    return {
      error: true,
      message: 'No video extraction method available',
      videoId: videoId
    };
  }

  async getVideoUrlYtDlp(videoId) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const { stdout } = await execPromise(
        `yt-dlp -j --no-warnings "${url}"`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const info = JSON.parse(stdout);
      let selectedFormat = null;

      if (info.formats) {
        selectedFormat = info.formats.find(f =>
          f.vcodec !== 'none' && f.acodec !== 'none' && f.url
        ) || info.formats.find(f =>
          f.vcodec !== 'none' && f.url
        );
      }

      if (!selectedFormat && info.url) {
        selectedFormat = { url: info.url };
      }

      if (!selectedFormat || !selectedFormat.url) {
        throw new Error('No suitable format found');
      }

      const videoInfo = {
        url: selectedFormat.url,
        title: info.title || '',
        thumbnail: info.thumbnail || '',
        duration: info.duration || 0,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000)
      };

      this.urlCache.set(videoId, videoInfo);
      return videoInfo;
    } catch (error) {
      return {
        error: true,
        message: error.message,
        videoId: videoId
      };
    }
  }

  async getVideoUrlYouTubeJS(videoId) {
    try {
      const info = await this.youtube.getBasicInfo(videoId);

      let url = null;
      const formats = info.streaming_data?.formats || [];
      const adaptiveFormats = info.streaming_data?.adaptive_formats || [];
      const allFormats = [...formats, ...adaptiveFormats];

      let format = allFormats.find(f =>
        f.has_video && f.has_audio && f.quality_label
      ) || allFormats.find(f => f.has_video);

      if (!format) {
        format = info.chooseFormat({
          quality: 'best',
          type: 'video+audio'
        });
      }

      if (!format) {
        throw new Error('No suitable format found');
      }

      // Try to get the URL
      if (format.url) {
        url = format.url;
      } else if (format.decipher && this.youtube.session.player) {
        try {
          url = await format.decipher(this.youtube.session.player);
        } catch (decipherError) {
          console.error('Decipher error:', decipherError.message);
          if (format.url) {
            url = format.url;
          }
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
        expiresAt: Date.now() + (2 * 60 * 60 * 1000)
      };

      this.urlCache.set(videoId, videoInfo);
      return videoInfo;
    } catch (error) {
      console.error(`Failed to get video URL for ${videoId}:`, error.message);
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
    if (cached && cached.timestamp > Date.now() - 3600000) {
      return cached.results;
    }

    // Try yt-dlp first if available
    if (this.ytdlpAvailable) {
      const results = await this.searchYtDlp(query);
      if (results.length > 0) {
        return results;
      }
    }

    // Fallback to YouTube.js
    if (this.youtube) {
      return await this.searchYouTubeJS(query);
    }

    return [];
  }

  async searchYtDlp(query) {
    try {
      const { stdout } = await execPromise(
        `yt-dlp "ytsearch10:${query}" --flat-playlist -j --no-warnings`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

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

      this.searchCache.set(query, {
        results: videos,
        timestamp: Date.now()
      });

      return videos;
    } catch (error) {
      console.error(`yt-dlp search failed:`, error.message);
      return [];
    }
  }

  async searchYouTubeJS(query) {
    try {
      const searchResults = await this.youtube.search(query);

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

      this.searchCache.set(query, {
        results: videos,
        timestamp: Date.now()
      });

      return videos;
    } catch (error) {
      console.error(`YouTube.js search failed:`, error.message);
      return [];
    }
  }
}

module.exports = new YouTubeService();