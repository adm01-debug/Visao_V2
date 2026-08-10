/**
 * Retry with exponential backoff for external API calls
 * Used primarily for AI gateway requests.
 *
 * Onda 145: a decisão de repetir passou a ser derivada da regra única de
 * classificação (`networkError.ts`) em vez de "qualquer exceção é repetível".
 */

import {
  backoffFloorMs,
  classifyNetworkError,
  isRetryableKind,
  toNetworkError,
  type NetworkErrorKind,
} from './networkError.ts';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
  /** Per-attempt timeout in ms (uses AbortController). 0 disables. */
  timeoutMs: number;
  /**
   * Teto absoluto de parede para TODAS as tentativas somadas (ms). 0 desativa.
   * Sem isto, `maxRetries × timeoutMs + backoff` pode ultrapassar o orçamento
   * da própria função e o cliente recebe um 504 sem diagnóstico.
   */
  totalBudgetMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [500, 502, 503, 504],
  timeoutMs: 30_000, // default LLM deadline
  totalBudgetMs: 0,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDelay(attempt: number, config: RetryConfig, kind?: NetworkErrorKind): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = delay * 0.2 * Math.random();
  const capped = Math.min(delay + jitter, config.maxDelayMs);
  // Piso por classe: conexão recusada não deve ser martelada em 0ms.
  return Math.max(capped, kind ? Math.min(backoffFloorMs(kind), config.maxDelayMs) : 0);
}

/**
 * Fetch with automatic retry and exponential backoff.
 * Only retries on server errors (5xx) by default.
 * Rate limit (429) and payment (402) errors are NOT retried.
 * Falhas de transporte só são repetidas quando a classe é repetível — abort do
 * chamador, erro de protocolo e loop de redirecionamento saem na hora.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startedAt = Date.now();
  const budgetLeft = () =>
    cfg.totalBudgetMs > 0 ? cfg.totalBudgetMs - (Date.now() - startedAt) : Number.POSITIVE_INFINITY;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    const remaining = budgetLeft();
    if (remaining <= 0) break;

    // O deadline da tentativa nunca ultrapassa o que sobrou do orçamento total.
    const attemptTimeout =
      cfg.timeoutMs > 0
        ? Math.min(cfg.timeoutMs, remaining)
        : Math.min(remaining, Number.MAX_SAFE_INTEGER);
    const useController = cfg.timeoutMs > 0 || cfg.totalBudgetMs > 0;
    const controller = useController ? new AbortController() : null;
    let deadlineExpired = false;
    const timer = controller
      ? setTimeout(() => {
          deadlineExpired = true;
          controller.abort();
        }, attemptTimeout)
      : null;

    try {
      const response = await fetch(url, controller ? { ...init, signal: controller.signal } : init);
      if (timer) clearTimeout(timer);

      // Don't retry client errors (4xx) except retryable server errors
      if (response.ok || !cfg.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Consume body to avoid leaking the socket before retrying.
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);

      if (attempt < cfg.maxRetries) {
        const delay = Math.min(getDelay(attempt, cfg), Math.max(budgetLeft(), 0));
        if (delay <= 0 && budgetLeft() <= 0) break;
        console.log(
          JSON.stringify({
            level: 'warn',
            msg: `Retry ${attempt + 1}/${cfg.maxRetries} after ${Math.round(delay)}ms`,
            status: response.status,
            url: url.substring(0, 50),
            ts: new Date().toISOString(),
          })
        );
        await sleep(delay);
      }
    } catch (error) {
      if (timer) clearTimeout(timer);
      const kind = classifyNetworkError(error, { deadlineExpired });
      lastError = toNetworkError(error, { deadlineExpired });

      // Abort do chamador, protocolo quebrado e loop de redirect são
      // determinísticos: repetir só queima orçamento e esconde o defeito.
      if (!isRetryableKind(kind)) throw lastError;

      if (attempt < cfg.maxRetries) {
        const delay = Math.min(getDelay(attempt, cfg, kind), Math.max(budgetLeft(), 0));
        if (delay <= 0 && budgetLeft() <= 0) break;
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('fetchWithRetry: all attempts failed');
}
