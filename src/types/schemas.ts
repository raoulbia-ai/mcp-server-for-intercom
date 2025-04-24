import { z } from "zod";

// Keep the message schema which is needed for MCP communication
export const MessageSchema = z.object({
    jsonrpc: z.literal("2.0"),
    id: z.union([z.number(), z.string()]).optional(),
    method: z.string().optional(),
    params: z.record(z.unknown()).optional(),
    result: z.unknown().optional(),
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.unknown().optional()
    }).optional()
});

/**
 * Schema for the search_tickets_by_status endpoint
 * Using ticket status with optional date range
 */
export const SearchTicketsByStatusSchema = z.object({
    // Required status parameter
    status: z.string({
        required_error: "status is required (open, pending, or resolved)"
    }).refine(val => ['open', 'pending', 'resolved'].includes(val.toLowerCase()), {
        message: "status must be one of: open, pending, resolved"
    }),
    
    // Optional date range parameters in DD/MM/YYYY format
    startDate: z.string().optional().refine(val => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "startDate must be in DD/MM/YYYY format (e.g., 15/01/2025)"
    }),
    
    endDate: z.string().optional().refine(val => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "endDate must be in DD/MM/YYYY format (e.g., 21/01/2025)"
    })
}).transform(data => {
    console.error("Raw arguments received:", JSON.stringify(data));
    
    try {
        // Convert DD/MM/YYYY to Date objects and ISO strings if provided
        if (data.startDate) {
            const [day, month, year] = data.startDate.split('/').map(Number);
            const startDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(startDateObj.getTime())) {
                throw new Error(`Invalid startDate: ${data.startDate}`);
            }
            
            // Set to beginning of the day
            startDateObj.setHours(0, 0, 0, 0);
            data.startDate = startDateObj.toISOString();
        }
        
        if (data.endDate) {
            const [day, month, year] = data.endDate.split('/').map(Number);
            const endDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(endDateObj.getTime())) {
                throw new Error(`Invalid endDate: ${data.endDate}`);
            }
            
            // Set to end of the day
            endDateObj.setHours(23, 59, 59, 999);
            data.endDate = endDateObj.toISOString();
        }
        
        // Validate that the date range is valid if both dates are provided
        if (data.startDate && data.endDate) {
            const startDateObj = new Date(data.startDate);
            const endDateObj = new Date(data.endDate);
            
            if (endDateObj < startDateObj) {
                throw new Error("End date cannot be before start date");
            }
        }
        
    } catch (e) {
        // Throw error to be caught by the handler
        console.error(`Error processing date parameters: ${e}`);
        throw new Error(`${e instanceof Error ? e.message : 'Invalid date format'} - Please provide dates in DD/MM/YYYY format (e.g., 15/01/2025)`);
    }
    
    console.error("Final parameters:", JSON.stringify(data));
    return data;
});

/**
 * Schema for the search_conversations_by_customer endpoint
 * Using customer identifier (email or ID) with optional date range
 */
export const SearchConversationsByCustomerSchema = z.object({
    // Required customer identifier parameter
    customerIdentifier: z.string({
        required_error: "customerIdentifier is required (email or ID)"
    }),
    
    // Optional date range parameters in DD/MM/YYYY format
    startDate: z.string().optional().refine(val => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "startDate must be in DD/MM/YYYY format (e.g., 15/01/2025)"
    }),
    
    endDate: z.string().optional().refine(val => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "endDate must be in DD/MM/YYYY format (e.g., 21/01/2025)"
    }),
    
    // Optional keywords array for filtering conversations
    keywords: z.array(z.string()).optional().describe("Array of keywords to filter conversations by content")
}).transform(data => {
    console.error("Raw arguments received:", JSON.stringify(data));
    
    try {
        // Convert DD/MM/YYYY to Date objects and ISO strings if provided
        if (data.startDate) {
            const [day, month, year] = data.startDate.split('/').map(Number);
            const startDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(startDateObj.getTime())) {
                throw new Error(`Invalid startDate: ${data.startDate}`);
            }
            
            // Set to beginning of the day
            startDateObj.setHours(0, 0, 0, 0);
            data.startDate = startDateObj.toISOString();
        }
        
        if (data.endDate) {
            const [day, month, year] = data.endDate.split('/').map(Number);
            const endDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(endDateObj.getTime())) {
                throw new Error(`Invalid endDate: ${data.endDate}`);
            }
            
            // Set to end of the day
            endDateObj.setHours(23, 59, 59, 999);
            data.endDate = endDateObj.toISOString();
        }
        
        // Validate that the date range is valid if both dates are provided
        if (data.startDate && data.endDate) {
            const startDateObj = new Date(data.startDate);
            const endDateObj = new Date(data.endDate);
            
            if (endDateObj < startDateObj) {
                throw new Error("End date cannot be before start date");
            }
        }
        
    } catch (e) {
        // Throw error to be caught by the handler
        console.error(`Error processing date parameters: ${e}`);
        throw new Error(`${e instanceof Error ? e.message : 'Invalid date format'} - Please provide dates in DD/MM/YYYY format (e.g., 15/01/2025)`);
    }
    
    console.error("Final parameters:", JSON.stringify(data));
    return data;
});

