import { ListTicketsArgumentsSchema, getDefaultDateRange } from "../types/schemas.js";
import { IntercomService } from "../services/intercomService.js";

export class ToolHandlers {
    private readonly API_BASE_URL: string;
    private readonly authToken: string;

    constructor(apiBaseUrl: string, authToken: string) {
        if (!apiBaseUrl || typeof apiBaseUrl !== 'string' || !apiBaseUrl.trim()) {
            throw new Error('Invalid API base URL: API base URL is required');
        }
        
        if (!authToken || typeof authToken !== 'string' || !authToken.trim()) {
            throw new Error('Invalid authentication token: Auth token is required');
        }
        
        this.API_BASE_URL = apiBaseUrl;
        this.authToken = authToken;
    }

    /**
     * Handles the list_tickets tool request
     * Retrieves all tickets with conversation history from Intercom
     * using the simplified DD/MM/YYYY date format approach
     */
    async handleListTickets(args: unknown) {
        try {
            console.error("Handling list_tickets request with args:", JSON.stringify(args));
            
            // Log raw arguments for debugging
            console.error("Raw arguments:", JSON.stringify(args, null, 2));
            
            try {
                // Validate and parse arguments - this will now enforce DD/MM/YYYY format and convert to ISO
                const validatedArgs = ListTicketsArgumentsSchema.parse(args);
                console.error("Validated arguments:", JSON.stringify(validatedArgs, null, 2));
                
                // The startDate and endDate are now required and validated in the schema
                const startDateStr = validatedArgs.startDate;
                const endDateStr = validatedArgs.endDate;
                
                console.error(`Using date range: ${startDateStr} to ${endDateStr}`);
                
                if (validatedArgs.keyword) {
                    console.error(`Using keyword filter: ${validatedArgs.keyword}`);
                }
                
                if (validatedArgs.exclude) {
                    console.error(`Using exclusion filter: ${validatedArgs.exclude}`);
                }
                
                // Create Intercom service
                console.error("Initializing Intercom service...");
                const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
                
                // Get tickets with conversation history
                console.error("Retrieving tickets from Intercom...");
                const tickets = await intercomService.getTickets(
                    startDateStr, 
                    endDateStr, 
                    validatedArgs.keyword, 
                    validatedArgs.exclude
                );
                
                console.error(`Successfully retrieved ${tickets.length} tickets`);
                
                // Return in the MCP-compliant format with content array
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            result: tickets.map(ticket => ({
                                ...ticket,
                                // Ensure proper timestamp format in response
                                created_at: new Date(ticket.created_at).toISOString(),
                                // Ensure each conversation entry has the correct structure
                                conversation: ticket.conversation.map(msg => ({
                                    from: msg.from,
                                    text: msg.text,
                                    timestamp: new Date(msg.timestamp).toISOString()
                                }))
                            }))
                        }, null, 2)
                    }]
                };
            } catch (error) {
                // Handle specific validation errors with clear messages
                const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
                console.error('Validation error:', errorMessage);
                
                // For Zod validation errors, add clearer instructions
                const dateFormatInstructions = "Please provide both startDate and endDate in DD/MM/YYYY format (e.g., 15/01/2025)";
                
                return {
                    content: [{ 
                        type: "error", 
                        text: `${errorMessage}\n\n${dateFormatInstructions}`
                    }]
                };
            }
        } catch (error) {
            console.error('Error handling list_tickets:', error);
            
            // Return error in MCP-compliant format
            return {
                content: [{ 
                    type: "error", 
                    text: error instanceof Error 
                        ? error.message 
                        : "Unknown error processing list_tickets request. Please provide dates in DD/MM/YYYY format."
                }]
            };
        }
    }
}