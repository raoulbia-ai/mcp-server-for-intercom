import { z } from 'zod';
import { MessageSchema } from '../types/schemas.js';

export function validateMessage(data: unknown): boolean {
    try {
        MessageSchema.parse(data);
        return true;
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid message format: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Common date validation utility for validating and transforming DD/MM/YYYY format dates
 * @param dateStr Date string in DD/MM/YYYY format
 * @param isStartDate Whether this is a start date (sets to beginning of day) or end date (sets to end of day)
 * @returns ISO date string
 */
export function validateAndTransformDate(dateStr: string, isStartDate: boolean = true): string {
    if (!dateStr) {
        throw new Error('Date is required');
    }
    
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        throw new Error(`Invalid date format: ${dateStr}. Must be in DD/MM/YYYY format (e.g., 15/01/2025)`);
    }
    
    // Convert DD/MM/YYYY to Date object
    const [day, month, year] = dateStr.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
    
    if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
    }
    
    // Set to beginning or end of the day based on the type of date
    if (isStartDate) {
        dateObj.setHours(0, 0, 0, 0);
    } else {
        dateObj.setHours(23, 59, 59, 999);
    }
    
    return dateObj.toISOString();
}

/**
 * Validates that end date is not before start date
 * @param startDate Start date in ISO format
 * @param endDate End date in ISO format
 */
export function validateDateRange(startDate: string, endDate: string): void {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (endDateObj < startDateObj) {
        throw new Error("End date cannot be before start date");
    }
}

/**
 * Validates that the date range doesn't exceed the specified maximum days
 * @param startDate Start date in ISO format
 * @param endDate End date in ISO format
 * @param maxDays Maximum number of days allowed in the range
 */
export function validateMaxDateRange(startDate: string, endDate: string, maxDays: number): void {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    const maxRangeMs = maxDays * 24 * 60 * 60 * 1000; // max days in milliseconds
    const actualRangeMs = endDateObj.getTime() - startDateObj.getTime();
    
    if (actualRangeMs > maxRangeMs) {
        throw new Error(`Date range exceeds ${maxDays}-day maximum (${Math.round(actualRangeMs / (24 * 60 * 60 * 1000))} days). Please limit to ${maxDays} days or less.`);
    }
}