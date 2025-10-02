#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.server = null;
    this.results = [];
  }

  async killExistingServers() {
    // Kill any existing servers first
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

  async startServer() {
    console.log(`${colors.cyan}Starting server...${colors.reset}`);

    // Kill any existing servers first
    await this.killExistingServers();

    return new Promise((resolve, reject) => {
      this.server = spawn('npm', ['start'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      this.server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('YT-Kara Server Started')) {
          console.log(`${colors.green}✓ Server started${colors.reset}`);
          setTimeout(resolve, 2000); // Give it time to fully initialize
        }
      });

      this.server.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
      });

      this.server.on('error', reject);

      // Timeout if server doesn't start
      setTimeout(() => reject(new Error('Server failed to start')), 10000);
    });
  }

  async stopServer() {
    if (this.server) {
      console.log(`${colors.cyan}Stopping server...${colors.reset}`);
      this.server.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async runTest(testFile) {
    const testName = path.basename(testFile, '.js');
    console.log(`\n${colors.blue}Running: ${testName}${colors.reset}`);

    return new Promise((resolve) => {
      const startTime = Date.now();
      const test = spawn('node', [testFile], {
        cwd: __dirname,
        stdio: 'inherit'
      });

      test.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;

        this.results.push({
          name: testName,
          success,
          duration,
          code
        });

        if (success) {
          console.log(`${colors.green}✓ ${testName} passed (${duration}ms)${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ ${testName} failed with code ${code} (${duration}ms)${colors.reset}`);
        }

        resolve(success);
      });

      test.on('error', (error) => {
        console.error(`${colors.red}Test error: ${error.message}${colors.reset}`);
        this.results.push({
          name: testName,
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        });
        resolve(false);
      });
    });
  }

  async runAllTests() {
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.cyan}YT-Kara Test Suite${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);

    try {
      // Start server
      await this.startServer();

      // Find all test files (excluding test-runner.js itself)
      const testFiles = fs.readdirSync(__dirname)
        .filter(file => file.startsWith('test-') && file.endsWith('.js') && file !== 'test-runner.js')
        .map(file => path.join(__dirname, file));

      console.log(`${colors.cyan}Found ${testFiles.length} test files${colors.reset}`);

      // Run each test
      for (const testFile of testFiles) {
        await this.runTest(testFile);
      }

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    } finally {
      await this.stopServer();
    }

    // Exit with appropriate code
    const allPassed = this.results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
  }

  printSummary() {
    console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.cyan}Test Summary${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTests run: ${total}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    if (failed > 0) {
      console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    }
    console.log(`Total time: ${totalTime}ms`);

    if (failed > 0) {
      console.log(`\n${colors.red}Failed tests:${colors.reset}`);
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.name} (exit code: ${r.code || 'N/A'})`);
      });
    }
  }
}

// Run tests if this is the main module
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;
