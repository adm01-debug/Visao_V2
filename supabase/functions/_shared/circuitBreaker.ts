/**
 * VISÃO - Wave 23/24: In-memory circuit breaker for outbound calls.
 *
 * States:
 *  - closed:   normal operation. On threshold consecutive failures → open.
 *  - open:     fail fast for `cooldownMs`. After cooldown → half-open.
 *  - half-open: allow a single probe. Success → closed; failure → open (reset cooldown).
 *
 * Wave 24: `onStateChange` fires exactly on transitions (never on stable
 * ticks or on repeated failures once already open). Callback errors are
 * swallowed — observability MUST NOT compromise the breaker.
 *
 * Scope: per Deno isolate (edge function instance). Not distributed.
 */

type State = 'closed' | 'open' | 'half-open';

export interface StateChangeEvent {
  key: string;
  prev: State;
  next: State;
  at: number;
  failures: number;
}

export interface CircuitOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  onStateChange?: (ev: StateChangeEvent) => void | Promise<void>;
}

interface CircuitEntry {
  state: State;
  failures: number;
  openedAt: number;
  opts: Required<Omit<CircuitOptions, 'onStateChange'>>;
  onStateChange?: CircuitOptions['onStateChange'];
}

const registry = new Map<string, CircuitEntry>();

const DEFAULTS = {
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
      opts: {
        failureThreshold: opts?.failureThreshold ?? DEFAULTS.failureThreshold,
        cooldownMs: opts?.cooldownMs ?? DEFAULTS.cooldownMs,
      },
      onStateChange: opts?.onStateChange,
    };
    registry.set(key, e);
  } else if (opts?.onStateChange && !e.onStateChange) {
    // Allow late-binding a listener without touching state.
    e.onStateChange = opts.onStateChange;
  }
  return e;
}

function transition(key: string, entry: CircuitEntry, next: State, now: number): void {
  if (entry.state === next) return;
  const prev = entry.state;
  entry.state = next;
  const cb = entry.onStateChange;
  if (!cb) return;
  try {
    const r = cb({ key, prev, next, at: now, failures: entry.failures });
    // Fire-and-forget for async callbacks — never await, never let it throw.
    if (r && typeof (r as Promise<void>).catch === 'function') {
      (r as Promise<void>).catch(() => {});
    }
  } catch { /* swallow — observability must never break the breaker */ }
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
    transition(key, entry, 'half-open', now);
  }

  try {
    const result = await fn();
    if (entry.state !== 'closed') transition(key, entry, 'closed', Date.now());
    entry.failures = 0;
    return result;
  } catch (err) {
    entry.failures += 1;
    if (entry.state === 'half-open') {
      entry.openedAt = Date.now();
      transition(key, entry, 'open', entry.openedAt);
    } else if (
      entry.state === 'closed' &&
      entry.failures >= entry.opts.failureThreshold
    ) {
      entry.openedAt = Date.now();
      transition(key, entry, 'open', entry.openedAt);
    }
    throw err;
  }
}

/** Snapshot of a single named breaker (for /health, tests). */
export function circuitSnapshot(key: string): Readonly<{
  state: State; failures: number; openedAt: number;
}> | null {
  const e = registry.get(key);
  return e ? { state: e.state, failures: e.failures, openedAt: e.openedAt } : null;
}

/** Snapshot of every breaker known to this isolate. */
export function listCircuits(): Array<{
  key: string; state: State; failures: number; openedAt: number;
}> {
  return Array.from(registry.entries()).map(([key, e]) => ({
    key, state: e.state, failures: e.failures, openedAt: e.openedAt,
  }));
}

/** Test-only reset. */
export function resetCircuit(key?: string): void {
  if (key) registry.delete(key);
  else registry.clear();
}
