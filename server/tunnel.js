const { spawn, execSync } = require('child_process');
const logger = require('./logger');

const TUNNEL_PROVIDERS = {
  localtunnel: createLocaltunnel,
  cloudflare: createCloudflareTunnel
};

/**
 * Create a tunnel to expose the local server externally.
 * @param {number} port - Local port to tunnel
 * @returns {Promise<{ url: string, password: string|null, cleanup: () => void }>}
 */
async function createTunnel(port) {
  const provider = (process.env.TUNNEL_PROVIDER || 'localtunnel').toLowerCase();

  if (!TUNNEL_PROVIDERS[provider]) {
    throw new Error(
      `Unknown tunnel provider: "${provider}". Valid options: ${Object.keys(TUNNEL_PROVIDERS).join(', ')}`
    );
  }

  logger.info(`Creating tunnel with provider: ${provider}`);
  return TUNNEL_PROVIDERS[provider](port);
}

async function createLocaltunnel(port) {
  const localtunnel = require('localtunnel');
  const tunnel = await localtunnel({ port });

  tunnel.on('error', (err) => {
    logger.error('Tunnel error', { error: err.message });
    process.exit(1);
  });

  tunnel.on('close', () => {
    logger.info('Tunnel closed');
  });

  // Fetch tunnel password (server's public IP)
  let password = null;
  try {
    const https = require('https');
    const ipResponse = await new Promise((resolve, reject) => {
      https.get('https://ipv4.icanhazip.com', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    password = ipResponse.trim();
  } catch (err) {
    logger.warn('Could not fetch public IP for tunnel password', { error: err.message });
  }

  return {
    url: tunnel.url,
    password,
    cleanup: () => tunnel.close()
  };
}

function checkCloudflaredInstalled() {
  try {
    execSync('which cloudflared', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function createCloudflareTunnel(port) {
  if (!checkCloudflaredInstalled()) {
    throw new Error(
      'cloudflared is not installed.\n\n' +
      '  Install it with one of:\n' +
      '  - brew install cloudflared           (macOS)\n' +
      '  - sudo apt install cloudflared       (Ubuntu/Debian)\n' +
      '  - Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n\n' +
      '  Or use TUNNEL_PROVIDER=localtunnel instead.'
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    const urlRegex = /https?:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGTERM');
        reject(new Error('Timed out waiting for cloudflared to provide tunnel URL (30s)'));
      }
    }, 30000);

    function handleOutput(data) {
      const line = data.toString();
      logger.debug('cloudflared', { output: line.trim() });
      const match = line.match(urlRegex);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        const url = match[0];
        logger.info('Cloudflare tunnel established', { url });
        resolve({
          url,
          password: null,
          cleanup: () => {
            logger.info('Shutting down cloudflared...');
            child.kill('SIGTERM');
            setTimeout(() => {
              if (!child.killed) {
                child.kill('SIGKILL');
              }
            }, 5000);
          }
        });
      }
    }

    child.stderr.on('data', handleOutput);
    child.stdout.on('data', handleOutput);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Failed to start cloudflared: ${err.message}`));
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`cloudflared exited unexpectedly with code ${code}`));
      } else {
        logger.info('cloudflared process exited', { code });
      }
    });
  });
}

module.exports = { createTunnel };
