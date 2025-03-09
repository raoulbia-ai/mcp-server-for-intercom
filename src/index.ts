import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { setApiBaseUrl, setServerConfig } from "./config/serverConfig.js";
import { setupRequestHandlers } from "./handlers/requestHandlers.js";
import { ToolHandlers } from "./handlers/toolHandlers.js";
import { SecureStdioTransport } from "./services/transportService.js";

/**
 * Main entry point for the Intercom MCP Server
 * Initializes the server with proper configuration and connects transport
 */
async function main() {
    try {
        console.log("Starting Intercom MCP Server...");
        
        const transport = new SecureStdioTransport();
        const server = new Server(
            {
                name: "mcp-server-for-intercom",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        // Configure server with Intercom API credentials
        const API_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
        const CONFIGURED_API_URL = process.env.INTERCOM_API_BASE_URL;
        const API_BASE_URL = CONFIGURED_API_URL || "https://api.intercom.io";

        if (CONFIGURED_API_URL) {
            console.log(`Using custom Intercom API URL: ${CONFIGURED_API_URL}`);
            setApiBaseUrl(CONFIGURED_API_URL);
        } else {
            console.log(`Using default Intercom API URL: ${API_BASE_URL}`);
        }

        if (API_TOKEN) {
            console.log("Intercom access token found");
            setServerConfig({ authToken: API_TOKEN });
        } else {
            console.warn('WARNING: INTERCOM_ACCESS_TOKEN environment variable not set. API calls will fail.');
            console.log('Please set the INTERCOM_ACCESS_TOKEN environment variable with your Intercom API token.');
            console.log('Example: export INTERCOM_ACCESS_TOKEN="your_token_here"');
        }

        // Create tool handlers instance
        const toolHandlers = new ToolHandlers(API_BASE_URL, API_TOKEN || "");

        // Setup request handlers
        setupRequestHandlers(server, toolHandlers);

        // Connect transport
        console.log("Connecting MCP transport...");
        await server.connect(transport);
        
        console.log('✅ Intercom MCP Server started successfully and ready to process requests.');
        console.log('The server provides the following MCP tools:');
        console.log('- list_tickets: Retrieves all support tickets with conversation history');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('❌ Server failed to start:', errorMessage);
        process.exit(1);
    }
}

main();