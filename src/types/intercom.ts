/**
 * Standardized ticket format for the API response
 */
export interface Ticket {
    ticket_id: string;
    subject: string;
    status: string;
    created_at: string;
    conversation: ConversationMessage[];
}

/**
 * Standardized message format for the conversation history
 */
export interface ConversationMessage {
    from: "customer" | "support_agent" | "system";
    text: string;
    timestamp: string;
}

/**
 * Intercom API conversation object
 */
export interface IntercomConversation {
    id: string;
    created_at: number;
    updated_at: number;
    waiting_since: number | null;
    snoozed_until: number | null;
    source: {
        type?: string;
        id?: string;
        delivered_as?: string;
        subject?: string;
        body?: string;
        title?: string;
        author?: {
            id?: string;
            type?: string;
        };
        url?: string;
    };
    contacts: {
        contacts?: Array<{
            id: string;
            type: string;
            name?: string;
            email?: string;
        }>;
    };
    teammates: Array<{
        id: string;
        type: string;
    }>;
    title?: string;
    state: string;
    read: boolean;
    priority: string;
    admin_assignee_id: string | null;
    team_assignee_id: string | null;
    conversation_rating: any;
    statistics: {
        time_to_assignment?: number;
        time_to_admin_reply?: number;
        time_to_first_close?: number;
        time_to_last_close?: number;
        median_time_to_reply?: number;
        first_contact_reply_at?: number;
        first_assignment_at?: number;
        first_admin_reply_at?: number;
        first_close_at?: number;
        last_assignment_at?: number;
        last_assignment_admin_reply_at?: number;
        last_contact_reply_at?: number;
        last_admin_reply_at?: number;
        last_close_at?: number;
        last_closed_by_id?: number;
        count_reopens?: number;
        count_assignments?: number;
        count_conversation_parts?: number;
    };
    conversation_parts?: {
        total_count: number;
    };
    tags: {
        tags: Array<{
            id: string;
            name: string;
        }>;
    };
    open: boolean;
    type?: string;
}

/**
 * Extended Intercom ticket interface (used when fetching a specific conversation)
 */
export interface IntercomTicket extends IntercomConversation {
    conversation_parts: {
        conversation_parts: Array<{
            id: string;
            part_type: string;
            body?: string;
            created_at: number;
            updated_at: number;
            notified_at: number;
            assigned_to: any;
            author: {
                id: string;
                type: string;
                name?: string;
                email?: string;
            };
            attachments: any[];
            external_id: string;
            redacted: boolean;
        }>;
        total_count: number;
    };
    
    // Additional fields observed in the Python script
    contacts: {
        contacts: Array<{
            id: string;
            type: string;
            name?: string;
            email?: string;
        }>;
    };
    source: {
        body?: string;
        delivered_as?: string;
        title?: string;
    };
}