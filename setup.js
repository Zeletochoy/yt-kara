#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkYtDlp() {
  try {
    await execPromise('which yt-dlp');
    const { stdout } = await execPromise('yt-dlp --version');
    console.log(`✅ yt-dlp is installed (version ${stdout.trim()})`);
    return true;
  } catch {
    console.log('❌ yt-dlp is not installed');
    return false;
  }
}

async function checkPython() {
  try {
    const { stdout } = await execPromise('python3 --version');
    console.log(`✅ Python3 is installed (${stdout.trim()})`);
    return true;
  } catch {
    console.log('❌ Python3 is not installed');
    return false;
  }
}

async function installYtDlp() {
  console.log('\n📦 Installing yt-dlp...\n');

  // Detect OS and use appropriate installation method
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS
      try {
        // Try Homebrew first
        await execPromise('which brew');
        console.log('Using Homebrew to install yt-dlp...');
        await execPromise('brew install yt-dlp');
      } catch {
        // Fallback to pip
        console.log('Using pip to install yt-dlp...');
        await execPromise('pip3 install --user yt-dlp');
      }
    } else if (platform === 'linux') {
      // Linux
      try {
        // Try apt-get first (Debian/Ubuntu)
        await execPromise('which apt-get');
        console.log('Using apt-get to install yt-dlp...');
        await execPromise('sudo apt-get update && sudo apt-get install -y yt-dlp');
      } catch {
        try {
          // Try yum (RedHat/CentOS)
          await execPromise('which yum');
          console.log('Using yum to install yt-dlp...');
          await execPromise('sudo yum install -y yt-dlp');
        } catch {
          // Fallback to pip
          console.log('Using pip to install yt-dlp...');
          await execPromise('pip3 install --user yt-dlp');
        }
      }
    } else if (platform === 'win32') {
      // Windows
      console.log('Using pip to install yt-dlp...');
      await execPromise('pip install yt-dlp');
    } else {
      // Unknown platform, try pip
      console.log('Using pip to install yt-dlp...');
      await execPromise('pip3 install --user yt-dlp');
    }

    console.log('✅ yt-dlp installed successfully!');
    return true;
  } catch (error) {
    console.error('Failed to install yt-dlp automatically:', error.message);
    console.log('\n📝 Please install yt-dlp manually:');
    console.log('   Option 1: pip3 install yt-dlp');
    console.log('   Option 2: Download from https://github.com/yt-dlp/yt-dlp/releases');
    console.log('   Option 3 (macOS): brew install yt-dlp');
    console.log('   Option 4 (Ubuntu/Debian): sudo apt install yt-dlp');
    return false;
  }
}

async function setup() {
  console.log('🎵 YT-Kara Setup\n');
  console.log('This app requires yt-dlp for reliable video extraction.\n');

  // Check if Python is installed
  const hasPython = await checkPython();
  if (!hasPython) {
    console.log('\n⚠️  Python3 is required for yt-dlp');
    console.log('Please install Python3 from https://www.python.org/downloads/');
    process.exit(1);
  }

  // Check if yt-dlp is installed
  const hasYtDlp = await checkYtDlp();

  if (!hasYtDlp) {
    console.log('\nyt-dlp is required for extracting YouTube videos reliably.');
    console.log('It works with 99% of YouTube videos and is actively maintained.\n');

    const answer = await new Promise(resolve => {
      rl.question('Would you like to install yt-dlp now? (y/n): ', resolve);
    });

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const installed = await installYtDlp();
      if (!installed) {
        process.exit(1);
      }
    } else {
      console.log('\n⚠️  YT-Kara requires yt-dlp to function properly.');
      console.log('Please install it manually and run setup again.');
      process.exit(1);
    }
  }

  // Install npm dependencies
  console.log('\n📦 Installing Node.js dependencies...\n');
  try {
    await execPromise('npm install');
    console.log('✅ Node.js dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install Node.js dependencies:', error.message);
    process.exit(1);
  }

  console.log('\n✨ Setup complete! You can now run:');
  console.log('   npm start');
  console.log('\nThen open http://localhost:8080 in your browser');
  console.log('and scan the QR code with your phone to control the karaoke!\n');

  rl.close();
}

// Run setup
setup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
