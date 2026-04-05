/**
 * Retry with exponential backoff for external API calls
 * Used primarily for AI gateway requests
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = delay * 0.2 * Math.random();
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Fetch with automatic retry and exponential backoff.
 * Only retries on server errors (5xx) by default.
 * Rate limit (429) and payment (402) errors are NOT retried.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      // Don't retry client errors (4xx) except retryable server errors
      if (response.ok || !cfg.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Clone response for potential retry (consume body to avoid leak)
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);

      if (attempt < cfg.maxRetries) {
        const delay = getDelay(attempt, cfg);
        console.log(JSON.stringify({
          level: "warn",
          msg: `Retry ${attempt + 1}/${cfg.maxRetries} after ${Math.round(delay)}ms`,
          status: response.status,
          url: url.substring(0, 50),
          ts: new Date().toISOString(),
        }));
        await sleep(delay);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < cfg.maxRetries) {
        const delay = getDelay(attempt, cfg);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("fetchWithRetry: all attempts failed");
}
