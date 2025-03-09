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
 * Validates the cutoff date and provides a default value
 */
export const ListTicketsArgumentsSchema = z.object({
    cutoffDate: z.string().optional()
        .transform(val => val || defaultCutoffDate())
        .refine(val => isValidISODate(val), {
            message: "Invalid ISO date format"
        })
});

/**
 * Creates a default cutoff date (30 days ago)
 * Following Python script's approach of using a specific date
 */
function defaultCutoffDate(): string {
    const currentYear = new Date().getFullYear();
    // Default to January 1st of the current year, similar to Python script's approach
    return new Date(currentYear, 0, 1).toISOString();
}

/**
 * Validates that a string is a proper ISO date
 */
function isValidISODate(str: string): boolean {
    try {
        return Boolean(new Date(str).toISOString());
    } catch {
        return false;
    }
}