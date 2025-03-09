/**
 * Global server configuration for the Intercom MCP Server
 */

// Default API base URL for Intercom
let apiBaseUrl = "https://api.intercom.io";

// Server configuration
let serverConfig = {
    authToken: ''
};

/**
 * Set the API base URL for Intercom
 * @param {string} url - The base URL for the Intercom API
 */
export function setApiBaseUrl(url) {
    apiBaseUrl = url;
}

/**
 * Get the current API base URL
 * @returns {string} The current API base URL
 */
export function getApiBaseUrl() {
    return apiBaseUrl;
}

/**
 * Set the server configuration
 * @param {object} config - The server configuration
 */
export function setServerConfig(config) {
    serverConfig = { ...serverConfig, ...config };
}

/**
 * Get the current server configuration
 * @returns {object} The current server configuration
 */
export function getServerConfig() {
    return serverConfig;
}