const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

class TestHelper {
  static server = null;

  static async startServer() {
    // Kill any existing servers first
    await TestHelper.killExistingServers();

    // Delete test state file for clean test environment (NOT the real session-state.json!)
    const testStateFile = path.join(__dirname, '..', 'data', 'session-state.test.json');
    try {
      if (fs.existsSync(testStateFile)) {
        fs.unlinkSync(testStateFile);
      }
    } catch (error) {
      console.error('Failed to delete test state file:', error);
    }

    return new Promise((resolve, reject) => {
      TestHelper.server = spawn('npm', ['start'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, TEST_MODE: 'true' }, // Use test state file
        stdio: 'pipe'
      });

      TestHelper.server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('YT-Kara Server Started')) {
          setTimeout(resolve, 2000); // Give it time to fully initialize
        }
      });

      TestHelper.server.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
      });

      TestHelper.server.on('error', reject);

      // Timeout if server doesn't start
      setTimeout(() => reject(new Error('Server failed to start')), 10000);
    });
  }

  static async killExistingServers() {
    try {
      await new Promise((resolve) => {
        const kill = spawn('pkill', ['-f', 'node server/index.js'], {
          stdio: 'ignore'
        });
        kill.on('close', () => resolve());
        setTimeout(resolve, 500); // Timeout if pkill doesn't exist
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for processes to die
    } catch {
      // Ignore errors - server might not be running
    }
  }

  static async stopServer() {
    if (TestHelper.server) {
      TestHelper.server.kill('SIGTERM');
      TestHelper.server = null;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  static async withServer(testFn) {
    try {
      await TestHelper.startServer();
      console.log('✓ Server started for test');
      return await testFn();
    } finally {
      await TestHelper.stopServer();
      console.log('✓ Server stopped after test');
    }
  }

  static launchBrowser() {
    const args = [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies'
    ];

    // Add --no-sandbox in CI environments (required for GitHub Actions)
    if (process.env.CI) {
      args.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    return puppeteer.launch({
      headless: 'new',
      protocolTimeout: 300000, // 5 minutes for slow operations
      args
    });
  }
}

module.exports = TestHelper;
