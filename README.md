# MCP Server for Intercom

<a href="https://glama.ai/mcp/servers/@raoulbia-ai/mcp-server-for-intercom">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@raoulbia-ai/mcp-server-for-intercom/badge" />
</a>

An MCP-compliant server for retrieving customer support tickets from Intercom. This tool enables AI assistants like Claude Desktop and Cline to access and analyze your Intercom support tickets.

## Features

- Retrieve all support tickets and conversations with full history
- Filter by customer, status, date range, and keywords
- Search tickets and conversations by multiple criteria
- Automatic pagination for handling large volumes of data
- Seamless integration with MCP-compliant AI assistants

## Disclaimer

This project is an independent integration and is not affiliated with, officially connected to, or endorsed by Intercom Inc. "Intercom" is a registered trademark of Intercom Inc.

## Compliance with Intercom Developer Terms

This project is designed to comply with Intercom's developer terms of service by:

- **Securing API Tokens**: Ensuring Intercom API tokens are kept confidential and secure
- **Responsible Data Handling**: Accessing and storing user data responsibly
- **Limited Scope**: Only implementing necessary functionality to retrieve ticket data
- **Transparency**: Clearly documenting data usage and application features

Users of this integration should review Intercom's [Developer Terms](https://developers.intercom.com/docs/publish-to-the-app-store/intercom-developer-terms) to ensure their implementation complies with all requirements.

## Implementation Notes

### Intercom API Compatibility

When using this service, be aware of the following Intercom API considerations:

1. **Email vs ID Resolution**:
   - The `customerIdentifier` parameter accepts either an email or an Intercom contact ID
   - Internally, emails are resolved to contact IDs before querying the Intercom API
   - This two-step process is required as Intercom's API does not support direct email queries

2. **Date Format Handling**:
   - While the MCP tools accept dates in DD/MM/YYYY format for user convenience
   - Intercom's API requires UNIX timestamps for date filtering
   - All dates are automatically converted before making API requests

3. **Status Mapping**:
   - The `pending` status in our API maps to Intercom's `snoozed` state
   - The `resolved` status maps to Intercom's `closed` state

4. **Content Filtering**:
   - Keyword filtering uses Intercom's `source.body` with the `~` (contains) operator
   - Exclusion filtering uses the `!~` (does not contain) operator
   - Multiple keywords are implemented as OR conditions

5. **Pagination**:
   - For large result sets (>150 items), automatic pagination is implemented
   - The service uses Intercom's cursor-based pagination with the `starting_after` parameter

See `src/services/INTERCOM_API_NOTES.md` for detailed technical implementation notes.

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- An Intercom account with API access

### Quick Start

1. Install the package globally:
   ```
   npm install -g mcp-server-for-intercom
   ```

2. Set your Intercom API token:
   ```
   # For Linux/Mac
   export INTERCOM_ACCESS_TOKEN="your_token_here"
   
   # For Windows Command Prompt
   set INTERCOM_ACCESS_TOKEN=your_token_here
   
   # For PowerShell
   $env:INTERCOM_ACCESS_TOKEN = "your_token_here"
   ```

3. Run the server:
   ```
   intercom-mcp
   ```

## Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/raoulbia-ai/mcp-server-for-intercom.git
   cd mcp-server-for-intercom
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Set your Intercom API token as an environment variable (see above)

5. Run the server in development mode:
   ```
   npm run dev
   ```

## Testing

Run tests with:
```
npm test
```

Run tests in watch mode:
```
npm run test:watch
```

## Using Docker

You can run the MCP server using Docker:

### Prerequisites

- Docker installed on your system
- Intercom API access token

### Building and Running

1. Build the Docker image:
   ```bash
   docker build -t mcp-server .
   ```

2. Run the container:
   ```bash
   docker run --rm -it -e INTERCOM_ACCESS_TOKEN="your_actual_api_key_here" mcp-server
   ```
   Replace `"your_actual_api_key_here"` with your actual Intercom access token.

### Managing the Container

- To list running containers:
  ```bash
  docker ps
  ```

- To stop a running container:
  ```bash
  docker stop <container_id_or_name>
  ```
  Replace `<container_id_or_name>` with the actual Container ID or Name from `docker ps`.

### Important Notes

- The container uses stdio (standard input/output) for MCP communication, not HTTP
- This server is designed to be used by MCP-compatible LLM systems (like Claude Desktop or Cline)
- The `--rm` flag in the run command automatically removes the container when it stops
- No port mapping is needed as the server communicates via stdin/stdout

## Using the MCP Inspector

The MCP Inspector is a useful tool for debugging and testing your MCP server implementation. It provides a web interface to interact with your server and visualize the requests and responses.

### Installation

The MCP Inspector is available as an npm package:

```bash
npm install -g @modelcontextprotocol/inspector
```

### Running the Inspector

To inspect your MCP server, use the following command:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

