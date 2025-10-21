// Client controller
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const karaokeCheckbox = document.getElementById('karaoke-checkbox');
const queueListEl = document.getElementById('queue-list');
const historyList = document.getElementById('history-list');
const currentSongEl = document.getElementById('current-song');
const connectionStatus = document.getElementById('connection-status');
const userNameInput = document.getElementById('user-name');

// Search state
let isSearching = false;

// Tab handling
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;

    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update active panel
    panels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `${targetTab}-tab`) {
        panel.classList.add('active');
      }
    });
  });
});

// Remote tab playback controls
const nowPlayingEl = document.getElementById('now-playing');

document.getElementById('remote-previous')?.addEventListener('click', () => {
  wsConnection.previousSong();
});

document.getElementById('remote-play-pause')?.addEventListener('click', () => {
  const isPlaying = wsConnection.state?.isPlaying;
  wsConnection.playPause(!isPlaying);
  updatePlayPauseButton(!isPlaying);
});

document.getElementById('remote-skip')?.addEventListener('click', () => {
  wsConnection.skipSong();
});

document.getElementById('remote-seek-back')?.addEventListener('click', () => {
  const currentTime = wsConnection.state?.currentTime || 0;
  wsConnection.seek(Math.max(0, currentTime - 10));
});

document.getElementById('remote-seek-forward')?.addEventListener('click', () => {
  const currentTime = wsConnection.state?.currentTime || 0;
  const duration = wsConnection.state?.currentSong?.duration || 0;
  wsConnection.seek(Math.min(duration, currentTime + 10));
});

// Volume control setup
const volumeSlider = document.getElementById('volume-slider-remote');
const volumeValue = document.getElementById('volume-value-remote');

volumeSlider?.addEventListener('input', (e) => {
  const volume = parseInt(e.target.value, 10);
  volumeValue.textContent = `${volume}%`;
  wsConnection.setVolume(volume);
});

// Pitch control setup
const pitchUpBtn = document.getElementById('pitch-up-remote');
const pitchDownBtn = document.getElementById('pitch-down-remote');
let currentPitch = 0;

pitchUpBtn?.addEventListener('click', () => {
  if (currentPitch < 12) {
    const newPitch = currentPitch + 1;
    currentPitch = newPitch;
    wsConnection.setPitch(newPitch);
  }
});

pitchDownBtn?.addEventListener('click', () => {
  if (currentPitch > -12) {
    const newPitch = currentPitch - 1;
    currentPitch = newPitch;
    wsConnection.setPitch(newPitch);
  }
});

function updatePlayPauseButton(isPlaying) {
  const btn = document.getElementById('remote-play-pause');
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
  }
}

// Search functionality
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') performSearch();
});

function performSearch() {
  const query = searchInput.value.trim();
  if (!query || isSearching) return;

  // Set searching state
  isSearching = true;
  searchBtn.disabled = true;

  // Show spinner
  searchResults.innerHTML = '<div class="empty-state"><p><i class="fas fa-spinner fa-spin"></i> Searching...</p></div>';

  // Add "karaoke" to query if checkbox is checked
  const searchQuery = karaokeCheckbox.checked ? query + ' karaoke' : query;
  wsConnection.search(searchQuery);
}

// Name handling
const savedName = localStorage.getItem('userName') || '';
userNameInput.value = savedName;

userNameInput.addEventListener('input', () => {
  const name = userNameInput.value.trim();
  localStorage.setItem('userName', name);
  wsConnection.updateName(name);
});

// Karaoke checkbox handling
const savedKaraokePreference = localStorage.getItem('karaokeCheckbox');
if (savedKaraokePreference !== null) {
  karaokeCheckbox.checked = savedKaraokePreference === 'true';
}

karaokeCheckbox.addEventListener('change', () => {
  localStorage.setItem('karaokeCheckbox', karaokeCheckbox.checked);
});

