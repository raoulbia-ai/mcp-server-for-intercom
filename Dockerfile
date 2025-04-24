FROM node:20-slim

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build
RUN npm ci --omit=dev && \
    npm run build && \
    npm prune --production

# Run the server
CMD ["node", "build/index.js"]