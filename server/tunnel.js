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
  const provider = (process.env.TUNNEL_PROVIDER || 'cloudflare').toLowerCase();

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

// createCloudflareTunnel uses the cloudflared npm package to automatically
// manage the binary and start the tunnel.
async function createCloudflareTunnel(port) {
  const { Tunnel, bin, install } = require('cloudflared');
  const fs = require('fs');

  if (!fs.existsSync(bin)) {
    logger.info('Installing cloudflared binary (this may take a moment)...');
    await install(bin);
  }

  return new Promise((resolve, reject) => {
    const tunnel = Tunnel.quick(`http://localhost:${port}`);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        tunnel.process.kill('SIGTERM');
        reject(new Error('Timed out waiting for cloudflared to provide tunnel URL (30s)'));
      }
    }, 30000);

    tunnel.on('url', (url) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        logger.info('Cloudflare tunnel established', { url });
        resolve({
          url,
          password: null,
          cleanup: () => {
            logger.info('Shutting down cloudflared...');
            tunnel.process.kill('SIGTERM');
          }
        });
      }
    });

    tunnel.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Failed to start cloudflared: ${err.message}`));
      }
    });

    tunnel.on('exit', (code) => {
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
