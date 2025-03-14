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
Retrieves Intercom support tickets within a specific date range. Dates MUST be provided in DD/MM/YYYY format.

REQUIRED DATE FORMAT:
- You MUST always use DD/MM/YYYY format for dates (e.g., "15/01/2025" for January 15, 2025)
- Both startDate and endDate parameters are REQUIRED
- If a user asks for tickets without specifying exact dates, you MUST prompt them for specific dates
- DO NOT attempt to convert date ranges automatically - ask the user for specific dates

REQUIRED DATE PARAMETERS:
- startDate: Start date in DD/MM/YYYY format (e.g., "15/01/2025")
- endDate: End date in DD/MM/YYYY format (e.g., "21/01/2025")

STRICT LIMITATIONS:
- Date range MUST NOT exceed 7 days
- Dates must be in DD/MM/YYYY format
- Both startDate and endDate must be provided

Optional Content Filter Parameters (use ONLY when explicitly mentioned in the request):
- keyword: Text to filter tickets by content
  ONLY use this when the request explicitly mentions searching for specific terms
- exclude: Text to filter out from results
  ONLY use this when the request explicitly mentions excluding specific terms

IMPORTANT: ASK FOR SPECIFIC DATES
When a user makes vague date requests like:
- "Show me tickets from last week"
- "Look at January 2025 week 3"
- "Get support tickets from yesterday"

YOU MUST respond with a prompt like:
"To retrieve those tickets, I need specific dates in DD/MM/YYYY format. 
What start and end dates would you like to use? For example, for last week,
I could use 05/03/2025 to 11/03/2025."

EXAMPLES:

User: "Show me tickets from last week"
You: "To retrieve tickets from last week, I need specific dates in DD/MM/YYYY format. 
Would you like me to use 05/03/2025 to 11/03/2025 for last week?"

User: "Yes, that works"
Your request:
{
  "startDate": "05/03/2025",
  "endDate": "11/03/2025"
}

User: "Look at January 2025 week 3"
You: "To retrieve tickets from the third week of January 2025, I need specific dates 
in DD/MM/YYYY format. Would you like me to use 15/01/2025 to 21/01/2025?"

User: "Find billing issues from the first week of March"
You: "To find billing issues from the first week of March, I need specific dates 
in DD/MM/YYYY format. Would you like me to use 01/03/2025 to 07/03/2025? 
Also, I'll include 'billing' as a keyword filter."

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
                        required: ["startDate", "endDate"],
                        properties: {
                            startDate: {
                                type: "string",
                                description: "Start date in DD/MM/YYYY format (e.g., '15/01/2025' for January 15, 2025). This parameter is REQUIRED."
                            },
                            endDate: {
                                type: "string",
                                description: "End date in DD/MM/YYYY format (e.g., '21/01/2025' for January 21, 2025). This parameter is REQUIRED."
                            },
                            keyword: {
                                type: "string",
                                description: "Optional keyword to filter tickets. Only returns tickets where the subject or body contains this keyword."
                            },
                            exclude: {
                                type: "string",
                                description: "Optional exclusion filter. Excludes tickets where the subject or body contains this text."
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