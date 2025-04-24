import { Ticket, ConversationMessage, IntercomConversation, IntercomTicket } from "../types/intercom.js";

export class IntercomService {
    private readonly API_BASE_URL: string;
    private readonly authToken: string;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second
    private readonly ITEMS_PER_PAGE = 150; // Based on Python script maximum
    private readonly CONCURRENT_REQUESTS = 5; // Maximum number of concurrent requests
    private readonly BATCH_SIZE = 10; // Number of tickets to process in a batch
    private readonly PROGRESS_INTERVAL = 10; // Log progress every X tickets
    private readonly OPTIMIZATION_THRESHOLD = 50; // Threshold for using optimized processing

    constructor(apiBaseUrl: string, authToken: string) {
        this.API_BASE_URL = apiBaseUrl;
        this.authToken = authToken;
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

    /**
     * Determines the sender type based on author type and part type
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
     * Converts Intercom conversation objects to our Ticket format
     * Filters by date range, keyword, and exclusion criteria
     */
    private convertToTickets(
        conversations: IntercomConversation[], 
        startDate: Date, 
        endDate: Date,
        keyword?: string,
        exclude?: string
    ): Ticket[] {
        return conversations
            .filter(conversation => {
                const createdAt = new Date(conversation.created_at * 1000); // Convert Unix timestamp to Date
                
                // Date range filter
                const isInDateRange = createdAt >= startDate && createdAt < endDate;
                if (!isInDateRange) return false;
                
                // Get conversation text for content filtering
                const title = conversation.source?.title || '';
                const body = conversation.source?.body || '';
                const fullText = `${title} ${body}`.toLowerCase();
                
                // Keyword filter (if provided)
                if (keyword) {
                    // Check if any of the pipe-delimited keywords match
                    if (keyword.includes('|')) {
                        const keywordArray = keyword.split('|');
                        if (!keywordArray.some(k => fullText.includes(k.toLowerCase()))) {
                            return false;
                        }
                    } else if (!fullText.includes(keyword.toLowerCase())) {
                        return false;
                    }
                }
                
                // Exclusion filter (if provided)
                if (exclude && fullText.includes(exclude.toLowerCase())) {
                    return false;
                }
                
                return true;
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
     * Gets the full conversation history for a specific ticket
     */
    private async getConversationHistory(ticketId: string, keyword?: string, exclude?: string): Promise<ConversationMessage[]> {
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
                const body = response.source.body;
                
                // Apply keyword filter if specified
                let keywordMatch = true;
                if (keyword) {
                    // Check if any of the pipe-delimited keywords match
                    if (keyword.includes('|')) {
                        const keywordArray = keyword.split('|');
                        keywordMatch = keywordArray.some(k => body.toLowerCase().includes(k.toLowerCase()));
                    } else {
                        keywordMatch = body.toLowerCase().includes(keyword.toLowerCase());
                    }
                }
                
                if (keyword && !keywordMatch) {
                    // Skip this message if keyword filter is active and not matched
                } else if (exclude && body.toLowerCase().includes(exclude.toLowerCase())) {
                    // Skip this message if exclusion filter is active and matched
                } else {
                    messages.push({
                        from: 'customer',
                        text: body,
                        timestamp: new Date(response.created_at * 1000).toISOString()
                    });
                }
            }
            
            // Add conversation parts
            const conversationParts = response.conversation_parts.conversation_parts;
            conversationParts.forEach(part => {
                if (part.body) {
                    const body = part.body;
                    
                    // Apply keyword filter if specified
                    let keywordMatch = true;
                    if (keyword) {
                        // Check if any of the pipe-delimited keywords match
                        if (keyword.includes('|')) {
                            const keywordArray = keyword.split('|');
                            keywordMatch = keywordArray.some(k => body.toLowerCase().includes(k.toLowerCase()));
                        } else {
                            keywordMatch = body.toLowerCase().includes(keyword.toLowerCase());
                        }
                    }
                    
                    if (keyword && !keywordMatch) {
                        // Skip this message if keyword filter is active and not matched
                        return;
                    }
                    
                    // Apply exclusion filter if specified
                    if (exclude && body.toLowerCase().includes(exclude.toLowerCase())) {
                        // Skip this message if exclusion filter is active and matched
                        return;
                    }
                    
                    messages.push({
                        from: this.determineMessageSender(part.author.type, part.part_type),
                        text: body,
                        timestamp: new Date(part.created_at * 1000).toISOString()
                    });
                }
            });
            
            // Check if we're hitting the 500 conversation parts limit (as mentioned in Python script)
            const totalCount = response.conversation_parts.total_count;
            if (totalCount === 500) {
                console.error(`WARNING: Conversation ${ticketId} has reached the 500 parts limit. Some older messages may be missing.`);
            }
            
            return messages;
        } catch (error) {
            console.error(`Error fetching conversation history for ticket ${ticketId}:`, error);
            
            // Try alternate URL format as in Python script
            if (error instanceof Error && error.message.includes('404')) {
                console.error(`Conversation ${ticketId} not found (404). Trying alternate URL format...`);
                try {
                    const alternateResponse = await this.makeRequest<{
                        id: string;
                    }>(`admins/conversations/${ticketId}`, 'GET');
                    
                    if (alternateResponse && alternateResponse.id) {
                        return this.getConversationHistory(alternateResponse.id, keyword, exclude);
                    }
                } catch (alternateError) {
                    console.error(`Alternate URL also failed for ticket ${ticketId}:`, alternateError);
                }
            }
            
            return []; // Return empty conversation rather than failing completely
        }
    }

    /**
     * Adds full conversation history to each ticket with optional keyword and exclusion filtering
     * Optimized for better performance with parallel processing and batching
     */
    private async addConversationHistories(
        tickets: Ticket[], 
        keyword?: string, 
        exclude?: string
    ): Promise<Ticket[]> {
        const total = tickets.length;
        console.error(`\nExtracting full conversation history for ${total} conversations...`);
        
        // If we have a small number of tickets, process them directly
        if (total <= this.BATCH_SIZE) {
            return this.processTicketBatch(tickets, 0, total, keyword, exclude);
        }
        
        // For larger sets, process in optimized batches
        const ticketsWithConversations: Ticket[] = [];
        let processedCount = 0;
        
        // Process tickets in batches to control memory usage
        for (let i = 0; i < tickets.length; i += this.BATCH_SIZE) {
            console.error(`Processing batch ${Math.floor(i/this.BATCH_SIZE) + 1}/${Math.ceil(tickets.length/this.BATCH_SIZE)}...`);
            
            const batchEnd = Math.min(i + this.BATCH_SIZE, tickets.length);
            const batchTickets = tickets.slice(i, batchEnd);
            
            // Process the current batch with concurrency
            const batchResults = await this.processTicketBatch(
                batchTickets, 
                processedCount,
                total,
                keyword, 
                exclude
            );
            
            ticketsWithConversations.push(...batchResults);
            processedCount += batchResults.length;
            
            // Add delay between batches to manage rate limits
            if (i + this.BATCH_SIZE < tickets.length) {
                console.error(`Batch complete. Taking a short break before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.error(`Completed processing ${processedCount} conversations`);
        return ticketsWithConversations;
    }
    
    /**
     * Process a batch of tickets with concurrent requests
     */
    private async processTicketBatch(
        tickets: Ticket[],
        startIndex: number,
        totalTickets: number,
        keyword?: string,
        exclude?: string
    ): Promise<Ticket[]> {
        const results: Ticket[] = [];
        const batches: Ticket[][] = [];
        
        // Split batch into smaller groups for concurrent processing
        for (let i = 0; i < tickets.length; i += this.CONCURRENT_REQUESTS) {
            batches.push(tickets.slice(i, i + this.CONCURRENT_REQUESTS));
        }
        
        // Process each mini-batch concurrently
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchPromises = batch.map(async (ticket, index) => {
                const globalIndex = startIndex + (batchIndex * this.CONCURRENT_REQUESTS) + index + 1;
                
                try {
                    console.error(`Processing conversation ${globalIndex}/${totalTickets} (ID: ${ticket.ticket_id})`);
                    const conversation = await this.getConversationHistory(ticket.ticket_id, keyword, exclude);
                    
                    // Log progress at intervals
                    if (globalIndex % this.PROGRESS_INTERVAL === 0 || globalIndex === totalTickets) {
                        console.error(`Progress: ${globalIndex}/${totalTickets} conversations (${Math.round((globalIndex/totalTickets)*100)}%)`);
                    }
                    
                    return {
                        ...ticket,
                        conversation
                    };
                } catch (error) {
                    console.error(`Error processing ticket ${ticket.ticket_id}:`, error);
                    // Return ticket with empty conversation on error
                    return {
                        ...ticket,
                        conversation: []
                    };
                }
            });
            
            // Wait for all concurrent requests in this mini-batch to complete
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Add a small delay between mini-batches to prevent rate limiting
            if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        return results;
    }

    /**
     * Retrieves all conversations from Intercom with efficient pagination handling
     */
    private async getAllConversationsWithPagination(): Promise<IntercomConversation[]> {
        let allConversations: IntercomConversation[] = [];
        let startingAfter: string | null = null;
        let page = 1;
        let retriesLeft = this.MAX_RETRIES;
        let morePages = true;
        
        while (morePages) {
            try {
                // Set up pagination parameters
                const params: Record<string, string> = {
                    'per_page': this.ITEMS_PER_PAGE.toString()
                };
                
                if (startingAfter) {
                    params['starting_after'] = startingAfter;
                }
                
                console.error(`Retrieving page ${page}...`);
                
                // Get conversations with pagination
                const response = await this.makeRequest<{
                    conversations: IntercomConversation[];
                    pages: { next?: string };
                }>('conversations', 'GET', params);
                
                if (!response.conversations || response.conversations.length === 0) {
                    console.error('No more conversations found');
                    morePages = false;
                    break;
                }
                
                console.error(`Retrieved page ${page} with ${response.conversations.length} conversations`);
                allConversations = [...allConversations, ...response.conversations];
                
                // Get next page URL if it exists
                const nextPage = response.pages?.next;
                if (nextPage && typeof nextPage === 'string' && nextPage.includes('starting_after=')) {
                    startingAfter = nextPage.split('starting_after=')[1].split('&')[0];
                    morePages = true;
                    page++;
                    // Reset retries on successful request
                    retriesLeft = this.MAX_RETRIES;
                } else {
                    console.error('No next page found, pagination complete');
                    morePages = false;
                }
                
                // Add slight delay to prevent rate limiting
                if (morePages) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                // Handle pagination errors with retries
                if (retriesLeft > 0) {
                    retriesLeft--;
                    console.error(`Error retrieving page ${page}, retrying (${retriesLeft} retries left)...`);
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                } else {
                    console.error(`Failed to retrieve page ${page} after multiple retries, stopping pagination`);
                    morePages = false;
                }
            }
        }
        
        console.error(`Pagination complete, retrieved ${allConversations.length} total conversations`);
        return allConversations;
    }

    /**
     * Searches for tickets by status (open, pending, resolved)
     * with optional date range filtering
     * Uses the actual /tickets/search endpoint with Intercom's expected state values
     */
    async getTicketsByStatus(
        status: string,
        startDate?: string,
        endDate?: string
    ): Promise<Ticket[]> {
        try {
            console.error(`Searching for tickets with status: ${status}`);
            if (startDate) console.error(`Start date: ${startDate}`);
            if (endDate) console.error(`End date: ${endDate}`);
            
            // Map our status terms to Intercom's state values
            const stateMap: Record<string, string> = {
                'open': 'open',
                'pending': 'snoozed',
                'resolved': 'closed'
            };
            
            const intercomState = stateMap[status.toLowerCase()] || status;
            console.error(`Mapped status "${status}" to Intercom state "${intercomState}"`);
            
            // Build the search query for the tickets/search endpoint
            // Following Intercom API documentation structure
            const searchQuery: any = {
                query: {
                    operator: "AND",
                    value: [
                        {
                            field: "state", // Intercom's field name for ticket state
                            operator: "=",
                            value: intercomState
                        }
                    ]
                }
            };
            
            // Add date filters if provided - converting to UNIX timestamps as required by Intercom
            if (startDate) {
                const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
                searchQuery.query.value.push({
                    field: "created_at", // Intercom uses created_at with UNIX timestamp
                    operator: ">=",
                    value: startTimestamp
                });
            }
            
            if (endDate) {
                const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
                searchQuery.query.value.push({
                    field: "created_at", // Intercom uses created_at with UNIX timestamp
                    operator: "<=",
                    value: endTimestamp
                });
            }
            
            console.error(`Executing ticket search with query:`, JSON.stringify(searchQuery, null, 2));
            
            // Make the API request to the tickets/search endpoint
            const response = await this.makeRequest<{
                tickets: Array<{
                    id: string;
                    title: string;
                    state: string;
                    created_at: number;
                    updated_at: number;
                    priority: string;
                    tags?: { tags: Array<{ id: string; name: string }> };
                }>;
                total_count: number;
            }>('tickets/search', 'POST', undefined, searchQuery);
            
            if (!response.tickets || response.tickets.length === 0) {
                console.error(`No tickets found with status: ${status}`);
                return [];
            }
            
            console.error(`Found ${response.tickets.length} tickets with status: ${status}`);
            
            // Convert the Intercom ticket format to our standard format
            const tickets: Ticket[] = response.tickets.map(ticket => ({
                ticket_id: ticket.id,
                subject: ticket.title || 'No subject',
                status: this.mapIntercomStateToStatus(ticket.state),
                created_at: new Date(ticket.created_at * 1000).toISOString(),
                conversation: [] // Will be populated later
            }));
            
            // Get full conversation history for each ticket
            const ticketsWithConversations = await this.addConversationHistories(tickets);
            
            return ticketsWithConversations;
        } catch (error) {
            console.error('Error searching tickets by status:', error);
            throw new Error(`Failed to search tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Searches for conversations by customer email or ID
     * with optional date range filtering
     * 
     * Implementation notes: 
     * - Intercom API requires contact_ids (not email directly)
     * - First resolves email to contact ID via contacts/search endpoint
     * - Then uses contacts/{id}/conversations endpoint to get conversations
     * - Filters for date range and keywords are applied post-API call
     */
    async getConversationsByCustomer(
        customerIdentifier: string,
        startDate?: string,
        endDate?: string,
        keywords?: string[]
    ): Promise<Ticket[]> {
        try {
            console.error(`Searching for conversations with customer: ${customerIdentifier}`);
            if (startDate) console.error(`Start date: ${startDate}`);
            if (endDate) console.error(`End date: ${endDate}`);
            if (keywords && keywords.length > 0) console.error(`Filtering by keywords: ${keywords.join(', ')}`);
            
            // Determine if customerIdentifier is an email or ID
            const isEmail = customerIdentifier.includes('@');
            console.error(`Identified as ${isEmail ? 'email' : 'ID'}`);
            
            // First, we need to find the contact by email or ID
            // Intercom API requires contact_ids, not email directly
            let contactId: string | undefined;
            
            try {
                // Search for the contact
                const searchParams: Record<string, string> = {};
                
                if (isEmail) {
                    console.error(`Searching for contact with email: ${customerIdentifier}`);
                    // According to the Intercom API documentation, we should use the contacts/search endpoint
                    // with a query body to search for contacts by email
                    const searchBody = {
                        query: {
                            field: 'email',
                            operator: '=',
                            value: customerIdentifier
                        }
                    };
                    
                    console.error(`Searching for contact with email using contacts/search endpoint`);
                    const searchResponse = await this.makeRequest<{
                        data: Array<{
                            id: string;
                            type: string;
                            email?: string;
                        }>;
                    }>('contacts/search', 'POST', undefined, searchBody);
                    
                    if (searchResponse.data && searchResponse.data.length > 0) {
                        contactId = searchResponse.data[0].id;
                        console.error(`Found contact with ID: ${contactId} using search endpoint`);
                    }
                } else {
                    console.error(`Searching for contact with ID: ${customerIdentifier}`);
                    // If it's not an email, try it as an ID directly
                    contactId = customerIdentifier;
                }
                
                if (!contactId) {
                    // Only perform the search if we don't already have the ID
                    const searchResponse = await this.makeRequest<{
                        data: Array<{
                            id: string;
                            type: string;
                            email?: string;
                        }>;
                    }>('contacts/search', 'POST', undefined, { query: searchParams });
                    
                    if (!searchResponse.data || searchResponse.data.length === 0) {
                        console.error(`No contact found for ${customerIdentifier}`);
                        return []; // No contact found
                    }
                    
                    contactId = searchResponse.data[0].id;
                    console.error(`Found contact with ID: ${contactId}`);
                }
                
                // Now get conversations for this contact
                // Using Intercom's contacts/{id}/conversations endpoint
                console.error(`Retrieving conversations for contact ID: ${contactId}`);
                const response = await this.makeRequest<{
                    conversations: IntercomConversation[];
                }>(`contacts/${contactId}/conversations`, 'GET');
                
                if (!response.conversations || response.conversations.length === 0) {
                    console.error(`No conversations found for contact ID: ${contactId}`);
                    return []; // No conversations found
                }
                
                console.error(`Found ${response.conversations.length} conversations for contact`);
                
                // Convert to our ticket format and filter by date if needed
                const startDateObj = startDate ? new Date(startDate) : new Date(0); // Default to epoch start
                const endDateObj = endDate ? new Date(endDate) : new Date(); // Default to now
                
                // We do date filtering manually since the Intercom API doesn't support it directly
                // for the contacts/{id}/conversations endpoint
                const tickets = this.convertToTickets(
                    response.conversations,
                    startDateObj,
                    endDateObj
                );
                
                console.error(`After date filtering, ${tickets.length} conversations remain`);
                
                // Process keywords array if provided
                // Note: Intercom doesn't support direct keyword filtering in API requests
                // so we apply it to the conversation content after retrieving
                let keywordFilter: string | undefined;
                if (keywords && keywords.length > 0) {
                    // Join keywords with pipe for OR-based filtering
                    keywordFilter = keywords.join('|');
                    console.error(`Using keyword filter: ${keywordFilter}`);
                }
                
                // Get full conversation history for each ticket
                const ticketsWithConversations = await this.addConversationHistories(tickets, keywordFilter);
                
                return ticketsWithConversations;
            } catch (error) {
                console.error(`Error finding contact: ${error}`);
                
                // If we can't find the contact by search, try a different approach
                // Get all conversations and filter by customer info
                console.error('Falling back to retrieving all conversations and filtering');
                
                const allConversations = await this.getAllConversationsWithPagination();
                
                // Filter conversations by customer identifier
                const filteredConversations = allConversations.filter(conversation => {
                    // Check if any contact in the conversation matches
                    if (conversation.contacts && conversation.contacts.contacts) {
                        return conversation.contacts.contacts.some(contact => {
                            if (isEmail && contact.email) {
                                return contact.email.toLowerCase() === customerIdentifier.toLowerCase();
                            } else {
                                return contact.id === customerIdentifier;
                            }
                        });
                    }
                    return false;
                });
                
                console.error(`Found ${filteredConversations.length} conversations after filtering`);
                
                // Convert to our ticket format and filter by date if needed
                const startDateObj = startDate ? new Date(startDate) : new Date(0); // Default to epoch start
                const endDateObj = endDate ? new Date(endDate) : new Date(); // Default to now
                
                const tickets = this.convertToTickets(
                    filteredConversations,
                    startDateObj,
                    endDateObj
                );
                
                console.error(`After date filtering, ${tickets.length} conversations remain`);
                
                // Process keywords array if provided
                let keywordFilter: string | undefined;
                if (keywords && keywords.length > 0) {
                    // Join keywords with pipe for OR-based filtering
                    keywordFilter = keywords.join('|');
                    console.error(`Using keyword filter: ${keywordFilter}`);
                }
                
                // Get full conversation history for each ticket
                const ticketsWithConversations = await this.addConversationHistories(tickets, keywordFilter);
                
                return ticketsWithConversations;
            }
        } catch (error) {
            console.error('Error searching conversations by customer:', error);
            throw new Error(`Failed to search conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Searches for tickets by customer email or ID
     * with optional date range filtering
     * 
     * Implementation notes:
     * - Intercom API requires contact_ids (not email directly)
     * - First resolves email to contact ID via contacts/search endpoint
     * - Then uses tickets/search endpoint with contact_ids filter
     * - Date filters use created_at with UNIX timestamps
     */
    async getTicketsByCustomer(
        customerIdentifier: string,
        startDate?: string,
        endDate?: string
    ): Promise<Ticket[]> {
        try {
            console.error(`Searching for tickets with customer: ${customerIdentifier}`);
            if (startDate) console.error(`Start date: ${startDate}`);
            if (endDate) console.error(`End date: ${endDate}`);
            
            // Determine if customerIdentifier is an email or ID
            const isEmail = customerIdentifier.includes('@');
            console.error(`Identified as ${isEmail ? 'email' : 'ID'}`);
            
            // First, we need to find the contact by email or ID
            // Intercom API requires contact_ids, not email directly
            let contactId: string | undefined;
            
            try {
                // Search for the contact
                if (isEmail) {
                    console.error(`Searching for contact with email: ${customerIdentifier}`);
                    // According to the Intercom API documentation, we should use the contacts/search endpoint
                    // with a query body to search for contacts by email
                    const searchBody = {
                        query: {
                            field: 'email',
                            operator: '=',
                            value: customerIdentifier
                        }
                    };
                    
                    console.error(`Searching for contact with email using contacts/search endpoint`);
                    const searchResponse = await this.makeRequest<{
                        data: Array<{
                            id: string;
                            type: string;
                            email?: string;
                        }>;
                    }>('contacts/search', 'POST', undefined, searchBody);
                    
                    if (searchResponse.data && searchResponse.data.length > 0) {
                        contactId = searchResponse.data[0].id;
                        console.error(`Found contact with ID: ${contactId} using search endpoint`);
                    }
                } else {
                    console.error(`Searching for contact with ID: ${customerIdentifier}`);
                    // If it's not an email, try it as an ID directly
                    contactId = customerIdentifier;
                }
                
                if (!contactId) {
                    console.error(`No contact found for ${customerIdentifier}`);
                    return []; // No contact found
                }
                
                // Now get tickets for this contact using Intercom's tickets/search endpoint
                console.error(`Retrieving tickets for contact ID: ${contactId}`);
                
                // Build the search query for the tickets/search endpoint
                // Following Intercom API documentation structure
                const searchQuery: any = {
                    query: {
                        operator: "AND",
                        value: [
                            {
                                field: "contact_ids", // Intercom's field name for ticket-contact association
                                operator: "=",
                                value: contactId
                            }
                        ]
                    }
                };
                
                // Add date filters if provided - converting to UNIX timestamps as required by Intercom
                if (startDate) {
                    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
                    searchQuery.query.value.push({
                        field: "created_at", // Intercom uses created_at with UNIX timestamp
                        operator: ">=",
                        value: startTimestamp
                    });
                }
                
                if (endDate) {
                    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
                    searchQuery.query.value.push({
                        field: "created_at", // Intercom uses created_at with UNIX timestamp
                        operator: "<=",
                        value: endTimestamp
                    });
                }
                
                console.error(`Executing ticket search with query:`, JSON.stringify(searchQuery, null, 2));
                
                // Make the API request to the tickets/search endpoint
                const response = await this.makeRequest<{
                    tickets: Array<{
                        id: string;
                        title: string;
                        state: string;
                        created_at: number;
                        updated_at: number;
                        priority: string;
                        tags?: { tags: Array<{ id: string; name: string }> };
                    }>;
                    total_count: number;
                }>('tickets/search', 'POST', undefined, searchQuery);
                
                if (!response.tickets || response.tickets.length === 0) {
                    console.error(`No tickets found for customer: ${customerIdentifier}`);
                    return [];
                }
                console.error(`Found ${response.tickets.length} tickets for customer: ${customerIdentifier}`);
                
                // Convert the Intercom ticket format to our standard format
                const tickets: Ticket[] = response.tickets.map(ticket => ({
                    ticket_id: ticket.id,
                    subject: ticket.title || 'No subject',
                    status: this.mapIntercomStateToStatus(ticket.state),
                    created_at: new Date(ticket.created_at * 1000).toISOString(),
                    conversation: [] // Will be populated later
                }));
                
                // Get full conversation history for each ticket
                const ticketsWithConversations = await this.addConversationHistories(tickets);
                
                return ticketsWithConversations;
            } catch (error: any) {
                console.error(`Error finding tickets for customer: ${error}`);
                return []; // Return empty array on error
            }
        } catch (error) {
            console.error('Error searching tickets by customer:', error);
            throw new Error(`Failed to search tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieves conversations for a specific date range,
     * with optional keyword filtering and exclusion, optimized for large volumes
     * 
     * Implementation notes:
     * - Uses Intercom's /conversations endpoint for listing
     * - Date filtering, keyword filtering, and exclusion are applied post-API call
     * - The 7-day range limit is an internal constraint, not from Intercom's API
     * - Handles pagination using Intercom's cursor-based pagination (starting_after)
     */
    async getConversations(startDate: string, endDate: string, keyword?: string, exclude?: string): Promise<Ticket[]> {
        try {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            let allConversations: Ticket[] = [];
            let startingAfter: string | null = null;
            let page = 1;
            let morePages = true;
            
            console.error(`Retrieving conversations between ${startDate} and ${endDate}...`);
            if (keyword) console.error(`Filtering by keyword: "${keyword}"`);
            if (exclude) console.error(`Excluding conversations containing: "${exclude}"`);
            
            // Note: Intercom's list conversations endpoint doesn't support direct date filtering
            // or keyword filtering in the API call. We retrieve all and filter afterwards.
            while (morePages) {
                // Set up pagination parameters for Intercom's cursor-based pagination
                const params: Record<string, string> = {
                    'per_page': this.ITEMS_PER_PAGE.toString()
                };
                
                if (startingAfter) {
                    params['starting_after'] = startingAfter;
                }
                
                console.error(`Retrieving page ${page}...`);
                
                // Get conversations with pagination using Intercom's /conversations endpoint
                const response = await this.makeRequest<{
                    conversations: IntercomConversation[];
                    pages: { next?: string };
                }>('conversations', 'GET', params);
                
                if (!response.conversations || response.conversations.length === 0) {
                    morePages = false;
                    break;
                }
                
                console.error(`Retrieved page ${page} with ${response.conversations.length} conversations`);
                
                // Process conversation data into ticket format
                // This is where we apply date, keyword, and exclusion filtering
                // since Intercom's API doesn't support these filters directly
                const tickets = this.convertToTickets(response.conversations, startDateObj, endDateObj, keyword, exclude);
                allConversations = [...allConversations, ...tickets];
                
                // Get next page URL if it exists - using Intercom's cursor-based pagination
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
            
            console.error(`Total conversations retrieved: ${allConversations.length}`);
            
            // Get full conversation history for each ticket
            // This is where we can also apply more detailed content filtering
            // since Intercom doesn't support source.body filtering in the API directly
            const ticketsWithConversations = await this.addConversationHistories(allConversations, keyword, exclude);
            
            return ticketsWithConversations;
        } catch (error) {
            console.error('Error fetching conversations:', error);
            throw new Error(`Failed to retrieve conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}


