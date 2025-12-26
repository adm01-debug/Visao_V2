/**
 * Retry Utility
 */
export interface RetryOptions { maxAttempts?: number; delay?: number; backoff?: number; onRetry?: (error: Error, attempt: number) => void; }
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = 2, onRetry } = options;
  let lastError: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (error) {
      lastError = error as Error;
      onRetry?.(lastError, attempt);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delay * Math.pow(backoff, attempt - 1)));
    }
  }
  throw lastError!;
}
