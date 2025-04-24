import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandlers } from "./toolHandlers.js";

/**
 * Sets up the MCP request handlers for the Intercom server
 */
export function setupRequestHandlers(server: Server, toolHandlers: ToolHandlers) {
    // List Tools Handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        console.error("Received list_tools request");
        return {
            tools: [
                {
                    name: "search_conversations_by_customer",
                    description: `Searches for conversations by customer email or ID with optional date filtering.

Required: customerIdentifier (email/ID)
Optional: startDate, endDate (DD/MM/YYYY format)
Optional: keywords (array of terms to filter by)

Use when looking for conversation history with a specific customer.`,
                    inputSchema: {
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
                            },
                            keywords: {
                                type: "array",
                                items: { type: "string" },
                                description: "Optional keywords to filter conversations by content"
                            }
                        }
                    },
                },
                {
                    name: "search_tickets_by_status",
                    description: `Searches for tickets by status with optional date filtering.

Required: status (one of: open, pending, resolved)
Optional: startDate, endDate (DD/MM/YYYY format)

Use when analyzing support workload or tracking issue resolution.`,
                    inputSchema: {
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
                    },
                },
                {
                    name: "list_conversations",
                    description: `Retrieves Intercom conversations within a specific date range.

Required: startDate, endDate (DD/MM/YYYY format, max 7-day range)
Optional: keyword, exclude (for content filtering)

Always ask for specific dates when user makes vague time references.`,
                    inputSchema: {
                        type: "object",
                        required: ["startDate", "endDate"],
                        properties: {
                            startDate: {
                                type: "string",
                                description: "Start date in DD/MM/YYYY format (e.g., '15/01/2025'). Required."
                            },
                            endDate: {
                                type: "string",
                                description: "End date in DD/MM/YYYY format (e.g., '21/01/2025'). Required."
                            },
                            keyword: {
                                type: "string",
                                description: "Optional keyword to filter conversations by content."
                            },
                            exclude: {
                                type: "string",
                                description: "Optional exclusion filter for conversation content."
                            }
                        }
                    },
                },
                {
                    name: "search_tickets_by_customer",
                    description: `Searches for tickets by customer email or ID with optional date filtering.

Required: customerIdentifier (email/ID)
Optional: startDate, endDate (DD/MM/YYYY format) 

Use when analyzing a customer's support history.`,
                    inputSchema: {
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
                    },
                }
            ],
        };
    });

    // Call Tool Handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        console.error(`Received call_tool request for tool: ${name}`);
    
        try {
            switch (name) {
                case "list_conversations":
                    console.error("Handling list_conversations request");
                    return await toolHandlers.handleListConversations(args);
                case "search_conversations_by_customer":
                    console.error("Handling search_conversations_by_customer request");
                    return await toolHandlers.handleSearchConversationsByCustomer(args);
                case "search_tickets_by_status":
                    console.error("Handling search_tickets_by_status request");
                    return await toolHandlers.handleSearchTicketsByStatus(args);
                case "search_tickets_by_customer":
                    console.error("Handling search_tickets_by_customer request");
                    return await toolHandlers.handleSearchTicketsByCustomer(args);
                default:
                    console.error(`Error: Unknown tool "${name}"`);
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error) {
            console.error(`Error handling tool request "${name}":`, error);
            if (error instanceof Error) {
                throw new Error(
                    `Invalid arguments: ${error.message}`
                );
            }
            throw error;
        }
    });
}