// WebSocket setup
wsConnection.onConnect = () => {
  connectionStatus.classList.remove('disconnected');
  // Send name on connect
  const name = localStorage.getItem('userName') || '';
  if (name) {
    wsConnection.updateName(name);
  }
};

wsConnection.onDisconnect = () => {
  connectionStatus.classList.add('disconnected');
};

wsConnection.on('STATE_UPDATE', (message) => {
  updateUI(message.state);
});

wsConnection.on('SEARCH_RESULTS', (message) => {
  displaySearchResults(message.results);
});

// Initialize connection
wsConnection.connect();

// UI update functions
function updateUI(state) {
  // Update volume
  if (state.volume !== undefined) {
    const volumeSlider = document.getElementById('volume-slider-remote');
    const volumeValue = document.getElementById('volume-value-remote');
    if (volumeSlider && volumeValue) {
      volumeSlider.value = state.volume;
      volumeValue.textContent = `${state.volume}%`;
    }
  }

  // Update pitch
  if (state.pitch !== undefined) {
    currentPitch = state.pitch;
    const pitchValueEl = document.getElementById('pitch-value-remote');
    const pitchUpBtn = document.getElementById('pitch-up-remote');
    const pitchDownBtn = document.getElementById('pitch-down-remote');
    if (pitchValueEl) {
      // Display in tones (1 tone = 2 semitones)
      const tones = state.pitch / 2;
      const displayValue = tones > 0 ? `+${tones}` : `${tones}`;
      pitchValueEl.textContent = displayValue;

      // Color coding: red for negative, white for 0, default for positive
      if (state.pitch < 0) {
        pitchValueEl.style.color = '#ff4444';
      } else if (state.pitch === 0) {
        pitchValueEl.style.color = '#ffffff';
      } else {
        pitchValueEl.style.color = ''; // Use default color for positive
      }
    }
    if (pitchUpBtn) pitchUpBtn.disabled = state.pitch >= 12;
    if (pitchDownBtn) pitchDownBtn.disabled = state.pitch <= -12;
  }

  // Update current song
  if (state.currentSong) {
    currentSongEl.innerHTML = `
      <h3>Now Playing</h3>
      <div class="now-playing-card">
        <img src="${state.currentSong.thumbnail}" alt="" class="now-playing-thumbnail">
        <div class="song-title">${state.currentSong.title}</div>
      </div>
    `;

    // Update now playing in remote tab
    nowPlayingEl.innerHTML = `
      <div class="now-playing-card">
        <img src="${state.currentSong.thumbnail}" alt="" class="now-playing-thumbnail">
        <div class="now-playing-info">
          <div class="now-playing-title">${state.currentSong.title}</div>
        </div>
      </div>
    `;

    // Update play/pause button
    updatePlayPauseButton(state.isPlaying);
  } else {
    currentSongEl.innerHTML = '<div class="empty-state"><p>No song playing</p></div>';
    nowPlayingEl.innerHTML = '<div class="empty-state"><p>No song playing</p></div>';
  }

  // Update queue
  if (state.queue.length > 0) {
    queueListEl.innerHTML = state.queue.map((item, index) => `
      <div class="song-card queue-item" data-index="${index}" draggable="true">
        <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
        <img src="${item.thumbnail}" alt="" class="song-thumbnail">
        <div class="song-info">
          <div class="song-title">${item.title}</div>
          <div class="song-meta">Added by ${item.addedBy || 'Unknown'}</div>
        </div>
        <button class="remove-btn" onclick="removeFromQueue(${item.id})" title="Remove from queue"><i class="fas fa-times"></i></button>
      </div>
    `).join('');

    // Set up drag and drop
    setupQueueDragDrop();
  } else {
    queueListEl.innerHTML = '<div class="empty-state"><p>Queue is empty</p></div>';
  }

  // Update history
  if (state.history && state.history.length > 0) {
    historyList.innerHTML = state.history.reverse().map(item => `
      <div class="song-card">
        <img src="${item.thumbnail}" alt="" class="song-thumbnail">
        <div class="song-info">
          <div class="song-title">${item.title}</div>
          <div class="song-meta">Played ${getRelativeTime(item.playedAt)}</div>
        </div>
        <button class="song-action" onclick="addFromHistory('${item.videoId}', '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.thumbnail)}', ${item.duration || 0})" title="Add this song to the queue again">Add Again</button>
      </div>
    `).join('');
  } else {
    historyList.innerHTML = '<div class="empty-state"><p>No history yet</p></div>';
  }
}

