FROM debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive \
    GLAMA_VERSION="0.2.0" \
    PATH="/home/service-user/.local/bin:${PATH}"

# Create user and directories
RUN groupadd -r service-user && \
    useradd -u 1987 -r -m -g service-user service-user && \
    mkdir -p /home/service-user/.local/bin /app && \
    chown -R service-user:service-user /home/service-user /app

# Install base packages and Git
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        wget \
        software-properties-common \
        libssl-dev \
        zlib1g-dev \
        git && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g mcp-proxy@2.10.6 pnpm@9.15.5 bun@1.1.42

# Install uv and Python
RUN curl -LsSf https://astral.sh/uv/install.sh | UV_INSTALL_DIR="/usr/local/bin" sh && \
    uv python install 3.13 --preview --default && \
    ln -s $(uv python find) /usr/local/bin/python

# Final cleanup
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

USER service-user

WORKDIR /app

RUN git clone https://github.com/raoulbia-ai/mcp-server-for-intercom . && git checkout e91655a60a49695207841c50328cfebdc88326c1

# Install Node.js dependencies
# Install dependencies and build the TypeScript project
RUN pnpm install && \
    pnpm build

# Start the MCP server directly (it uses stdio for communication)
ENV NODE_OPTIONS="--experimental-vm-modules"
CMD ["node", "--experimental-vm-modules", "build/index.js"]