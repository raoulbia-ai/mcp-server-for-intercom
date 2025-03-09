export const MAX_MESSAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_REQUESTS_PER_MINUTE = 60;
export const CONNECTION_TIMEOUT = 300000; // 5 minutes

export const API_CONFIG = {
    BASE_URL: "https://api.intercom.io",
    VERSION: "2.9",
    DEFAULT_HEADERS: {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
};