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

  // Check if running as root (e.g., in Docker)
  // Note: sudo variable was removed as it's not used - install methods handle permissions themselves
  const isRoot = process.getuid && process.getuid() === 0;

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
      // Linux - prefer pip for latest version (apt/yum packages are often outdated)
      console.log('Using pip to install yt-dlp (for latest version)...');
      const pipFlags = isRoot ? '--break-system-packages ' : '--user ';
      await execPromise(`pip3 install ${pipFlags}yt-dlp`);
    } else if (platform === 'win32') {
      // Windows
      console.log('Using pip to install yt-dlp...');
      await execPromise('pip install yt-dlp');
    } else {
      // Unknown platform, try pip
      console.log('Using pip to install yt-dlp...');
      const pipFlags = isRoot ? '--break-system-packages ' : '--user ';
      await execPromise(`pip3 install ${pipFlags}yt-dlp`);
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
  // Check if running in automated/CI mode
  const isAutomated = process.env.CI || !process.stdin.isTTY;

  console.log('🎵 YT-Kara Setup\n');

  if (isAutomated) {
    // Automated install (npm postinstall)
    console.log('Running automated setup...\n');

    // Check if Python is installed
    const hasPython = await checkPython();
    if (!hasPython) {
      console.log('⚠️  Python3 is not available, skipping yt-dlp installation');
      console.log('   YT-Kara requires yt-dlp to function properly.\n');
      return;
    }

    // Check and install yt-dlp
    const hasYtDlp = await checkYtDlp();
    if (!hasYtDlp) {
      console.log('📦 Installing yt-dlp...\n');
      const installed = await installYtDlp();
      if (!installed) {
        console.log('⚠️  Failed to install yt-dlp automatically');
        console.log('   Please install manually:');
        console.log('   • pip3 install yt-dlp');
        console.log('   • brew install yt-dlp (macOS)');
        console.log('   • sudo apt install yt-dlp (Ubuntu/Debian)\n');
      } else {
        console.log('✅ yt-dlp installed successfully!\n');
      }
    }

    console.log('✨ Setup complete! To start YT-Kara, run:');
    console.log('   yt-kara\n');
    return;
  }

  // Interactive setup
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

  // Install npm dependencies (only in interactive mode, not in postinstall)
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
