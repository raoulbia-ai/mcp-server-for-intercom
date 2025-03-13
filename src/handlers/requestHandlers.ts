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
Retrieves support tickets (open and closed) with full conversation history from Intercom with flexible date filtering and content filtering options.

Date Parameters (in order of precedence):
- startDate + endDate: Explicit date range using ISO format dates
  Example: startDate: "2025-02-01T00:00:00Z", endDate: "2025-02-07T00:00:00Z"
  Returns tickets created within this exact date range
  
  If only startDate is provided, endDate defaults to 7 days later
  If only endDate is provided, startDate defaults to 7 days earlier
  
- yyyymm: Year and month in format YYYYMM (e.g., "202502" for February 2025)
  Only returns tickets created during this month
  Used only if startDate/endDate not provided
  
- days: Number of recent days to include (e.g., 4 for tickets from the last 4 days)
  Value must be positive and no more than 90 days
  Used only if startDate/endDate and yyyymm not provided
  
Content Filter Parameters:
- keyword: Optional text to filter tickets by content
  Only returns tickets where the subject or message body contains this text
- exclude: Optional exclusion filter
  Excludes tickets where the subject or message body contains this text

How filtering works:
- The server retrieves conversations from Intercom for the specified date range
- All filtering (by date, keyword, and exclusions) happens server-side
- Each message in conversations is also filtered for keywords and exclusions

Example usage with explicit date range:
{
  "startDate": "2025-02-01T00:00:00Z",
  "endDate": "2025-02-07T00:00:00Z",
  "keyword": "billing"
}

Example usage with month filter:
{
  "yyyymm": "202502",
  "keyword": "billing",
  "exclude": "internal@company.com"
}

Example usage with days filter:
{
  "days": 4,
  "keyword": "billing"
}

Example usage with only startDate (endDate will default to 7 days later):
{
  "startDate": "2025-02-01T00:00:00Z",
  "keyword": "billing"
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
                            yyyymm: {
                                type: "string",
                                description: "Year and month in format YYYYMM (e.g., '202502' for February 2025). Only returns tickets created during this month. Defaults to current month if neither date parameter is specified."
                            },
                            days: {
                                type: "number",
                                description: "Number of recent days to include (e.g., 4 for tickets from the last 4 days). Value must be positive and no more than 90 days."
                            },
                            cutoffDate: {
                                type: "string",
                                description: "Legacy parameter - ISO format date (e.g., '2025-02-01T00:00:00Z'). Will be automatically converted to appropriate yyyymm or days parameter."
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