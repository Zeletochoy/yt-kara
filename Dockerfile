FROM node:18-slim

# Install Python and pip for yt-dlp (setup.js will install yt-dlp)
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and setup script
COPY package*.json ./
COPY setup.js ./

# Install dependencies (skip lifecycle scripts to avoid husky)
RUN npm ci --omit=dev --ignore-scripts

# Run setup.js to install yt-dlp (this is what postinstall would do)
RUN node setup.js

# Copy application files
COPY bin/ ./bin/
COPY server/ ./server/
COPY public/ ./public/

# Create data directory for persistent state
RUN mkdir -p /app/data

# Expose the application port
EXPOSE 8080

# Run the application
CMD ["node", "bin/yt-kara.js"]
