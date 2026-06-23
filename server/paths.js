const envPaths = require('env-paths');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Initialize env-paths for 'yt-kara'
const paths = envPaths('yt-kara', { suffix: '' });

const isTest = process.env.TEST_MODE === 'true';

// Resolve data and cache directories
// In test mode, we use a unique subdirectory in the OS temp directory for complete isolation
const dataDir = isTest ? path.join(os.tmpdir(), 'yt-kara-tests', 'data') : paths.data;
const cacheDir = isTest ? path.join(os.tmpdir(), 'yt-kara-tests', 'cache') : paths.cache;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

module.exports = {
  // Returns the path and ensures the directory exists on disk (lazy execution)
  getDataDir() {
    return ensureDir(dataDir);
  },
  getCacheDir() {
    return ensureDir(cacheDir);
  }
};
