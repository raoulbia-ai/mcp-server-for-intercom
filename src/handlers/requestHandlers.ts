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
                    description: `WHEN TO USE:
- When you need to find conversations for a specific customer
- When analyzing communication history with a particular customer
- When investigating customer-specific issues or patterns
- When retrieving all support interactions for a customer

Tool Description:
Searches for conversations by customer email or ID with optional date filtering.

REQUIRED PARAMETER:
- customerIdentifier: Customer email or ID to search for

OPTIONAL DATE PARAMETERS (in DD/MM/YYYY format):
- startDate: Optional start date to filter conversations (e.g., "15/01/2025")
- endDate: Optional end date to filter conversations (e.g., "21/01/2025")

Response format:
{
  "result": [
    {
      "ticket_id": "12345",
      "subject": "Account Access Issue",
      "status": "resolved",
      "created_at": "2024-03-06T10:15:00Z",
      "conversation": [
        {
          "from": "customer",
          "text": "I can't log into my account",
          "timestamp": "2024-03-06T10:15:00Z"
        },
        {
          "from": "support_agent",
          "text": "I've reset your password, please check your email",
          "timestamp": "2024-03-06T10:45:00Z"
        }
      ]
    }
  ]
}`,
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
                },
                {
                    name: "search_tickets_by_status",
                    description: `WHEN TO USE:
- When you need to find tickets with a specific status (open, pending, resolved)
- When analyzing support workload by ticket status
- When tracking resolution rates and open issues
- When monitoring pending tickets that need attention

Tool Description:
Searches for tickets by status (open, pending, resolved) with optional date filtering.
This tool uses the actual Intercom tickets API, not conversations.

REQUIRED PARAMETER:
- status: Ticket status to search for (must be one of: open, pending, resolved)

OPTIONAL DATE PARAMETERS (in DD/MM/YYYY format):
- startDate: Optional start date to filter tickets (e.g., "15/01/2025")
- endDate: Optional end date to filter tickets (e.g., "21/01/2025")

Response format:
{
  "result": [
    {
      "ticket_id": "12345",
      "subject": "Account Access Issue",
      "status": "open",
      "created_at": "2024-03-06T10:15:00Z",
      "conversation": [
        {
          "from": "customer",
          "text": "I can't log into my account",
          "timestamp": "2024-03-06T10:15:00Z"
        },
        {
          "from": "support_agent",
          "text": "I'm looking into this for you",
          "timestamp": "2024-03-06T10:45:00Z"
        }
      ]
    }
  ]
}`,
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
                    description: `WHEN TO USE:
- When retrieving customer support conversations from Intercom (Note: This retrieves conversations, not tickets)
- When analyzing conversation history between customers and support agents
- When examining ticket statuses and resolution paths
- When reviewing recent customer inquiries
- When analyzing support team performance and response times
- When needing to search through historical customer issues

Tool Description:
Retrieves Intercom conversations within a specific date range. Dates MUST be provided in DD/MM/YYYY format.

REQUIRED DATE FORMAT:
- You MUST always use DD/MM/YYYY format for dates (e.g., "15/01/2025" for January 15, 2025)
- Both startDate and endDate parameters are REQUIRED
- If a user asks for conversations without specifying exact dates, you MUST prompt them for specific dates
- DO NOT attempt to convert date ranges automatically - ask the user for specific dates

REQUIRED DATE PARAMETERS:
- startDate: Start date in DD/MM/YYYY format (e.g., "15/01/2025")
- endDate: End date in DD/MM/YYYY format (e.g., "21/01/2025")

STRICT LIMITATIONS:
- Date range MUST NOT exceed 7 days
- Dates must be in DD/MM/YYYY format
- Both startDate and endDate must be provided

Optional Content Filter Parameters (use ONLY when explicitly mentioned in the request):
- keyword: Text to filter conversations by content
  ONLY use this when the request explicitly mentions searching for specific terms
- exclude: Text to filter out from results
  ONLY use this when the request explicitly mentions excluding specific terms

IMPORTANT: ASK FOR SPECIFIC DATES
When a user makes vague date requests like:
- "Show me conversations from last week"
- "Look at January 2025 week 3"
- "Get support conversations from yesterday"

YOU MUST respond with a prompt like:
"To retrieve those conversations, I need specific dates in DD/MM/YYYY format. 
What start and end dates would you like to use? For example, for last week,
I could use 05/03/2025 to 11/03/2025."

EXAMPLES:

User: "Show me conversations from last week"
You: "To retrieve conversations from last week, I need specific dates in DD/MM/YYYY format. 
Would you like me to use 05/03/2025 to 11/03/2025 for last week?"

User: "Yes, that works"
Your request:
{
  "startDate": "05/03/2025",
  "endDate": "11/03/2025"
}

User: "Look at January 2025 week 3"
You: "To retrieve conversations from the third week of January 2025, I need specific dates 
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
                                description: "Optional keyword to filter conversations. Only returns conversations where the subject or body contains this keyword."
                            },
                            exclude: {
                                type: "string",
                                description: "Optional exclusion filter. Excludes conversations where the subject or body contains this text."
                            }
                        }
                    },
                },
                {
                    name: "search_tickets_by_customer",
                    description: `WHEN TO USE:
- When you need to find tickets for a specific customer
- When analyzing a customer's support history
- When investigating customer-specific issues
- When retrieving all support tickets for a customer

Tool Description:
Searches for tickets by customer email or ID with optional date filtering.

REQUIRED PARAMETER:
- customerIdentifier: Customer email or ID to search for

OPTIONAL DATE PARAMETERS (in DD/MM/YYYY format):
- startDate: Optional start date to filter tickets (e.g., "15/01/2025")
- endDate: Optional end date to filter tickets (e.g., "21/01/2025")

Response format:
{
  "result": [
    {
      "ticket_id": "12345",
      "subject": "Account Access Issue",
      "status": "resolved",
      "created_at": "2024-03-06T10:15:00Z",
      "conversation": [
        {
          "from": "customer",
          "text": "I can't log into my account",
          "timestamp": "2024-03-06T10:15:00Z"
        },
        {
          "from": "support_agent",
          "text": "I've reset your password, please check your email",
          "timestamp": "2024-03-06T10:45:00Z"
        }
      ]
    }
  ]
}`,
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
