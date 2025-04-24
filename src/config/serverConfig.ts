import { API_CONFIG } from "./constants.js";

interface ServerConfig {
    authToken?: string;
}

let serverConfig: ServerConfig = {};

export const setServerConfig = (config: Partial<ServerConfig>) => {
    serverConfig = { ...serverConfig, ...config };
};

export const getAuthToken = (toolName: string): string => {
    if (serverConfig.authToken) {
        return serverConfig.authToken;
    }
    throw new Error(`${toolName} requires an authToken. Please provide it in the request or configure it in Claude settings.`);
};

export const setApiBaseUrl = (url: string) => {
    API_CONFIG.BASE_URL = url;
};