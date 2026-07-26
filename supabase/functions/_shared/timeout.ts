// Shared timeout utilities for Edge Functions
// Prevents runaway external calls from consuming the full function budget.

import { classifyNetworkError, toNetworkError } from "./networkError.ts";



export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Wrap any promise with a hard timeout. If it doesn't settle in `ms`
 * milliseconds, rejects with `TimeoutError`.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${label} timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * `fetch` variant that aborts the request after `ms` milliseconds via
 * AbortController. Prefer this over `withTimeout(fetch(...))` for HTTP —
 * it also releases the underlying socket.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 15000,
): Promise<Response> {
  const controller = new AbortController();
  // `deadlineExpired` é a única forma de distinguir o nosso relógio do abort
  // do chamador: ambos chegam como AbortError.
  let deadlineExpired = false;
  const timer = setTimeout(() => {
    deadlineExpired = true;
    controller.abort();
  }, ms);

  // Gap corrigido na Onda 145: antes o `signal` do chamador era sobrescrito,
  // então cancelar a operação de fora não cancelava o fetch de verdade.
  const callerSignal = init.signal ?? null;
  const forwardAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    const kind = classifyNetworkError(err, { deadlineExpired });
    if (kind === "timeout") {
      throw new TimeoutError(`fetch ${String(input)} aborted after ${ms}ms`);
    }
    throw toNetworkError(err, { deadlineExpired });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", forwardAbort);
  }
}


/**
 * Default timeouts (ms) tuned for edge function budgets. Adjust per-call
 * when the upstream is known to be slower.
 */
export const DEFAULT_TIMEOUTS = {
  llm: 30_000, // Gemini / OpenAI chat completions
  webhook: 10_000, // Telegram / Slack / generic webhook
  external_api: 15_000, // Everything else
  mapbox: 5_000, // Mapbox token exchange
} as const;
