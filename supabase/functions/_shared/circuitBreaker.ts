/**
 * VISÃO - Wave 23: In-memory circuit breaker for outbound calls.
 *
 * States:
 *  - closed:   normal operation. On threshold consecutive failures → open.
 *  - open:     fail fast for `cooldownMs`. After cooldown → half-open.
 *  - half-open: allow a single probe. Success → closed; failure → open (reset cooldown).
 *
 * Scope: per Deno isolate (edge function instance). Not distributed.
 * Cheap safety net to avoid hammering a dead upstream and burning latency budget.
 */

type State = 'closed' | 'open' | 'half-open';

export interface CircuitOptions {
  failureThreshold?: number; // consecutive failures to open (default 5)
  cooldownMs?: number;       // time before half-open probe (default 30_000)
}

interface CircuitEntry {
  state: State;
  failures: number;
  openedAt: number;
  opts: Required<CircuitOptions>;
}

const registry = new Map<string, CircuitEntry>();

const DEFAULTS: Required<CircuitOptions> = {
  failureThreshold: 5,
  cooldownMs: 30_000,
};

function getEntry(key: string, opts?: CircuitOptions): CircuitEntry {
  let e = registry.get(key);
  if (!e) {
    e = {
      state: 'closed',
      failures: 0,
      openedAt: 0,
      opts: { ...DEFAULTS, ...opts },
    };
    registry.set(key, e);
  }
  return e;
}

export class CircuitOpenError extends Error {
  constructor(key: string, retryInMs: number) {
    super(`[503]: circuit open for "${key}", retry in ${retryInMs}ms`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Run `fn` guarded by a named circuit. Throws CircuitOpenError while open.
 * Success closes the circuit; thrown errors count as failure.
 */
export async function withCircuit<T>(
  key: string,
  fn: () => Promise<T>,
  opts?: CircuitOptions,
): Promise<T> {
  const entry = getEntry(key, opts);
  const now = Date.now();

  if (entry.state === 'open') {
    const elapsed = now - entry.openedAt;
    if (elapsed < entry.opts.cooldownMs) {
      throw new CircuitOpenError(key, entry.opts.cooldownMs - elapsed);
    }
    entry.state = 'half-open';
  }

  try {
    const result = await fn();
    // success → reset
    entry.failures = 0;
    entry.state = 'closed';
    return result;
  } catch (err) {
    entry.failures += 1;
    if (
      entry.state === 'half-open' ||
      entry.failures >= entry.opts.failureThreshold
    ) {
      entry.state = 'open';
      entry.openedAt = Date.now();
    }
    throw err;
  }
}

/** Introspection (tests / health): current state snapshot. */
export function circuitSnapshot(key: string): Readonly<CircuitEntry> | null {
  const e = registry.get(key);
  return e ? { ...e } : null;
}

/** Test-only reset. */
export function resetCircuit(key?: string): void {
  if (key) registry.delete(key);
  else registry.clear();
}
