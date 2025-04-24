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

# Install dependencies and build
RUN pnpm install && \
    pnpm build

# Environment variables for MCP configuration
ENV MCP_SERVER_NAME="Intercom MCP Proxy" \
    MCP_SERVER_VERSION="1.2.0" \
    MCP_ALLOWED_ORIGINS="*"

# Use mcp-proxy to run the server executable with proper arguments
# Host 0.0.0.0 makes the server accessible outside the container
CMD ["mcp-proxy", "--host=0.0.0.0", "--port=8080", "--allow-origin=*", "node", "build/index.js"]