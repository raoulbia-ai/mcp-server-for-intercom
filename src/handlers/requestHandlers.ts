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
                    name: "list_tickets",
                    description: `WHEN TO USE:
- When retrieving customer support tickets from Intercom
- When analyzing conversation history between customers and support agents
- When examining ticket statuses and resolution paths
- When reviewing recent customer inquiries
- When analyzing support team performance and response times
- When needing to search through historical customer issues

Tool Description:
Retrieves all support tickets (open and closed) with full conversation history from Intercom.

Optional parameters:
- cutoffDate: ISO format date (e.g., "2024-01-01T00:00:00Z")
  Only returns tickets created after this date
  Defaults to January 1st of the current year if not specified

How filtering works:
- The server retrieves all conversations from Intercom
- Only tickets created on or after the cutoffDate are included
- This allows for efficient filtering without hitting API limits

Example usage:
{
  "cutoffDate": "2024-02-01T00:00:00Z"
}

Response format:
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
}`,
                    inputSchema: {
                        type: "object",
                        properties: {
                            cutoffDate: {
                                type: "string",
                                description: "ISO format date (e.g., '2024-01-01T00:00:00Z'). Only returns tickets created after this date. Defaults to January 1st of the current year if not specified."
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
                case "list_tickets":
                    console.error("Handling list_tickets request");
                    return await toolHandlers.handleListTickets(args);
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