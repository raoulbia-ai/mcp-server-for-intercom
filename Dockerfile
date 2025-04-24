FROM node:20-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY src/ ./src/

# Build the project
RUN npm run build

# Run the server
CMD ["node", "build/index.js"]