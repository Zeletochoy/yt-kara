// Favorites utility module
// Shared functions for managing favorite songs across host and client views

const FAVORITES_KEY = 'yt-kara-favorites';

/**
 * Extract video ID from YouTube URL or return the ID if already extracted
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - Video ID or null if invalid
 */
function extractVideoId(url) {
  if (!url) return null;

  // If it's already just an ID (11 characters, alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // Extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Add a song to favorites
 * @param {string} videoId - YouTube video ID or URL
 * @param {Object} metadata - Song metadata {title, artist, thumbnail}
 * @returns {boolean} - True if added successfully
 */
function addFavorite(videoId, metadata) {
  const id = extractVideoId(videoId);
  if (!id) {
    console.error('Invalid video ID or URL:', videoId);
    return false;
  }

  const favorites = getFavorites();

  // Check if already exists
  if (favorites.some(fav => fav.videoId === id)) {
    console.log('Song already in favorites');
    return false;
  }

  const favorite = {
    videoId: id,
    title: metadata.title || 'Unknown Title',
    artist: metadata.artist || '',
    thumbnail: metadata.thumbnail || '',
    addedAt: new Date().toISOString()
  };

  favorites.push(favorite);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

  // Dispatch event for other parts of the app to listen to
  window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: favorites }));

  return true;
}

/**
 * Remove a song from favorites
 * @param {string} videoId - YouTube video ID or URL
 * @returns {boolean} - True if removed successfully
 */
function removeFavorite(videoId) {
  const id = extractVideoId(videoId);
  if (!id) {
    console.error('Invalid video ID or URL:', videoId);
    return false;
  }

  const favorites = getFavorites();
  const filtered = favorites.filter(fav => fav.videoId !== id);

  if (filtered.length === favorites.length) {
    console.log('Song not found in favorites');
    return false;
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));

  // Dispatch event for other parts of the app to listen to
  window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: filtered }));

  return true;
}

/**
 * Get all favorites
 * @returns {Array} - Array of favorite objects
 */
function getFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return [];
  }
}

/**
 * Check if a song is in favorites
 * @param {string} videoId - YouTube video ID or URL
 * @returns {boolean} - True if in favorites
 */
function isFavorite(videoId) {
  const id = extractVideoId(videoId);
  if (!id) return false;

  const favorites = getFavorites();
  return favorites.some(fav => fav.videoId === id);
}

/**
 * Toggle favorite status
 * @param {string} videoId - YouTube video ID or URL
 * @param {Object} metadata - Song metadata (only used if adding)
 * @returns {boolean} - New favorite status (true = is now favorite)
 */
function _toggleFavorite(videoId, metadata) {
  if (isFavorite(videoId)) {
    removeFavorite(videoId);
    return false;
  } else {
    addFavorite(videoId, metadata);
    return true;
  }
}
