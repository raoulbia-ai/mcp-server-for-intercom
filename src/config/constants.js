/**
 * Configuration constants for the Intercom MCP Server
 */

// General server settings
export const CONNECTION_TIMEOUT = 300000; // 5 minutes
export const MAX_MESSAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limiting
export const MAX_REQUESTS_PER_MINUTE = 60; // Limit to 60 requests per minute

// Intercom-specific settings
export const INTERCOM_API_VERSION = '2.9'; // The API version to use
export const DEFAULT_PAGE_SIZE = 50; // Default number of results to fetch per page
export const MAX_RETRIES = 3; // Maximum number of retries for failed requests
export const RETRY_DELAY_MS = 1000; // Base delay for retries (1 second)