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
 * Schema for the list_tickets endpoint
 * Validates parameters and provides defaults with backward compatibility
 */
export const ListTicketsArgumentsSchema = z.object({
    // Explicit date range parameters (preferred method)
    startDate: z.string().optional(), // ISO format date for range start
    endDate: z.string().optional(),   // ISO format date for range end
    
    // Alternative date filters - optional fields 
    yyyymm: z.string().optional(),  // Format: "202502" for Feb 2025
    days: z.number().optional(),    // Number of days, e.g., 4 for last 4 days
    
    // String filters - optional
    keyword: z.string().optional(),
    exclude: z.string().optional()
}).transform(data => {
    console.error("Raw arguments received:", JSON.stringify(data));
    
    // Handle explicit date range if provided
    if (data.startDate || data.endDate) {
        console.error(`Date range parameter(s) detected: startDate=${data.startDate}, endDate=${data.endDate}`);
        
        try {
            // Handle case where only one date is provided
            if (data.startDate && !data.endDate) {
                // If only start date, set end date to 7 days later (default range)
                const startDateObj = new Date(data.startDate);
                if (!isNaN(startDateObj.getTime())) {
                    const endDateObj = new Date(startDateObj);
                    endDateObj.setDate(endDateObj.getDate() + 7); // Default to 7 days
                    data.endDate = endDateObj.toISOString();
                    console.error(`Only startDate provided, setting endDate to ${data.endDate} (7 days later)`);
                } else {
                    console.error("Invalid startDate format");
                    data.startDate = undefined;
                }
            } 
            else if (data.endDate && !data.startDate) {
                // If only end date, set start date to 7 days earlier (default range)
                const endDateObj = new Date(data.endDate);
                if (!isNaN(endDateObj.getTime())) {
                    const startDateObj = new Date(endDateObj);
                    startDateObj.setDate(startDateObj.getDate() - 7); // Default to 7 days
                    data.startDate = startDateObj.toISOString();
                    console.error(`Only endDate provided, setting startDate to ${data.startDate} (7 days earlier)`);
                } else {
                    console.error("Invalid endDate format");
                    data.endDate = undefined;
                }
            }
            
            // Now validate the complete date range
            if (data.startDate && data.endDate) {
                const startDateObj = new Date(data.startDate);
                const endDateObj = new Date(data.endDate);
                
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                    console.error("Invalid date format in date range, using default values");
                    data.startDate = undefined;
                    data.endDate = undefined;
                } else if (endDateObj < startDateObj) {
                    console.error("End date is before start date, swapping them");
                    const temp = data.startDate;
                    data.startDate = data.endDate;
                    data.endDate = temp;
                }
                
                // If we have a valid date range, clear other date parameters
                if (data.startDate && data.endDate) {
                    data.yyyymm = undefined;
                    data.days = undefined;
                }
            }
        } catch (e) {
            console.error(`Error parsing date range: ${e}`);
            data.startDate = undefined;
            data.endDate = undefined;
        }
    }
    
    // Special handling for Claude's typical inputs
    if (typeof data === 'object' && data !== null) {
        // Claude often says "first week of February 2025" and sends these parameters
        if ('cutoffDate' in data && 'days' in data) {
            console.error(`Legacy: Both cutoffDate=${data.cutoffDate} and days=${data.days} detected`);
            try {
                // Convert to proper startDate/endDate
                const cutoffDateStr = String(data.cutoffDate);
                const startDateObj = new Date(cutoffDateStr);
                if (!isNaN(startDateObj.getTime())) {
                    const endDateObj = new Date(startDateObj);
                    endDateObj.setDate(endDateObj.getDate() + (data.days as number));
                    
                    data.startDate = startDateObj.toISOString();
                    data.endDate = endDateObj.toISOString();
                    console.error(`Converted to date range: ${data.startDate} to ${data.endDate}`);
                    
                    // Clear the old fields
                    delete data.cutoffDate;
                    delete data.days;
                }
            } catch (e) {
                console.error(`Failed to convert legacy parameters: ${e}`);
            }
        }
        // Handle plain cutoffDate (some Claude models use this)
        else if ('cutoffDate' in data) {
            console.error(`Legacy parameter 'cutoffDate' detected: ${data.cutoffDate}`);
            try {
                // Convert cutoffDate to startDate and calculate an endDate
                const cutoffDateStr = String(data.cutoffDate);
                const startDateObj = new Date(cutoffDateStr);
                if (!isNaN(startDateObj.getTime())) {
                    const endDateObj = new Date(startDateObj);
                    endDateObj.setDate(endDateObj.getDate() + 30); // Default to 30 days range
                    
                    data.startDate = startDateObj.toISOString();
                    data.endDate = endDateObj.toISOString();
                    console.error(`Converted cutoffDate to range: ${data.startDate} to ${data.endDate}`);
                    
                    // Remove legacy parameter
                    delete data.cutoffDate;
                }
            } catch (e) {
                console.error(`Error parsing cutoffDate: ${e}`);
            }
        }
    }
    
    // Continue with normal processing
    
    // Only use one date filter - if both are provided, prefer yyyymm
    if (data.yyyymm && data.days) {
        console.error("Both yyyymm and days provided, using yyyymm");
        data.days = undefined;
    }
    
    // Default to current month if no date filter specified
    if (!data.yyyymm && data.days === undefined) {
        data.yyyymm = defaultYearMonth();
    }

    // Validate yyyymm format if provided
    if (data.yyyymm && !isValidYearMonth(data.yyyymm)) {
        console.error(`Invalid yyyymm format: ${data.yyyymm}, using default month`);
        data.yyyymm = defaultYearMonth();
    }

    // Validate days range if provided
    if (data.days !== undefined) {
        // Ensure days is a number
        if (typeof data.days === 'string') {
            data.days = parseInt(data.days, 10);
        }
        
        // Check range
        if (isNaN(data.days) || data.days <= 0 || data.days > 90) {
            console.error(`Invalid days value: ${data.days}, using default month`);
            data.days = undefined;
            data.yyyymm = defaultYearMonth();
        }
    }
    
    console.error("Final parameters:", JSON.stringify(data));
    return data;
});