/**
 * Schema for the search_tickets_by_customer endpoint
 * Using customer identifier (email or ID) with optional date range
 */
export const SearchTicketsByCustomerSchema = z.object({
    // Required customer identifier parameter
    customerIdentifier: z.string({
        required_error: "customerIdentifier is required (email or ID)"
    }),
    
    // Optional date range parameters in DD/MM/YYYY format
    startDate: z.string().optional().refine(val => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "startDate must be in DD/MM/YYYY format (e.g., 15/01/2025)"
    }),
    
    endDate: z.string().optional().refine(val => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "endDate must be in DD/MM/YYYY format (e.g., 21/01/2025)"
    })
}).transform(data => {
    console.error("Raw arguments received:", JSON.stringify(data));
    
    try {
        // Convert DD/MM/YYYY to Date objects and ISO strings if provided
        if (data.startDate) {
            const [day, month, year] = data.startDate.split('/').map(Number);
            const startDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(startDateObj.getTime())) {
                throw new Error(`Invalid startDate: ${data.startDate}`);
            }
            
            // Set to beginning of the day
            startDateObj.setHours(0, 0, 0, 0);
            data.startDate = startDateObj.toISOString();
        }
        
        if (data.endDate) {
            const [day, month, year] = data.endDate.split('/').map(Number);
            const endDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(endDateObj.getTime())) {
                throw new Error(`Invalid endDate: ${data.endDate}`);
            }
            
            // Set to end of the day
            endDateObj.setHours(23, 59, 59, 999);
            data.endDate = endDateObj.toISOString();
        }
        
        // Validate that the date range is valid if both dates are provided
        if (data.startDate && data.endDate) {
            const startDateObj = new Date(data.startDate);
            const endDateObj = new Date(data.endDate);
            
            if (endDateObj < startDateObj) {
                throw new Error("End date cannot be before start date");
            }
        }
        
    } catch (e) {
        // Throw error to be caught by the handler
        console.error(`Error processing date parameters: ${e}`);
        throw new Error(`${e instanceof Error ? e.message : 'Invalid date format'} - Please provide dates in DD/MM/YYYY format (e.g., 15/01/2025)`);
    }
    
    console.error("Final parameters:", JSON.stringify(data));
    return data;
});

/**
 * Schema for the list_conversations endpoint
 * Using DD/MM/YYYY format for all date inputs
 */
export const ListConversationsArgumentsSchema = z.object({
    // Required date range parameters in DD/MM/YYYY format
    startDate: z.string({
        required_error: "startDate is required in DD/MM/YYYY format (e.g., 15/01/2025)"
    }).refine(val => /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "startDate must be in DD/MM/YYYY format (e.g., 15/01/2025)"
    }),
    
    endDate: z.string({
        required_error: "endDate is required in DD/MM/YYYY format (e.g., 21/01/2025)"
    }).refine(val => /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
        message: "endDate must be in DD/MM/YYYY format (e.g., 21/01/2025)"
    }),
    
    // Optional string filters
    keyword: z.string().optional(),
    exclude: z.string().optional()
}).transform(data => {
    console.error("Raw arguments received:", JSON.stringify(data));
    
    try {
        // Convert DD/MM/YYYY to Date objects and ISO strings
        if (data.startDate) {
            const [day, month, year] = data.startDate.split('/').map(Number);
            const startDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(startDateObj.getTime())) {
                throw new Error(`Invalid startDate: ${data.startDate}`);
            }
            
            // Set to beginning of the day
            startDateObj.setHours(0, 0, 0, 0);
            data.startDate = startDateObj.toISOString();
        }
        
        if (data.endDate) {
            const [day, month, year] = data.endDate.split('/').map(Number);
            const endDateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
            
            if (isNaN(endDateObj.getTime())) {
                throw new Error(`Invalid endDate: ${data.endDate}`);
            }
            
            // Set to end of the day
            endDateObj.setHours(23, 59, 59, 999);
            data.endDate = endDateObj.toISOString();
        }
        
        // Validate that the date range is valid
        const startDateObj = new Date(data.startDate);
        const endDateObj = new Date(data.endDate);
        
        if (endDateObj < startDateObj) {
            throw new Error("End date cannot be before start date");
        }
        
        // Enforce 7-day maximum range
        const maxRangeMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        const actualRangeMs = endDateObj.getTime() - startDateObj.getTime();
        
        if (actualRangeMs > maxRangeMs) {
            throw new Error(`Date range exceeds 7-day maximum (${Math.round(actualRangeMs / (24 * 60 * 60 * 1000))} days). Please limit to 7 days or less.`);
        }
        
    } catch (e) {
        // Throw error to be caught by the handler
        console.error(`Error processing date parameters: ${e}`);
        throw new Error(`${e instanceof Error ? e.message : 'Invalid date format'} - Please provide dates in DD/MM/YYYY format (e.g., 15/01/2025)`);
    }
    
    console.error("Final parameters:", JSON.stringify(data));
    return data;
});

/**
 * Gets default date range based on current date (7-day range ending today)
 * Returns in DD/MM/YYYY format
 */
export function getDefaultDateRange(): { startDate: string, endDate: string } {
    const endDate = new Date(); // Today
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // 7-day span (inclusive)
    
    // Format as DD/MM/YYYY
    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    
    return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    };
}
