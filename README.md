# MCP Server for Intercom

An MCP-compliant server for retrieving customer support tickets from Intercom. This tool enables AI assistants like Claude Desktop and Cline to access and analyze your Intercom support tickets.

## Features

- Retrieve all support tickets (open and closed) with full conversation history
- Filter tickets by creation date
- Pagination support for handling large volumes of tickets
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

## API Reference

### `list_tickets`

Retrieves all support tickets with their conversation history.

**Request Parameters:**
- `CUTOFF_DATE` (ISO format date) – Only return tickets created after this date (optional)

**Response Format:**
```
{
  "result": [
    {
      "ticket_id": "12345",
      "subject": "Billing Issue",
      "status": "resolved",
      "created_at": "2024-03-06",
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