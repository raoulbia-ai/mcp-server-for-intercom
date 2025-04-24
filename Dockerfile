FROM debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive \
    GLAMA_VERSION="0.2.0" \
    PATH="/home/service-user/.local/bin:${PATH}"

# Create user and set up environment
RUN groupadd -r service-user && \
    useradd -u 1987 -r -m -g service-user service-user && \
    mkdir -p /home/service-user/.local/bin /app && \
    chown -R service-user:service-user /home/service-user /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    ca-certificates \
    gnupg \
    software-properties-common \
    libssl-dev \
    zlib1g-dev \
    git \
    python3 \
    python3-pip \
    python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Set up Python alternatives
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1 && \
    python --version && \
    pip3 --version

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    node --version && \
    npm --version

# Install global npm packages
RUN npm install -g mcp-proxy@2.10.6 && \
    npm install -g pnpm@9.15.5 && \
    npm install -g bun@1.1.42

# Final cleanup
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

USER service-user

WORKDIR /app

# Clone specific commit from the repository
RUN git clone https://github.com/raoulbia-ai/mcp-server-for-intercom . && \
    git checkout $(git rev-parse HEAD)

# Create .well-known directory
RUN mkdir -p /app/.well-known

# Add GLAMA discovery file and server
COPY .well-known /app/.well-known
COPY glama-discovery-server.cjs /app/glama-discovery-server.cjs

# Install dependencies and build
RUN pnpm install && \
    pnpm build

# Environment variables for MCP configuration
ENV MCP_SERVER_NAME="Intercom MCP Proxy" \
    MCP_SERVER_VERSION="1.2.0" \
    MCP_ALLOWED_ORIGINS="*"

# Create public directory for static serving
RUN mkdir -p /app/public/.well-known && \
    cp /app/.well-known/glama.json /app/public/.well-known/glama.json && \
    cat /app/public/.well-known/glama.json

# Install http-server
RUN npm install -g http-server

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Starting Glama discovery server on port 8080..."\n\
# Start the http-server in the background for Glama discovery\n\
http-server /app/public -p 8080 --cors -d false -i false -c-1 -s &\n\
HTTP_SERVER_PID=$!\n\
sleep 2\n\
# Verify the Glama discovery server is running\n\
curl -s http://localhost:8080/.well-known/glama.json || echo "WARNING: Glama discovery endpoint not accessible!"\n\
echo "Starting MCP server on port 3000..."\n\
# Start the MCP server in the foreground\n\
mcp-proxy --host=0.0.0.0 --port=3000 --allow-origin=* node build/index.js\n\
# Cleanup\n\
kill $HTTP_SERVER_PID\n\
' > /app/start.sh && chmod +x /app/start.sh

# Use the startup script to run both servers
CMD ["/app/start.sh"]