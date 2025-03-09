export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly maxTokens: number;
    private readonly refillInterval: number;

    constructor(maxTokens: number, refillInterval: number) {
        this.maxTokens = maxTokens;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
        this.refillInterval = refillInterval;
    }

    tryAcquire(): boolean {
        this.refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    }

    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        if (elapsed >= this.refillInterval) {
            this.tokens = this.maxTokens;
            this.lastRefill = now;
        }
    }
}