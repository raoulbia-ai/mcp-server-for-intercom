import { ListTicketsArgumentsSchema } from "../types/schemas.js";
import { IntercomService } from "../services/intercomService.js";

export class ToolHandlers {
    private readonly API_BASE_URL: string;
    private readonly authToken: string;

    constructor(apiBaseUrl: string, authToken: string) {
        this.API_BASE_URL = apiBaseUrl;
        this.authToken = authToken;
    }

    /**
     * Handles the list_tickets tool request
     * Retrieves all tickets with conversation history from Intercom
     */
    async handleListTickets(args: unknown) {
        try {
            console.log("Handling list_tickets request with args:", JSON.stringify(args));
            
            // Validate and parse arguments
            const validatedArgs = ListTicketsArgumentsSchema.parse(args);
            console.log(`Using cutoff date: ${validatedArgs.cutoffDate}`);
            
            // Create Intercom service
            console.log("Initializing Intercom service...");
            const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
            
            // Get tickets with conversation history
            console.log("Retrieving tickets from Intercom...");
            const tickets = await intercomService.getTickets(validatedArgs.cutoffDate);
            
            console.log(`Successfully retrieved ${tickets.length} tickets`);
            
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
            console.error('Error handling list_tickets:', error);
            
            // Return error in MCP-compliant format
            return {
                content: [{ 
                    type: "error", 
                    text: error instanceof Error 
                        ? error.message 
                        : "Unknown error processing list_tickets request" 
                }]
            };
        }
    }
}