function displaySearchResults(results) {
  // Reset searching state
  isSearching = false;
  searchBtn.disabled = false;

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="empty-state"><p>No results found</p></div>';
    return;
  }

  // Store results globally for access by addToQueue
  window.searchResultsCache = results;

  searchResults.innerHTML = results.map((item, index) => {
    const isFav = isFavorite(item.videoId);
    return `
    <div class="song-card">
      <img src="${item.thumbnail}" alt="" class="song-thumbnail">
      <div class="song-info clickable" onclick="addToQueue(${index})" title="Click to add to queue">
        <div class="song-title">${item.title}</div>
        <div class="song-meta">
          ${item.channel} • ${formatTime(item.duration)}
          <a href="https://www.youtube.com/watch?v=${item.videoId}" target="_blank" class="youtube-link" onclick="event.stopPropagation()" title="Watch on YouTube">
            <i class="fab fa-youtube"></i>
          </a>
        </div>
      </div>
      <button class="favorite-btn ${isFav ? 'active' : ''}" data-video-id="${item.videoId}" data-index="${index}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
        <i class="fas fa-star"></i>
      </button>
    </div>
  `;
  }).join('');

  // Set up event delegation for favorite buttons
  setupFavoriteButtons();
}

// Set up event delegation for favorite buttons
function setupFavoriteButtons() {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;

  // Remove any existing listener to avoid duplicates
  resultsContainer.removeEventListener('click', handleFavoriteClick);
  resultsContainer.addEventListener('click', handleFavoriteClick);
}

// Handle favorite button clicks
function handleFavoriteClick(e) {
  const button = e.target.closest('.favorite-btn');
  if (!button) return;

  e.stopPropagation();
  e.preventDefault();

  const videoId = button.dataset.videoId;
  if (!videoId) return;

  // Add visual feedback animation
  button.classList.add('pulse');
  setTimeout(() => button.classList.remove('pulse'), 400);

  toggleFavoriteById(videoId);
}

// Helper functions
function addToQueue(index) {
  if (window.searchResultsCache && window.searchResultsCache[index]) {
    const song = window.searchResultsCache[index];
    wsConnection.addSong(song);
    // Switch to queue tab
    document.querySelector('[data-tab="queue"]').click();
  }
}

function removeFromQueue(queueId) {
  wsConnection.removeSong(queueId);
}

function formatTime(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Drag and drop for queue reordering
let draggedItem = null;
let draggedIndex = null;
let touchItem = null;
const touchOffset = { x: 0, y: 0 };
let placeholder = null;

function setupQueueDragDrop() {
  const items = document.querySelectorAll('.queue-item');

  items.forEach((item, index) => {
    // Desktop drag events
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      draggedIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = getDragAfterElement(queueListEl, e.clientY);
      if (afterElement == null) {
        queueListEl.appendChild(draggedItem);
      } else {
        queueListEl.insertBefore(draggedItem, afterElement);
      }
    });

    // Mobile touch events
    const handle = item.querySelector('.drag-handle');
    if (handle) {
      handle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchItem = item;
        draggedIndex = index;

        const touch = e.touches[0];
        const rect = item.getBoundingClientRect();
        touchOffset.x = touch.clientX - rect.left;
        touchOffset.y = touch.clientY - rect.top;

        // Create placeholder
        placeholder = item.cloneNode(true);
        placeholder.style.opacity = '0.3';
        placeholder.classList.add('placeholder');

        // Style the dragged item
        item.style.position = 'fixed';
        item.style.zIndex = '1000';
        item.style.width = rect.width + 'px';
        item.style.left = (touch.clientX - touchOffset.x) + 'px';
        item.style.top = (touch.clientY - touchOffset.y) + 'px';
        item.classList.add('dragging');

        // Insert placeholder
        item.parentNode.insertBefore(placeholder, item.nextSibling);
      });
    }
  });

  // Add drop listener to the queue list itself for dropping at the end
  queueListEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  queueListEl.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggedItem && draggedIndex !== null) {
      // Find the new position based on where the item was dropped
      const allItems = Array.from(queueListEl.querySelectorAll('.queue-item'));
      const newIndex = allItems.indexOf(draggedItem);
      if (newIndex !== -1 && newIndex !== draggedIndex) {
        wsConnection.reorderQueue(draggedIndex, newIndex);
      }
    }
  });
}

