import { ListConversationsArgumentsSchema, SearchConversationsByCustomerSchema, SearchTicketsByCustomerSchema, SearchTicketsByStatusSchema, getDefaultDateRange } from "../types/schemas.js";
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
     * Handles the search_conversations_by_customer tool request
     * Searches for conversations by customer email or ID with optional date filtering
     */
    async handleSearchConversationsByCustomer(args: unknown) {
        try {
            console.error("Handling search_conversations_by_customer request with args:", JSON.stringify(args));
            
            // Log raw arguments for debugging
            console.error("Raw arguments:", JSON.stringify(args, null, 2));
            
            try {
                // Validate and parse arguments
                const validatedArgs = SearchConversationsByCustomerSchema.parse(args);
                console.error("Validated arguments:", JSON.stringify(validatedArgs, null, 2));
                
                const customerIdentifier = validatedArgs.customerIdentifier;
                const startDateStr = validatedArgs.startDate;
                const endDateStr = validatedArgs.endDate;
                const keywords = validatedArgs.keywords;
                
                console.error(`Searching for conversations with customer: ${customerIdentifier}`);
                if (startDateStr) console.error(`Using start date: ${startDateStr}`);
                if (endDateStr) console.error(`Using end date: ${endDateStr}`);
                if (keywords && keywords.length > 0) console.error(`Filtering by keywords: ${keywords.join(', ')}`);
                
                // Create Intercom service
                console.error("Initializing Intercom service...");
                const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
                
                // Get conversations for this customer
                console.error("Retrieving conversations from Intercom...");
                const conversations = await intercomService.getConversationsByCustomer(
                    customerIdentifier,
                    startDateStr,
                    endDateStr,
                    keywords
                );
                
                console.error(`Successfully retrieved ${conversations.length} conversations`);
                
                // Return in the MCP-compliant format with content array
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            result: conversations.map(conversation => ({
                                ...conversation,
                                // Ensure proper timestamp format in response
                                created_at: new Date(conversation.created_at).toISOString(),
                                // Ensure each conversation entry has the correct structure
                                conversation: conversation.conversation.map(message => ({
                                    from: message.from,
                                    text: message.text,
                                    timestamp: new Date(message.timestamp).toISOString()
                                }))
                            }))
                        }, null, 2)
                    }]
                };
            } catch (error) {
                // Handle specific validation errors with clear messages
                const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
                console.error('Validation error:', errorMessage);
                
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            error: `${errorMessage}\n\nPlease provide a valid customer email or ID, and optional dates in DD/MM/YYYY format (e.g., 15/01/2025)`
                        }, null, 2)
                    }]
                };
            }
        } catch (error) {
            console.error('Error handling search_conversations_by_customer:', error);
            
            // Return error in MCP-compliant format
            return {
                content: [{ 
                    type: "text", 
                    text: JSON.stringify({
                        error: error instanceof Error 
                            ? error.message 
                            : "Unknown error processing search_conversations_by_customer request."
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Handles the search_tickets_by_status tool request
     * Searches for tickets by status (open, pending, resolved) with optional date filtering
     */
    async handleSearchTicketsByStatus(args: unknown) {
        try {
            console.error("Handling search_tickets_by_status request with args:", JSON.stringify(args));
            
            // Log raw arguments for debugging
            console.error("Raw arguments:", JSON.stringify(args, null, 2));
            
            try {
                // Validate and parse arguments
                const validatedArgs = SearchTicketsByStatusSchema.parse(args);
                console.error("Validated arguments:", JSON.stringify(validatedArgs, null, 2));
                
                const status = validatedArgs.status;
                const startDateStr = validatedArgs.startDate;
                const endDateStr = validatedArgs.endDate;
                
                console.error(`Searching for tickets with status: ${status}`);
                if (startDateStr) console.error(`Using start date: ${startDateStr}`);
                if (endDateStr) console.error(`Using end date: ${endDateStr}`);
                
                // Create Intercom service
                console.error("Initializing Intercom service...");
                const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
                
                // Get tickets with the specified status
                console.error("Retrieving tickets from Intercom...");
                const tickets = await intercomService.getTicketsByStatus(
                    status,
                    startDateStr,
                    endDateStr
                );
                
                console.error(`Successfully retrieved ${tickets.length} tickets with status: ${status}`);
                
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
                                conversation: ticket.conversation.map(message => ({
                                    from: message.from,
                                    text: message.text,
                                    timestamp: new Date(message.timestamp).toISOString()
                                }))
                            }))
                        }, null, 2)
                    }]
                };
            } catch (error) {
                // Handle specific validation errors with clear messages
                const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
                console.error('Validation error:', errorMessage);
                
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            error: `${errorMessage}\n\nPlease provide a valid status (open, pending, or resolved), and optional dates in DD/MM/YYYY format (e.g., 15/01/2025)`
                        }, null, 2)
                    }]
                };
            }
        } catch (error) {
            console.error('Error handling search_tickets_by_status:', error);
            
            // Return error in MCP-compliant format
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            error: error instanceof Error 
                                ? error.message 
                                : "Unknown error processing search_tickets_by_status request."
                        }, null, 2)
                    }]
                };
        }
    }

    /**
     * Handles the search_tickets_by_customer tool request
     * Searches for tickets by customer email or ID with optional date filtering
     */
    async handleSearchTicketsByCustomer(args: unknown) {
        try {
            console.error("Handling search_tickets_by_customer request with args:", JSON.stringify(args));
            
            // Log raw arguments for debugging
            console.error("Raw arguments:", JSON.stringify(args, null, 2));
            
            try {
                // Validate and parse arguments
                const validatedArgs = SearchTicketsByCustomerSchema.parse(args);
                console.error("Validated arguments:", JSON.stringify(validatedArgs, null, 2));
                
                const customerIdentifier = validatedArgs.customerIdentifier;
                const startDateStr = validatedArgs.startDate;
                const endDateStr = validatedArgs.endDate;
                
                console.error(`Searching for tickets with customer: ${customerIdentifier}`);
                if (startDateStr) console.error(`Using start date: ${startDateStr}`);
                if (endDateStr) console.error(`Using end date: ${endDateStr}`);
                
                // Create Intercom service
                console.error("Initializing Intercom service...");
                const intercomService = new IntercomService(this.API_BASE_URL, this.authToken);
                
                // Get tickets for this customer
                console.error("Retrieving tickets from Intercom...");
                const tickets = await intercomService.getTicketsByCustomer(
                    customerIdentifier,
                    startDateStr,
                    endDateStr
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
                                conversation: ticket.conversation.map(message => ({
                                    from: message.from,
                                    text: message.text,
                                    timestamp: new Date(message.timestamp).toISOString()
                                }))
                            }))
                        }, null, 2)
                    }]
                };
            } catch (error) {
                // Handle specific validation errors with clear messages
                const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
                console.error('Validation error:', errorMessage);
                
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            error: `${errorMessage}\n\nPlease provide a valid customer email or ID, and optional dates in DD/MM/YYYY format (e.g., 15/01/2025)`
                        }, null, 2)
                    }]
                };
            }
        } catch (error) {
            console.error('Error handling search_tickets_by_customer:', error);
            
            // Return error in MCP-compliant format
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            error: error instanceof Error 
                                ? error.message 
                                : "Unknown error processing search_tickets_by_customer request."
                        }, null, 2)
                    }]
                };
        }
    }

    async handleListConversations(args: unknown) {
        try {
            console.error("Handling list_conversations request with args:", JSON.stringify(args));
            
            // Log raw arguments for debugging
            console.error("Raw arguments:", JSON.stringify(args, null, 2));
            
            try {
                // Validate and parse arguments - this will now enforce DD/MM/YYYY format and convert to ISO
                const validatedArgs = ListConversationsArgumentsSchema.parse(args);
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
                
                // Get conversations with history
                console.error("Retrieving conversations from Intercom...");
                const conversations = await intercomService.getConversations(
                    startDateStr, 
                    endDateStr, 
                    validatedArgs.keyword, 
                    validatedArgs.exclude
                );
                
                console.error(`Successfully retrieved ${conversations.length} conversations`);
                
                // Return in the MCP-compliant format with content array
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            result: conversations.map(conversation => ({
                                ...conversation,
                                // Ensure proper timestamp format in response
                                created_at: new Date(conversation.created_at).toISOString(),
                                // Ensure each conversation entry has the correct structure
                                conversation: conversation.conversation.map(message => ({
                                    from: message.from,
                                    text: message.text,
                                    timestamp: new Date(message.timestamp).toISOString()
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
                        type: "text", 
                        text: JSON.stringify({
                            error: `${errorMessage}\n\n${dateFormatInstructions}`
                        }, null, 2)
                    }]
                };
            }
        } catch (error) {
            console.error('Error handling list_conversations:', error);
            
            // Return error in MCP-compliant format
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            error: error instanceof Error 
                                ? error.message 
                                : "Unknown error processing list_conversations request. Please provide dates in DD/MM/YYYY format."
                        }, null, 2)
                    }]
                };
        }
    }
}
