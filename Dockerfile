FROM node:20-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Only keep production dependencies
RUN npm prune --production

# Run the server
CMD ["node", "build/index.js"]