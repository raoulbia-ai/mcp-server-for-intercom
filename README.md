# MCP Server for Intercom

<a href="https://glama.ai/mcp/servers/@raoulbia-ai/mcp-server-for-intercom">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@raoulbia-ai/mcp-server-for-intercom/badge" />
</a>

An MCP-compliant server that enables AI assistants to access and analyze customer support data from Intercom.

## Features

- Search conversations and tickets with advanced filtering
- Filter by customer, status, date range, and keywords
- Search by email content even when no contact exists
- Efficient server-side filtering via Intercom's search API
- Seamless integration with MCP-compliant AI assistants

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- An Intercom account with API access
- Your Intercom API token (available in your Intercom account settings)

### Quick Setup

#### Using NPM
```bash
# Install the package globally
npm install -g mcp-server-for-intercom

# Set your Intercom API token
export INTERCOM_ACCESS_TOKEN="your_token_here"

# Run the server
intercom-mcp
```

#### Using Docker

The default Docker configuration is optimized for Glama compatibility:

```bash
# Start Docker (if not already running)
# On Windows: Start Docker Desktop application
# On Linux: sudo systemctl start docker

# Build the image
docker build -t mcp-intercom .

# Run the container with your API token and port mappings
docker run --rm -it -p 3000:3000 -p 8080:8080 -e INTERCOM_ACCESS_TOKEN="your_token_here" mcp-intercom:latest
```

**Validation Steps:**
```bash
# Test the server status
curl -v http://localhost:8080/.well-known/glama.json
# Test the MCP endpoint
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"mcp.capabilities"}' http://localhost:3000
```

##### Alternative Standard Version
If you prefer a lighter version without Glama-specific dependencies:

```bash
# Build the standard image
docker build -t mcp-intercom-standard -f Dockerfile.standard .

# Run the standard container
docker run --rm -it -p 3000:3000 -p 8080:8080 -e INTERCOM_ACCESS_TOKEN="your_token_here" mcp-intercom-standard:latest
```

The default version includes specific dependencies and configurations required for integration with the Glama platform, while the standard version is more lightweight.

## Available MCP Tools

### 1. `list_conversations`
Retrieves all conversations within a date range with content filtering.

**Parameters:**
- `startDate` (DD/MM/YYYY) – Start date (required)
- `endDate` (DD/MM/YYYY) – End date (required)
- `keyword` (string) – Filter to include conversations with this text
- `exclude` (string) – Filter to exclude conversations with this text

**Notes:**
- Date range must not exceed 7 days
- Uses efficient server-side filtering via Intercom's search API

**Example:**
```json
{
  "startDate": "15/01/2025",
  "endDate": "21/01/2025",
  "keyword": "billing"
}
```

### 2. `search_conversations_by_customer`
Finds conversations for a specific customer.

**Parameters:**
- `customerIdentifier` (string) – Customer email or Intercom ID (required)
- `startDate` (DD/MM/YYYY) – Optional start date
- `endDate` (DD/MM/YYYY) – Optional end date
- `keywords` (array) – Optional keywords to filter by content

**Notes:**
- Can find conversations by email content even if no contact exists
- Resolves emails to contact IDs for efficient searching

**Example:**
```json
{
  "customerIdentifier": "customer@example.com",
  "startDate": "15/01/2025",
  "endDate": "21/01/2025",
  "keywords": ["billing", "refund"]
}
```

### 3. `search_tickets_by_status`
Retrieves tickets by their status.

**Parameters:**
- `status` (string) – "open", "pending", or "resolved" (required)
- `startDate` (DD/MM/YYYY) – Optional start date
- `endDate` (DD/MM/YYYY) – Optional end date

**Example:**
```json
{
  "status": "open",
  "startDate": "15/01/2025",
  "endDate": "21/01/2025"
}
```

### 4. `search_tickets_by_customer`
Finds tickets associated with a specific customer.

**Parameters:**
- `customerIdentifier` (string) – Customer email or Intercom ID (required)
- `startDate` (DD/MM/YYYY) – Optional start date
- `endDate` (DD/MM/YYYY) – Optional end date

**Example:**
```json
{
  "customerIdentifier": "customer@example.com",
  "startDate": "15/01/2025",
  "endDate": "21/01/2025"
}
```

## Configuration with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "intercom-mcp": {
      "command": "intercom-mcp",
      "args": [],
      "env": {
        "INTERCOM_ACCESS_TOKEN": "your_intercom_api_token"
      }
    }
  }
}
```

## Implementation Notes

For detailed technical information about how this server integrates with Intercom's API, see `src/services/INTERCOM_API_NOTES.md`. This document explains our parameter mapping, Intercom endpoint usage, and implementation details for developers.

## Development

```bash
# Clone and install dependencies
git clone https://github.com/raoulbia-ai/mcp-server-for-intercom.git
cd mcp-server-for-intercom
npm install

# Build and run for development
npm run build
npm run dev

# Run tests
npm test
```

## Disclaimer

This project is an independent integration and is not affiliated with, officially connected to, or endorsed by Intercom Inc. "Intercom" is a registered trademark of Intercom Inc.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.