// Global touch move and end handlers for mobile
document.addEventListener('touchmove', (e) => {
  if (!touchItem) return;
  e.preventDefault();

  const touch = e.touches[0];
  touchItem.style.left = (touch.clientX - touchOffset.x) + 'px';
  touchItem.style.top = (touch.clientY - touchOffset.y) + 'px';

  // Temporarily hide the dragged item to find element below
  touchItem.style.pointerEvents = 'none';
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  touchItem.style.pointerEvents = '';

  // Check if we're over the queue list itself (for dropping at the end)
  const queueItemBelow = elemBelow?.closest('.queue-item:not(.dragging):not(.placeholder)');
  const isOverQueueList = elemBelow?.closest('#queue-list');

  if (placeholder && isOverQueueList) {
    if (queueItemBelow) {
      const rect = queueItemBelow.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (touch.clientY < midpoint) {
        queueItemBelow.parentNode.insertBefore(placeholder, queueItemBelow);
      } else {
        queueItemBelow.parentNode.insertBefore(placeholder, queueItemBelow.nextSibling);
      }
    } else {
      // If no item below but we're over the queue list, append to the end
      const allItems = Array.from(queueListEl.querySelectorAll('.queue-item:not(.dragging)'));
      if (allItems.length > 0) {
        const lastItem = allItems[allItems.length - 1];
        const rect = lastItem.getBoundingClientRect();
        if (touch.clientY > rect.bottom) {
          queueListEl.appendChild(placeholder);
        }
      }
    }
  }
});

