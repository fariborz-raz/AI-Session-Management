/**
 * AI Service Retry Helper
 * Implements exponential backoff and retry logic for AI API calls
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

export class AIRetryHelper {
  /**
   * Retry an async function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    // Use environment config or defaults
    const {
      maxRetries = parseInt(process.env.AI_RETRY_MAX_ATTEMPTS || '3', 10),
      initialDelay = parseInt(process.env.AI_RETRY_INITIAL_DELAY || '1000', 10),
      maxDelay = parseInt(process.env.AI_RETRY_MAX_DELAY || '10000', 10),
      backoffMultiplier = 2,
      retryableStatusCodes = [429, 500, 502, 503, 504] // Rate limit, server errors
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const statusCode = error.statusCode || error.status || error.response?.status;
        const isRetryable = statusCode && retryableStatusCodes.includes(statusCode);

        // Don't retry on last attempt or non-retryable errors
        if (attempt === maxRetries || !isRetryable) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
        const finalDelay = delay + jitter;

        console.warn(
          `AI service call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(finalDelay)}ms...`,
          { statusCode, error: error.message }
        );

        await this.sleep(finalDelay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is rate limit related
   */
  static isRateLimitError(error: any): boolean {
    const statusCode = error.statusCode || error.status || error.response?.status;
    return statusCode === 429;
  }

  /**
   * Extract retry-after header if present
   */
  static getRetryAfter(error: any): number | null {
    const retryAfter = error.response?.headers?.['retry-after'] || 
                      error.headers?.['retry-after'];
    return retryAfter ? parseInt(retryAfter, 10) : null;
  }
}