// We don't need these flag functions with the simpler approach

/**
 * Creates a default year-month (current month)
 */
function defaultYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    // Month is 0-indexed in JS, so add 1
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
}

/**
 * Validates that a string is in YYYYMM format
 */
function isValidYearMonth(str: string): boolean {
    // Check format is 6 digits
    if (!/^\d{6}$/.test(str)) {
        return false;
    }
    
    // Extract year and month
    const year = parseInt(str.substring(0, 4), 10);
    const month = parseInt(str.substring(4, 6), 10);
    
    // Basic validation
    return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

/**
 * Converts YYYYMM to start and end date ISO strings for that month
 */
export function getDateRangeFromYearMonth(yyyymm: string | undefined): { startDate: string, endDate: string } {
    if (!yyyymm) {
        throw new Error("Year-month is required");
    }
    
    const year = parseInt(yyyymm.substring(0, 4), 10);
    const month = parseInt(yyyymm.substring(4, 6), 10) - 1; // JS months are 0-indexed
    
    // Start date is first day of month at 00:00:00
    const startDate = new Date(year, month, 1);
    
    // End date is first day of next month at 00:00:00
    const endDate = new Date(year, month + 1, 1);
    
    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
}

/**
 * Calculates start and end dates for the past X days
 */
export function getDateRangeFromDays(days: number): { startDate: string, endDate: string } {
    if (days <= 0 || days > 90) {
        throw new Error("Days must be a positive number up to 90");
    }
    
    const now = new Date();
    // End date is now
    const endDate = now;
    
    // Start date is X days ago at the same time
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
}

/**
 * Gets date range based on provided parameters
 * Simplified version to work more reliably with the MCP tool
 */
export function getDateRange(args: { yyyymm?: string, days?: number }): { startDate: string, endDate: string } {
    if (args.yyyymm) {
        return getDateRangeFromYearMonth(args.yyyymm);
    } 
    else if (args.days) {
        return getDateRangeFromDays(args.days);
    } 
    else {
        // Default to current month if neither is specified
        return getDateRangeFromYearMonth(defaultYearMonth());
    }
}