document.addEventListener('touchend', (e) => {
  if (!touchItem) return;
  e.preventDefault();

  // Find the new index based on placeholder position
  let newIndex = -1;
  if (placeholder && placeholder.parentNode) {
    const allItems = Array.from(queueListEl.children);
    newIndex = allItems.indexOf(placeholder);
  }

  // Reset styles
  touchItem.style.position = '';
  touchItem.style.zIndex = '';
  touchItem.style.width = '';
  touchItem.style.left = '';
  touchItem.style.top = '';
  touchItem.classList.remove('dragging');

  // Replace placeholder with item
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.replaceChild(touchItem, placeholder);
  }

  // Send reorder command if position changed
  if (draggedIndex !== null && newIndex !== -1 && newIndex !== draggedIndex) {
    wsConnection.reorderQueue(draggedIndex, newIndex);
  }

  // Clean up
  touchItem = null;
  placeholder = null;
  draggedIndex = null;
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.queue-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Add song from history
function addFromHistory(videoId, title, thumbnail, duration) {
  const song = {
    videoId: videoId,
    title: decodeURIComponent(title),
    thumbnail: decodeURIComponent(thumbnail),
    duration: duration,
    channel: 'From History'
  };
  wsConnection.addSong(song);
  // Switch to queue tab
  document.querySelector('[data-tab="queue"]').click();
}

// Favorites functions
function toggleFavoriteById(videoId) {
  // Find the song in search results to get metadata
  const song = window.searchResultsCache ?
    window.searchResultsCache.find(s => s.videoId === videoId) : null;

  if (!song) {
    console.error('Song not found in search results:', videoId);
    return;
  }

  const metadata = {
    title: song.title,
    artist: song.channel,
    thumbnail: song.thumbnail
  };

  const wasFavorite = isFavorite(videoId);

  // Perform the toggle operation
  if (wasFavorite) {
    removeFavorite(videoId);
  } else {
    addFavorite(videoId, metadata);
  }

  // Check the NEW state after the update
  const isNowFavorite = isFavorite(videoId);

  // Update the button state based on the NEW state
  const button = document.querySelector(`#search-results .favorite-btn[data-video-id="${videoId}"]`);

  if (button) {
    // Clear all state first
    button.classList.remove('active');

    // Set new state based on current favorite status
    if (isNowFavorite) {
      button.classList.add('active');
      button.setAttribute('title', 'Remove from favorites');
    } else {
      button.setAttribute('title', 'Add to favorites');
    }
  }
}

// Legacy function for backwards compatibility (if needed)
function toggleFavorite(index) {
  if (window.searchResultsCache && window.searchResultsCache[index]) {
    toggleFavoriteById(window.searchResultsCache[index].videoId);
  }
}

function displayFavorites() {
  const favoritesListEl = document.getElementById('favorites-list');
  const favorites = getFavorites();

  if (favorites.length === 0) {
    favoritesListEl.innerHTML = '<div class="empty-state"><p>No favorites yet<br><small>Add songs to favorites from search results</small></p></div>';
    return;
  }

  favoritesListEl.innerHTML = favorites.map(fav => `
    <div class="song-card">
      <img src="${fav.thumbnail}" alt="" class="song-thumbnail">
      <div class="song-info">
        <div class="song-title">${fav.title}</div>
        <div class="song-meta">${fav.artist || 'Unknown Artist'}</div>
      </div>
      <button class="add-btn" onclick="addFavoriteToQueue('${fav.videoId}')" title="Add to queue">
        <i class="fas fa-plus"></i>
      </button>
      <button class="favorite-btn active" onclick="removeFavoriteById('${fav.videoId}')" title="Remove from favorites">
        <i class="fas fa-star"></i>
      </button>
    </div>
  `).join('');
}

function addFavoriteToQueue(videoId) {
  const favorites = getFavorites();
  const fav = favorites.find(f => f.videoId === videoId);
  if (fav) {
    const song = {
      videoId: fav.videoId,
      title: fav.title,
      thumbnail: fav.thumbnail,
      duration: 0,
      channel: fav.artist || 'Unknown Artist'
    };
    wsConnection.addSong(song);
    document.querySelector('[data-tab="queue"]').click();
  }
}

function removeFavoriteById(videoId) {
  removeFavorite(videoId);
  displayFavorites();
  if (window.searchResultsCache) {
    displaySearchResults(window.searchResultsCache);
  }
}

// Listen for favorites changes
window.addEventListener('favoritesChanged', () => {
  // Only refresh the favorites tab if it's active
  if (document.getElementById('favorites-tab').classList.contains('active')) {
    displayFavorites();
  }
  // Don't re-render search results - this causes DOM destruction
});

// Load favorites when favorites tab is shown
document.addEventListener('DOMContentLoaded', () => {
  const favoritesTabs = document.querySelectorAll('[data-tab="favorites"]');
  favoritesTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      displayFavorites();
    });
  });
});

// Make functions globally available
window.addToQueue = addToQueue;
window.removeFromQueue = removeFromQueue;
window.addFromHistory = addFromHistory;
window.toggleFavorite = toggleFavorite;
window.toggleFavoriteById = toggleFavoriteById;
window.addFavoriteToQueue = addFavoriteToQueue;
window.removeFavoriteById = removeFavoriteById;
