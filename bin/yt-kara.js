#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

async function checkYtDlp() {
  try {
    await execPromise('which yt-dlp');
    return true;
  } catch {
    return false;
  }
}

async function start() {
  console.log('🎵 YT-Kara - Karaoke Web App\n');

  // Check if yt-dlp is installed
  const hasYtDlp = await checkYtDlp();
  if (!hasYtDlp) {
    console.log('⚠️  Warning: yt-dlp is not installed!');
    console.log('   YT-Kara requires yt-dlp to extract YouTube videos.\n');
    console.log('   Install it with one of:');
    console.log('   • pip3 install yt-dlp');
    console.log('   • brew install yt-dlp (macOS)');
    console.log('   • sudo apt install yt-dlp (Ubuntu/Debian)\n');
    console.log('   Then restart yt-kara.\n');
    process.exit(1);
  }

  // Start the server
  const serverPath = path.join(__dirname, '..', 'server', 'index.js');
  require(serverPath);
}

start().catch(error => {
  console.error('Failed to start YT-Kara:', error);
  process.exit(1);
});
