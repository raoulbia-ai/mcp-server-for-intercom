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
                        search_conversations_by_customer: {
                            description: "Search for conversations by customer email or ID with optional date filtering.",
                            parameters: {
                                type: "object",
                                required: ["customerIdentifier"],
                                properties: {
                                    customerIdentifier: {
                                        type: "string",
                                        description: "Customer email or ID to search for"
                                    },
                                    startDate: {
                                        type: "string",
                                        description: "Optional start date in DD/MM/YYYY format (e.g., '15/01/2025')"
                                    },
                                    endDate: {
                                        type: "string",
                                        description: "Optional end date in DD/MM/YYYY format (e.g., '21/01/2025')"
                                    }
                                }
                            }
                        },
                        search_tickets_by_status: {
                            description: "Search for tickets by status (open, pending, resolved) with optional date filtering. Uses the actual Intercom tickets API.",
                            parameters: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: {
                                        type: "string",
                                        description: "Ticket status to search for (open, pending, or resolved)",
                                        enum: ["open", "pending", "resolved"]
                                    },
                                    startDate: {
                                        type: "string",
                                        description: "Optional start date in DD/MM/YYYY format (e.g., '15/01/2025')"
                                    },
                                    endDate: {
                                        type: "string",
                                        description: "Optional end date in DD/MM/YYYY format (e.g., '21/01/2025')"
                                    }
                                }
                            }
                        },
                        search_tickets_by_customer: {
                            description: "Search for tickets by customer email or ID with optional date filtering. Uses the actual Intercom tickets API.",
                            parameters: {
                                type: "object",
                                required: ["customerIdentifier"],
                                properties: {
                                    customerIdentifier: {
                                        type: "string",
                                        description: "Customer email or ID to search for"
                                    },
                                    startDate: {
                                        type: "string",
                                        description: "Optional start date in DD/MM/YYYY format (e.g., '15/01/2025')"
                                    },
                                    endDate: {
                                        type: "string",
                                        description: "Optional end date in DD/MM/YYYY format (e.g., '21/01/2025')"
                                    }
                                }
                            }
                        },
                        list_conversations: {
                            description: "Retrieves Intercom conversations within a date range using DD/MM/YYYY format dates (max 7 days). ALWAYS ask for specific dates when user makes vague time references.",
                            parameters: {
                                type: "object",
                                required: ["startDate", "endDate"],
                                properties: {
                                    startDate: {
                                        type: "string",
                                        description: "REQUIRED. Start date in DD/MM/YYYY format (e.g., '15/01/2025'). Must explicitly ask for specific dates when user makes vague time references."
                                    },
                                    endDate: {
                                        type: "string",
                                        description: "REQUIRED. End date in DD/MM/YYYY format (e.g., '21/01/2025'). Must be within 7 days of startDate to prevent excessive data retrieval."
                                    },
                                    keyword: {
                                        type: "string",
                                        description: "OPTIONAL. Only use when explicitly asked to search for specific terms."
                                    },
                                    exclude: {
                                        type: "string",
                                        description: "OPTIONAL. Only use when explicitly asked to exclude specific content."
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
            console.error('- search_conversations_by_customer: Search for conversations by customer email or ID with optional date filtering');
            console.error('- search_tickets_by_status: Search for tickets by status (open, pending, resolved) with optional date filtering');
            console.error('- search_tickets_by_customer: Search for tickets by customer email or ID with optional date filtering');
            console.error('- list_conversations: Retrieves conversations for a specific date range (DD/MM/YYYY format) with filtering options');
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
