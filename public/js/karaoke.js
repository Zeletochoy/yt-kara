// Karaoke view controller
const videoPlayer = document.getElementById('video-player');
const noVideoDiv = document.getElementById('no-video');
const queueList = document.getElementById('queue-list');
const songTitle = document.getElementById('song-title');
const progressFill = document.getElementById('progress-fill');
const currentInfo = document.getElementById('current-info');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');

let currentVideoUrl = null;
let playbackUpdateInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupConnection();
  setupQRCode();
  setupVideoPlayer();
  setupHostControls();

  // Fullscreen button
  document.getElementById('host-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
});

function setupConnection() {
  wsConnection.onConnect = () => {
    console.log('Connected to server');
  };

  wsConnection.onDisconnect = () => {
    console.log('Disconnected from server');
  };

  wsConnection.onSeek = (time) => {
    videoPlayer.currentTime = time;
  };

  wsConnection.on('STATE_UPDATE', (message) => {
    updateUI(message.state);
  });

  wsConnection.connect();
}

async function setupQRCode() {
  try {
    // Fetch network info from the server
    const response = await fetch('/api/network-info');
    const { ip, port } = await response.json();

    // Use network IP for the QR code
    const networkUrl = `http://${ip}:${port}/client`;

    // Generate QR code
    const qrContainer = document.getElementById('qr-code');

    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined') {
      console.error('QRCode library not loaded');
      // Retry after a delay
      setTimeout(setupQRCode, 1000);
      return;
    }

    // Clear container first
    qrContainer.innerHTML = '';

    // Create QR code using QRCode.js
    new QRCode(qrContainer, {
      text: networkUrl,
      width: 150,
      height: 150,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    // Remove the title/tooltip that QRCode.js adds
    setTimeout(() => {
      const img = qrContainer.querySelector('img');
      if (img) img.removeAttribute('title');
    }, 100);

    // Update the QR link href
    const qrLink = document.getElementById('qr-link');
    if (qrLink) {
      qrLink.href = networkUrl;
    }

    console.log('QR code generated successfully with network URL:', networkUrl);
  } catch (error) {
    console.error('Failed to setup QR code:', error);
    // Still generate QR code with fallback URL
    const localUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/client`;

    if (typeof QRCode !== 'undefined') {
      const qrContainer = document.getElementById('qr-code');
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
        text: localUrl,
        width: 150,
        height: 150,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });

      // Update the QR link href in fallback case
      const qrLink = document.getElementById('qr-link');
      if (qrLink) {
        qrLink.href = localUrl;
      }
    }
  }
}

function setupVideoPlayer() {
  // Don't send play/pause events that come from state updates
  let ignoreNextEvent = false;

  videoPlayer.addEventListener('play', () => {
    if (!ignoreNextEvent) {
      wsConnection.playPause(true);
      updatePlayPauseButton(false);
    }
    ignoreNextEvent = false;
  });

  videoPlayer.addEventListener('pause', () => {
    if (!ignoreNextEvent) {
      wsConnection.playPause(false);
      updatePlayPauseButton(true);
    }
    ignoreNextEvent = false;
  });

  videoPlayer.addEventListener('ended', () => {
    console.log('Video ended, skipping to next song');
    // Clear current video URL to ensure next song loads properly
    currentVideoUrl = null;
    wsConnection.skipSong();
  });

  // Update progress bar and time display continuously during playback
  videoPlayer.addEventListener('timeupdate', () => {
    if (videoPlayer.duration) {
      updateProgress(videoPlayer.currentTime, videoPlayer.duration);
      updateTimeDisplay(videoPlayer.currentTime, videoPlayer.duration);

      // Workaround: Check if we're near the end and video is about to end
      if (videoPlayer.duration - videoPlayer.currentTime < 0.5 && !videoPlayer.paused && currentVideoUrl) {
        console.log('Near end of video, preparing for next song');
        // Clear currentVideoUrl early to ensure next song loads
        if (videoPlayer.duration - videoPlayer.currentTime < 0.1) {
          if (currentVideoUrl) {
            console.log('Video about to end, triggering skip');
            currentVideoUrl = null;
            wsConnection.skipSong();
          }
        }
      }
    }
  });

  // Send playback updates periodically
  videoPlayer.addEventListener('playing', () => {
    if (playbackUpdateInterval) clearInterval(playbackUpdateInterval);
    playbackUpdateInterval = setInterval(() => {
      wsConnection.updatePlayback(videoPlayer.currentTime);
    }, 1000);
  });

  videoPlayer.addEventListener('pause', () => {
    if (playbackUpdateInterval) {
      clearInterval(playbackUpdateInterval);
      playbackUpdateInterval = null;
    }
  });

  // Click to unmute if muted (for autoplay support)
  videoPlayer.addEventListener('click', () => {
    if (videoPlayer.muted) {
      videoPlayer.muted = false;
      console.log('Video unmuted by user click');
    }
  });

  // Also unmute on play button press
  videoPlayer.addEventListener('play', () => {
    if (videoPlayer.muted) {
      setTimeout(() => {
        videoPlayer.muted = false;
        console.log('Video unmuted after play');
      }, 100);
    }
  });
}

function setupHostControls() {
  const previousBtn = document.getElementById('host-previous');
  const playPauseBtn = document.getElementById('host-play-pause');
  const seekBackBtn = document.getElementById('host-seek-back');
  const seekForwardBtn = document.getElementById('host-seek-forward');
  const skipBtn = document.getElementById('host-skip');

  previousBtn?.addEventListener('click', () => {
    wsConnection.previousSong();
  });

  playPauseBtn?.addEventListener('click', () => {
    if (videoPlayer.paused) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  });

  seekBackBtn?.addEventListener('click', () => {
    const newTime = Math.max(0, videoPlayer.currentTime - 10);
    videoPlayer.currentTime = newTime;
    wsConnection.seek(newTime);
  });

  seekForwardBtn?.addEventListener('click', () => {
    const newTime = Math.min(videoPlayer.duration || 0, videoPlayer.currentTime + 10);
    videoPlayer.currentTime = newTime;
    wsConnection.seek(newTime);
  });

  skipBtn?.addEventListener('click', () => {
    wsConnection.skipSong();
  });

  const resetQueueBtn = document.getElementById('host-reset-queue');
  const resetHistoryBtn = document.getElementById('host-reset-history');

  resetQueueBtn?.addEventListener('click', () => {
    if (confirm('Clear the entire queue and stop playing?')) {
      wsConnection.resetQueue();
    }
  });

  resetHistoryBtn?.addEventListener('click', () => {
    if (confirm('Clear the entire history?')) {
      wsConnection.resetHistory();
    }
  });
}

function updatePlayPauseButton(isPaused) {
  const playPauseBtn = document.getElementById('host-play-pause');
  if (playPauseBtn) {
    const icon = playPauseBtn.querySelector('i');
    if (icon) {
      icon.className = isPaused ? 'fas fa-play' : 'fas fa-pause';
    }
  }
}

async function updateUI(state) {
  console.log('UpdateUI called with state:', state.currentSong?.title, 'isPlaying:', state.isPlaying);
  // Update queue
  updateQueue(state.queue);

  // Update current song
  if (state.currentSong) {
    await loadVideo(state.currentSong, state.isPlaying);
    updateCurrentSong(state.currentSong);

    // Update playback state (wait for video to be ready)
    if (videoPlayer.readyState >= 2) { // HAVE_CURRENT_DATA
      if (state.isPlaying && videoPlayer.paused) {
        videoPlayer.play().catch(e => console.error('Play failed:', e));
      } else if (!state.isPlaying && !videoPlayer.paused) {
        videoPlayer.pause();
      }
    }

    // Update time if significantly different
    if (Math.abs(videoPlayer.currentTime - state.currentTime) > 2) {
      videoPlayer.currentTime = state.currentTime;
    }

    // Update progress bar
    updateProgress(state.currentTime, state.currentSong.duration);
  } else {
    // No song playing - clean up video
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    noVideoDiv.style.display = 'flex';
    videoPlayer.style.display = 'none';
    currentInfo.style.display = 'none';
    currentVideoUrl = null;
  }
}

async function loadVideo(song, isPlaying = true) {
  console.log('LoadVideo called for:', song.title, 'current:', currentVideoUrl?.videoId, 'new:', song.videoId);

  // Check if it's the same video BEFORE cleaning up
  if (currentVideoUrl?.videoId === song.videoId) {
    console.log('Same video, skipping load');
    // If video element has an error, clean up and reload
    if (videoPlayer.error || !videoPlayer.src) {
      console.log('Video has error or no src, cleaning up and reloading');
      // Continue to reload the video
    } else {
      return; // Video is fine, skip reload
    }
  }

  // Stop and clean up current video
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load(); // Reset the video element

  try {
    const response = await fetch(`/api/video/${song.videoId}`);
    const videoInfo = await response.json();

    // Check if the API call failed
    if (!response.ok || videoInfo.error) {
      console.error('Failed to get video URL:', videoInfo.error || videoInfo.message);
      throw new Error(videoInfo.message || 'Failed to get video URL');
    }

    currentVideoUrl = { ...videoInfo, videoId: song.videoId };

    // Track if we've already started playing
    let playStarted = false;

    // Set up the autoplay handler BEFORE setting src
    const tryAutoplay = () => {
      if (playStarted) return; // Avoid multiple play attempts
      console.log('tryAutoplay called, isPlaying:', isPlaying);
      if (isPlaying) {
        playStarted = true;
        console.log('Attempting autoplay...');

        // Always start muted for better autoplay success
        videoPlayer.muted = true;
        videoPlayer.play().then(() => {
          console.log('Autoplay successful, unmuting...');
          // Unmute after successful start
          setTimeout(() => {
            videoPlayer.muted = false;
          }, 100);
        }).catch(e => {
          console.error('Autoplay failed:', e);
          playStarted = false; // Reset to allow retry
          // Try unmuted as fallback
          videoPlayer.muted = false;
          videoPlayer.play().catch(e2 => {
            console.error('Manual play also failed:', e2);
          });
        });
      }
    };

    // Standard playback with cached file
    console.log('Using standard player with cached file:', videoInfo.url);
    videoPlayer.src = videoInfo.url;
    videoPlayer.style.display = 'block';
    noVideoDiv.style.display = 'none';
    currentInfo.style.display = 'flex';

    // Force load to start
    videoPlayer.load();

    // Try to play immediately
    setTimeout(() => tryAutoplay(), 100);

    // Listen for when video is ready
    videoPlayer.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded, readyState:', videoPlayer.readyState);
      tryAutoplay();
    }, { once: true });

    // Also try playing when video can play
    videoPlayer.addEventListener('canplay', () => {
      console.log('Video can play, readyState:', videoPlayer.readyState);
      tryAutoplay();
    }, { once: true });

    console.log('Video src set, checking readyState:', videoPlayer.readyState);

    // If video is already ready, try to play immediately
    if (videoPlayer.readyState >= 2) {
      console.log('Video already ready, attempting autoplay');
      tryAutoplay();
    }
  } catch (error) {
    console.error('Failed to load video:', error);
    // Skip to next on error
    setTimeout(() => wsConnection.skipSong(), 2000);
  }
}

function updateCurrentSong(song) {
  songTitle.textContent = `♪ ${song.title}`;
  // Update total time display
  if (totalTimeEl && song.duration) {
    totalTimeEl.textContent = formatTime(song.duration);
  }
}

function updateProgress(currentTime, duration) {
  const percentage = (currentTime / duration) * 100;
  progressFill.style.width = `${percentage}%`;
}

function updateQueue(queue) {
  if (queue.length === 0) {
    queueList.innerHTML = '<div class="empty-state">Queue is empty<br><small>Scan the QR code to add songs!</small></div>';
    return;
  }

  queueList.innerHTML = queue.slice(0, 5).map(item => `
    <div class="queue-item">
      <img src="${item.thumbnail}" alt="">
      <div class="queue-item-info">
        <div class="queue-item-title">${item.title}</div>
        <div class="queue-item-meta">Added by ${item.addedBy}</div>
      </div>
    </div>
  `).join('');
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimeDisplay(currentTime, duration) {
  if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
  if (totalTimeEl) totalTimeEl.textContent = formatTime(duration);
}
