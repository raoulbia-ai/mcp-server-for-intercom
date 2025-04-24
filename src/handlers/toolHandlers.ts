import { ListConversationsArgumentsSchema, SearchConversationsByCustomerSchema, SearchTicketsByCustomerSchema, SearchTicketsByStatusSchema, getDefaultDateRange } from "../types/schemas.js";
import { IntercomService } from "../services/intercomService.js";
import { Ticket } from "../types/intercom.js";

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
     * Formats the response in MCP-compliant format
     */
    private formatResponse(tickets: Ticket[]) {
        return {
            content: [{ 
                type: "text", 
                text: JSON.stringify({
                    result: tickets.map(ticket => ({
                        ...ticket,
                        // Ensure proper timestamp format in response
                        created_at: new Date(ticket.created_at).toISOString(),
                        // Ensure each conversation entry has the correct structure
                        conversation: ticket.conversation.map(message => ({
                            from: message.from,
                            text: message.text,
                            timestamp: new Date(message.timestamp).toISOString()
                        }))
                    }))
                }, null, 2)
            }]
        };
    }
    
    /**
     * Formats an error response in MCP-compliant format
     */
    private formatErrorResponse(error: unknown, customMessage?: string) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const displayMessage = customMessage || errorMessage;
        
        return {
            content: [{ 
                type: "text", 
                text: JSON.stringify({
                    error: displayMessage
                }, null, 2)
            }]
        };
    }

    /**
     * Handles the search_conversations_by_customer tool request
     * Searches for conversations by customer email or ID with optional date filtering
     */
    async handleSearchConversationsByCustomer(args: unknown) {
        try {
            console.error("Handling search_conversations_by_customer request");
            
            // Validate and parse arguments
            const validatedArgs = SearchConversationsByCustomerSchema.parse(args);
            
            const customerIdentifier = validatedArgs.customerIdentifier;
            const startDateStr = validatedArgs.startDate;
            const endDateStr = validatedArgs.endDate;
            const keywords = validatedArgs.keywords;
            
            // Create Intercom service and retrieve conversations
            const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
            const conversations = await intercomService.getConversationsByCustomer(
                customerIdentifier,
                startDateStr,
                endDateStr,
                keywords
            );
            
            console.error(`Retrieved ${conversations.length} conversations for customer: ${customerIdentifier}`);
            
            return this.formatResponse(conversations);
        } catch (error) {
            console.error('Error handling search_conversations_by_customer:', error);
            
            // Enhanced error message for validation errors
            if (error instanceof Error && error.message.includes("customerIdentifier")) {
                return this.formatErrorResponse(error, 
                    `${error.message}\n\nPlease provide a valid customer email or ID, and optional dates in DD/MM/YYYY format (e.g., 15/01/2025)`
                );
            }
            
            return this.formatErrorResponse(error);
        }
    }

    /**
     * Handles the search_tickets_by_status tool request
     * Searches for tickets by status (open, pending, resolved) with optional date filtering
     */
    async handleSearchTicketsByStatus(args: unknown) {
        try {
            console.error("Handling search_tickets_by_status request");
            
            // Validate and parse arguments
            const validatedArgs = SearchTicketsByStatusSchema.parse(args);
            
            const status = validatedArgs.status;
            const startDateStr = validatedArgs.startDate;
            const endDateStr = validatedArgs.endDate;
            
            // Create Intercom service and retrieve tickets
            const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
            const tickets = await intercomService.getTicketsByStatus(
                status,
                startDateStr,
                endDateStr
            );
            
            console.error(`Retrieved ${tickets.length} tickets with status: ${status}`);
            
            return this.formatResponse(tickets);
        } catch (error) {
            console.error('Error handling search_tickets_by_status:', error);
            
            // Enhanced error message for validation errors
            if (error instanceof Error && error.message.includes("status")) {
                return this.formatErrorResponse(error, 
                    `${error.message}\n\nPlease provide a valid status (open, pending, or resolved), and optional dates in DD/MM/YYYY format (e.g., 15/01/2025)`
                );
            }
            
            return this.formatErrorResponse(error);
        }
    }

    /**
     * Handles the search_tickets_by_customer tool request
     * Searches for tickets by customer email or ID with optional date filtering
     */
    async handleSearchTicketsByCustomer(args: unknown) {
        try {
            console.error("Handling search_tickets_by_customer request");
            
            // Validate and parse arguments
            const validatedArgs = SearchTicketsByCustomerSchema.parse(args);
            
            const customerIdentifier = validatedArgs.customerIdentifier;
            const startDateStr = validatedArgs.startDate;
            const endDateStr = validatedArgs.endDate;
            
            // Create Intercom service and retrieve tickets
            const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
            const tickets = await intercomService.getTicketsByCustomer(
                customerIdentifier,
                startDateStr,
                endDateStr
            );
            
            console.error(`Retrieved ${tickets.length} tickets for customer: ${customerIdentifier}`);
            
            return this.formatResponse(tickets);
        } catch (error) {
            console.error('Error handling search_tickets_by_customer:', error);
            
            // Enhanced error message for validation errors
            if (error instanceof Error && error.message.includes("customerIdentifier")) {
                return this.formatErrorResponse(error, 
                    `${error.message}\n\nPlease provide a valid customer email or ID, and optional dates in DD/MM/YYYY format (e.g., 15/01/2025)`
                );
            }
            
            return this.formatErrorResponse(error);
        }
    }

    async handleListConversations(args: unknown) {
        try {
            console.error("Handling list_conversations request");
            
            // Validate and parse arguments
            const validatedArgs = ListConversationsArgumentsSchema.parse(args);
            
            const startDateStr = validatedArgs.startDate;
            const endDateStr = validatedArgs.endDate;
            const keyword = validatedArgs.keyword;
            const exclude = validatedArgs.exclude;
            
            // Create Intercom service and retrieve conversations
            const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
            const conversations = await intercomService.getConversations(
                startDateStr, 
                endDateStr, 
                keyword, 
                exclude
            );
            
            console.error(`Retrieved ${conversations.length} conversations within date range`);
            
            return this.formatResponse(conversations);
        } catch (error) {
            console.error('Error handling list_conversations:', error);
            
            // Enhanced error message for validation errors
            if (error instanceof Error && (error.message.includes("startDate") || error.message.includes("endDate"))) {
                return this.formatErrorResponse(error, 
                    `${error.message}\n\nPlease provide both startDate and endDate in DD/MM/YYYY format (e.g., 15/01/2025)`
                );
            }
            
            return this.formatErrorResponse(error);
        }
    }
}
