export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly maxTokens: number;
    private readonly refillInterval: number;
    private readonly tokenRate: number; // Tokens added per millisecond

    constructor(maxTokens: number, refillInterval: number) {
        this.maxTokens = maxTokens;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
        this.refillInterval = refillInterval;
        // Calculate token rate per millisecond for gradual refill
        this.tokenRate = maxTokens / refillInterval;
    }

    tryAcquire(): boolean {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }

    private refill(): void {
        const now = Date.now();
        const elapsedMs = now - this.lastRefill;
        
        if (elapsedMs > 0) {
            // Add tokens based on elapsed time
            const newTokens = elapsedMs * this.tokenRate;
            
            // Update token count, but don't exceed max
            this.tokens = Math.min(this.tokens + newTokens, this.maxTokens);
            
            // Update last refill time
            this.lastRefill = now;
        }
    }
}