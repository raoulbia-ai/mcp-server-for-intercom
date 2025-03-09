import { Ticket, ConversationMessage, IntercomConversation, IntercomTicket } from "../types/intercom.js";

export class IntercomService {
    private readonly API_BASE_URL: string;
    private readonly authToken: string;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second
    private readonly ITEMS_PER_PAGE = 150; // Based on Python script maximum

    constructor(apiBaseUrl: string, authToken: string) {
        this.API_BASE_URL = apiBaseUrl;
        this.authToken = authToken;
    }

    /**
     * Retrieves all tickets with conversation history after the provided cutoff date
     * Uses pagination to fetch all tickets
     */
    async getTickets(cutoffDate: string): Promise<Ticket[]> {
        try {
            const formattedCutoffDate = new Date(cutoffDate);
            let allTickets: Ticket[] = [];
            let startingAfter: string | null = null;
            let page = 1;
            let morePages = true;
            
            console.log("Retrieving all conversations...");
            
            while (morePages) {
                // Set up pagination parameters
                const params: Record<string, string> = {
                    'per_page': this.ITEMS_PER_PAGE.toString()
                };
                
                if (startingAfter) {
                    params['starting_after'] = startingAfter;
                }
                
                console.log(`Retrieving page ${page}...`);
                
                // Get tickets with pagination
                const response = await this.makeRequest<{
                    conversations: IntercomConversation[];
                    pages: { next?: string };
                }>('conversations', 'GET', params);
                
                if (!response.conversations || response.conversations.length === 0) {
                    morePages = false;
                    break;
                }
                
                console.log(`Retrieved page ${page} with ${response.conversations.length} conversations`);
                
                // Process conversation data into ticket format
                const tickets = this.convertToTickets(response.conversations, formattedCutoffDate);
                allTickets = [...allTickets, ...tickets];
                
                // Get next page URL if it exists
                const nextPage = response.pages?.next;
                if (nextPage && typeof nextPage === 'string' && nextPage.includes('starting_after=')) {
                    // Extract starting_after parameter from next URL
                    startingAfter = nextPage.split('starting_after=')[1].split('&')[0];
                    morePages = true;
                    page++;
                } else {
                    morePages = false;
                }
                
                // Add slight delay to prevent rate limiting (following Python script's pattern)
                if (morePages) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 seconds as in Python script
                }
            }
            
            console.log(`Total conversations retrieved: ${allTickets.length}`);
            
            // Get full conversation history for each ticket
            const ticketsWithConversations = await this.addConversationHistories(allTickets);
            
            return ticketsWithConversations;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            throw new Error(`Failed to retrieve tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Converts Intercom conversation objects to our Ticket format
     * Filters by cutoff date
     */
    private convertToTickets(conversations: IntercomConversation[], cutoffDate: Date): Ticket[] {
        return conversations
            .filter(conversation => {
                const createdAt = new Date(conversation.created_at * 1000); // Convert Unix timestamp to Date
                return createdAt >= cutoffDate;
            })
            .map(conversation => ({
                ticket_id: conversation.id,
                subject: conversation.source?.title || conversation.source?.body || 'No subject',
                status: this.mapIntercomStateToStatus(conversation.state),
                created_at: new Date(conversation.created_at * 1000).toISOString(),
                conversation: [] // Will be populated later
            }));
    }

    /**
     * Maps Intercom conversation state to a standardized status
     */
    private mapIntercomStateToStatus(state: string): string {
        switch (state) {
            case 'open':
                return 'open';
            case 'closed':
                return 'resolved';
            case 'snoozed':
                return 'pending';
            default:
                return state;
        }
    }

    /**
     * Adds full conversation history to each ticket
     */
    private async addConversationHistories(tickets: Ticket[]): Promise<Ticket[]> {
        const ticketsWithConversations: Ticket[] = [];
        const total = tickets.length;
        
        console.log(`\nExtracting full conversation history for ${total} conversations...`);
        
        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            console.log(`Processing conversation ${i+1}/${total} (ID: ${ticket.ticket_id})`);
            
            const conversation = await this.getConversationHistory(ticket.ticket_id);
            ticketsWithConversations.push({
                ...ticket,
                conversation
            });
            
            // Add slight delay to prevent rate limiting (following Python script's pattern)
            if (i < total - 1) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 seconds as in Python script
            }
        }
        
        return ticketsWithConversations;
    }

    /**
     * Gets the full conversation history for a specific ticket
     */
    private async getConversationHistory(ticketId: string): Promise<ConversationMessage[]> {
        try {
            // Add parameters for expanded view and plaintext display as in Python script
            const params = {
                'view': 'expanded',
                'display_as': 'plaintext'
            };
            
            const response = await this.makeRequest<{
                conversation_parts: {
                    conversation_parts: Array<{
                        part_type: string;
                        body?: string;
                        author: { type: string };
                        created_at: number;
                    }>;
                    total_count: number;
                };
                source: { body?: string; delivered_as?: string };
                created_at: number;
            }>(`conversations/${ticketId}`, 'GET', params);
            
            const messages: ConversationMessage[] = [];
            
            // Add the initial message
            if (response.source?.body) {
                messages.push({
                    from: 'customer',
                    text: response.source.body,
                    timestamp: new Date(response.created_at * 1000).toISOString()
                });
            }
            
            // Add conversation parts
            const conversationParts = response.conversation_parts.conversation_parts;
            conversationParts.forEach(part => {
                if (part.body) {
                    messages.push({
                        from: this.determineMessageSender(part.author.type, part.part_type),
                        text: part.body,
                        timestamp: new Date(part.created_at * 1000).toISOString()
                    });
                }
            });
            
            // Check if we're hitting the 500 conversation parts limit (as mentioned in Python script)
            const totalCount = response.conversation_parts.total_count;
            if (totalCount === 500) {
                console.log(`WARNING: Conversation ${ticketId} has reached the 500 parts limit. Some older messages may be missing.`);
            }
            
            return messages;
        } catch (error) {
            console.error(`Error fetching conversation history for ticket ${ticketId}:`, error);
            
            // Try alternate URL format as in Python script
            if (error instanceof Error && error.message.includes('404')) {
                console.log(`Conversation ${ticketId} not found (404). Trying alternate URL format...`);
                try {
                    const alternateResponse = await this.makeRequest<{
                        id: string;
                    }>(`admins/conversations/${ticketId}`, 'GET');
                    
                    if (alternateResponse && alternateResponse.id) {
                        return this.getConversationHistory(alternateResponse.id);
                    }
                } catch (alternateError) {
                    console.error(`Alternate URL also failed for ticket ${ticketId}:`, alternateError);
                }
            }
            
            return []; // Return empty conversation rather than failing completely
        }
    }

    /**
     * Determines if a message is from customer, support agent or system
     */
    private determineMessageSender(authorType: string, partType: string): "customer" | "support_agent" | "system" {
        if (partType === 'note') {
            return 'system';
        }
        
        switch (authorType) {
            case 'user':
                return 'customer';
            case 'admin':
            case 'bot':
                return 'support_agent';
            default:
                return 'system';
        }
    }

    /**
     * Makes a request to the Intercom API with retries and proper authentication
     */
    private async makeRequest<T>(
        endpoint: string,
        method: string = 'GET',
        params?: Record<string, string>,
        body?: unknown,
        retryCount: number = 0
    ): Promise<T> {
        const url = new URL(`${this.API_BASE_URL}/${endpoint}`);
        
        // Add query parameters
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        
        try {
            const response = await fetch(url.toString(), {
                method,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            });
            
            // Handle rate limiting
            if (response.status === 429 && retryCount < this.MAX_RETRIES) {
                const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 || this.RETRY_DELAY));
                return this.makeRequest(endpoint, method, params, body, retryCount + 1);
            }
            
            if (!response.ok) {
                let errorMessage = `API request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage += `: ${errorData?.message || response.statusText}`;
                } catch {
                    errorMessage += `: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            return await response.json() as T;
        } catch (error) {
            if (error instanceof Error && retryCount < this.MAX_RETRIES) {
                // Exponential backoff
                const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(endpoint, method, params, body, retryCount + 1);
            }
            throw error;
        }
    }
}