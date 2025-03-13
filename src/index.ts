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
        // Log to stderr instead of stdout to avoid interfering with the JSON-RPC protocol
        console.error("Starting Intercom MCP Server...");
        
        const transport = new SecureStdioTransport();
        const server = new Server(
            {
                name: "mcp-server-for-intercom",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {
                        list_tickets: {
                            description: "Retrieves support tickets (open and closed) with full conversation history from Intercom with flexible date filtering and content filtering options.",
                            parameters: {
                                type: "object",
                                properties: {
                                    startDate: {
                                        type: "string",
                                        description: "Start date in ISO format (e.g., '2025-02-01T00:00:00Z'). Used with endDate to specify an exact date range."
                                    },
                                    endDate: {
                                        type: "string",
                                        description: "End date in ISO format (e.g., '2025-02-07T00:00:00Z'). Used with startDate to specify an exact date range."
                                    },
                                    yyyymm: {
                                        type: "string",
                                        description: "Year and month in format YYYYMM (e.g., '202502' for February 2025). Only returns tickets created during this month. Defaults to current month if no date parameter is specified."
                                    },
                                    days: {
                                        type: "number",
                                        description: "Number of recent days to include (e.g., 4 for tickets from the last 4 days). Value must be positive and no more than 90 days."
                                    },
                                    keyword: {
                                        type: "string",
                                        description: "Optional keyword to filter tickets. Only returns tickets where the subject or body contains this keyword."
                                    },
                                    exclude: {
                                        type: "string",
                                        description: "Optional exclusion filter. Excludes tickets where the subject or body contains this text (e.g., email address for internal tickets)."
                                    }
                                }
                            }
                        }
                    },
                },
            }
        );

        // Configure server with Intercom API credentials
        const API_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
        const CONFIGURED_API_URL = process.env.INTERCOM_API_BASE_URL;
        const API_BASE_URL = CONFIGURED_API_URL || "https://api.intercom.io";

        if (CONFIGURED_API_URL) {
            console.error(`Using custom Intercom API URL: ${CONFIGURED_API_URL}`);
            setApiBaseUrl(CONFIGURED_API_URL);
        } else {
            console.error(`Using default Intercom API URL: ${API_BASE_URL}`);
        }

        if (!API_TOKEN) {
            console.error('ERROR: INTERCOM_ACCESS_TOKEN environment variable not set.');
            console.error('Please set the INTERCOM_ACCESS_TOKEN environment variable with your Intercom API token.');
            console.error('Example: export INTERCOM_ACCESS_TOKEN="your_token_here"');
            process.exit(1);
        }
        
        console.error("Intercom access token found");
        setServerConfig({ authToken: API_TOKEN });

        // Create tool handlers instance with validated credentials
        try {
            const toolHandlers = new ToolHandlers(API_BASE_URL, API_TOKEN);
            
            // Setup request handlers
            setupRequestHandlers(server, toolHandlers);
            
            // Connect transport
            console.error("Connecting MCP transport...");
            await server.connect(transport);
            
            console.error('✅ Intercom MCP Server started successfully and ready to process requests.');
            console.error('The server provides the following MCP tools:');
            console.error('- list_tickets: Retrieves support tickets for a specific month with filtering options');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('❌ Server failed to start:', errorMessage);
            process.exit(1);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('❌ Server failed to start:', errorMessage);
        process.exit(1);
    }
}

main();