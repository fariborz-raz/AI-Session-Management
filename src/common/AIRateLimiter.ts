/**
 * AI Service Rate Limiter
 * Prevents overwhelming AI APIs with too many requests
 */

export class AIRateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    // Default: 60 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request can be made, throw if rate limited
   */
  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.windowMs
    );

    // Check if we're at the limit
    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      throw new Error(
        `Rate limit exceeded. Maximum ${this.maxRequests} requests per ${this.windowMs / 1000}s. ` +
        `Please retry after ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }

    // Record this request
    this.requestTimes.push(now);
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(): number {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requestTimes.length);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requestTimes = [];
  }
}