This will:
1. Start your MCP server
2. Launch a web interface (typically at http://localhost:3000)
3. Allow you to send requests and view responses

### Important Notes

- When using the inspector with this server, you must prefix the command with `node` as shown above
- Make sure your environment variables (like `INTERCOM_ACCESS_TOKEN`) are set properly
- The web interface lets you:
  - View available tools
  - Send test requests
  - Debug response formatting
  - Monitor request/response flow

The inspector is particularly helpful when:
- Implementing new tools
- Debugging parameter handling issues
- Testing date format validation
- Verifying error messages

## API Reference

## Available MCP Tools

This MCP server exposes the following tools for interacting with Intercom:

### 1. `list_conversations`

Retrieves all conversations within a specific date range with optional content filtering.

**Request Parameters:**
- `startDate` (DD/MM/YYYY format) – The start date for conversation retrieval (required)
- `endDate` (DD/MM/YYYY format) – The end date for conversation retrieval (required)
- `keyword` (string) – Optional filter to only include conversations containing this text
- `exclude` (string) – Optional filter to exclude conversations containing this text

**Important Notes:**
- Date range must not exceed 7 days
- Both startDate and endDate are required
- Dates must use the DD/MM/YYYY format (e.g., "15/01/2025")

**Example Request:**
```json
{
  "startDate": "15/01/2025",
  "endDate": "21/01/2025",
  "keyword": "billing"
}
```

### 2. `search_conversations_by_customer`

Finds conversations for a specific customer with optional date and content filtering.

**Request Parameters:**
- `customerIdentifier` (string) – Customer email or Intercom ID (required)
- `startDate` (DD/MM/YYYY format) – Optional start date for filtering
- `endDate` (DD/MM/YYYY format) – Optional end date for filtering
- `keywords` (array) – Optional array of keywords to filter conversations by content

**Example Request:**
```json
{
  "customerIdentifier": "customer@example.com",
  "startDate": "15/01/2025",
  "endDate": "21/01/2025",
  "keywords": ["billing", "refund"]
}
```

### 3. `search_tickets_by_status`

Retrieves tickets by their status with optional date filtering.

**Request Parameters:**
- `status` (string) – Status to search for: "open", "pending", or "resolved" (required)
- `startDate` (DD/MM/YYYY format) – Optional start date for filtering
- `endDate` (DD/MM/YYYY format) – Optional end date for filtering

**Example Request:**
```json
{
  "status": "open",
  "startDate": "15/01/2025",
  "endDate": "21/01/2025"
}
```

### 4. `search_tickets_by_customer`

Finds tickets associated with a specific customer with optional date filtering.

**Request Parameters:**
- `customerIdentifier` (string) – Customer email or Intercom ID (required)
- `startDate` (DD/MM/YYYY format) – Optional start date for filtering
- `endDate` (DD/MM/YYYY format) – Optional end date for filtering

**Example Request:**
```json
{
  "customerIdentifier": "customer@example.com",
  "startDate": "15/01/2025",
  "endDate": "21/01/2025"
}
```

**Response Format (all tools):**
```json
{
  "result": [
    {
      "ticket_id": "12345",
      "subject": "Billing Issue",
      "status": "resolved",
      "created_at": "2024-03-06T10:15:00Z",
      "conversation": [
        {
          "from": "customer",
          "text": "Hey, I was double charged!",
          "timestamp": "2024-03-06T10:15:00Z"
        },
        {
          "from": "support_agent",
          "text": "We've refunded the duplicate charge.",
          "timestamp": "2024-03-06T10:45:00Z"
        }
      ]
    }
  ]
}
```

## Usage with Claude Desktop

To integrate the MCP Server for Intercom with Claude Desktop:

1. **Get API Tokens**: Ensure you have an Intercom API token. You can obtain this from your Intercom account settings.

2. **Configure Claude Desktop**:
   Add the following configuration to your `claude_desktop_config.json` file:

   ```
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

   Replace `"your_intercom_api_token"` with your actual Intercom API token.

## Using a Local Development Version

If you've cloned the repository and want to run a local version of the MCP Server for Intercom:

1. **Clone the Repository**:
   ```
   git clone https://github.com/raoulbia-ai/mcp-server-for-intercom.git
   cd mcp-server-for-intercom
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Build the Project**:
   ```
   npm run build
   ```

4. **Configure Claude Desktop**:
   Add the following configuration to your `claude_desktop_config.json` file:

   ```
   {
     "mcpServers": {
       "intercom-mcp-local": {
         "command": "npm",
         "args": ["run", "dev"],
         "env": {
           "INTERCOM_ACCESS_TOKEN": "your_intercom_api_token",
           "NODE_ENV": "development"
         },
         "cwd": "/path/to/your/mcp-server-for-intercom"
       }
     }
   }
   ```

   Replace `"your_intercom_api_token"` with your actual Intercom API token and `"/path/to/your/mcp-server-for-intercom"` with the path to your cloned repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contact and Support
For questions, feature requests, or bug reports, please open an issue in the [Issues](https://github.com/raoulbia-ai/mcp-server-for-intercom/issues) section of this repository.
You can also reach out to me directly via my [GitHub profile](https://github.com/raoulbia-ai).

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details. The Apache License 2.0 provides additional protections including patent grants, trademark protection, and modification notices, making it ideal for open-source projects that require more comprehensive legal safeguards.
