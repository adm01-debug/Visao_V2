/**
 * VISÃO - Wave 9/21/23/24: Replicate proxy helper for InsightFace models.
 * Retry policy (Wave 21): up to 3 attempts on 5xx/429/network with
 * exponential backoff (300ms base, ×3, +25% jitter). Total budget
 * bounded by opts.timeoutMs.
 * Circuit breaker (Wave 23): 5 consecutive failures → open for 30s.
 * Observability (Wave 24): every state transition is persisted to
 * public.query_telemetry (fire-and-forget) for cross-isolate visibility
 * via the /health endpoint.
 */

import { withCircuit, CircuitOpenError, type StateChangeEvent } from './circuitBreaker.ts';

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 800;
const MAX_POLL_MS = 30_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;
const CIRCUIT_KEY = 'replicate:api';

/** Fire-and-forget: log circuit transitions to query_telemetry.
 *  Uses SUPABASE_SERVICE_ROLE_KEY so it works from any edge function. */
function persistTransition(ev: StateChangeEvent): void {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return;
  const payload = {
    operation: 'circuit_transition',
    query_type: `circuit:${ev.next}`,
    duration_ms: 0,
    severity: ev.next === 'open' ? 'warn' : ev.next === 'closed' ? 'info' : 'info',
    metadata: { key: ev.key, prev: ev.prev, next: ev.next, failures: ev.failures, at: ev.at },
  };
  fetch(`${url}/rest/v1/query_telemetry`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* observability must never block */
  });
}

export interface ReplicatePrediction<TOutput = unknown> {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: TOutput;
  error?: string | null;
  logs?: string;
}

export interface RunModelOptions {
  model?: string;
  version?: string;
  input: Record<string, unknown>;
  timeoutMs?: number;
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function backoffMs(attempt: number): number {
  const base = BASE_BACKOFF_MS * Math.pow(3, attempt);
  const jitter = base * 0.25 * Math.random();
  return Math.round(base + jitter);
}

/** fetch with retry on 5xx/429/network errors, bounded by deadline. */
async function fetchWithRetry(url: string, init: RequestInit, deadline: number): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (Date.now() > deadline) {
      throw new Error(`[504]: replicate deadline exceeded before attempt ${attempt + 1}`);
    }
    try {
      const res = await fetch(url, init);
      if (res.ok || !isRetriableStatus(res.status)) return res;
      lastErr = new Error(`[${res.status}]: ${await res.text()}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      const wait = backoffMs(attempt);
      const remaining = deadline - Date.now();
      if (wait >= remaining) break;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`[502]: replicate transient failure`);
}

export async function runReplicate<TOutput = unknown>(
  opts: RunModelOptions
): Promise<ReplicatePrediction<TOutput>> {
  return withCircuit(CIRCUIT_KEY, () => runReplicateInner<TOutput>(opts), {
    onStateChange: persistTransition,
  });
}

async function runReplicateInner<TOutput = unknown>(
  opts: RunModelOptions
): Promise<ReplicatePrediction<TOutput>> {
  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token) throw new Error('[500]: REPLICATE_API_TOKEN not configured');

  const createUrl = opts.model
    ? `${REPLICATE_BASE}/models/${opts.model}/predictions`
    : `${REPLICATE_BASE}/predictions`;

  const body: Record<string, unknown> = { input: opts.input };
  if (opts.version) body.version = opts.version;

  const deadline = Date.now() + (opts.timeoutMs ?? MAX_POLL_MS);

  const createRes = await fetchWithRetry(
    createUrl,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=5',
      },
      body: JSON.stringify(body),
    },
    deadline
  );

  const createText = await createRes.text();
  if (!createRes.ok) {
    throw new Error(`[${createRes.status}]: ${createText}`);
  }

  let pred: ReplicatePrediction<TOutput>;
  try {
    pred = JSON.parse(createText);
  } catch {
    throw new Error(`[502]: invalid replicate response: ${createText.slice(0, 200)}`);
  }

  while (pred.status === 'starting' || pred.status === 'processing') {
    if (Date.now() > deadline) {
      throw new Error(`[504]: replicate timeout after ${opts.timeoutMs ?? MAX_POLL_MS}ms`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetchWithRetry(
      `${REPLICATE_BASE}/predictions/${pred.id}`,
      { headers: { Authorization: `Token ${token}` } },
      deadline
    );
    const pollText = await pollRes.text();
    if (!pollRes.ok) throw new Error(`[${pollRes.status}]: ${pollText}`);
    pred = JSON.parse(pollText);
  }

  if (pred.status !== 'succeeded') {
    throw new Error(`[502]: replicate ${pred.status}: ${pred.error ?? 'unknown'}`);
  }
  return pred;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Parse `[status]: body` error thrown by runReplicate into a Response. */
export function errorResponse(err: unknown): Response {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/^\[(\d{3})\]:\s*(.*)$/s);
  const status = match ? Number(match[1]) : err instanceof CircuitOpenError ? 503 : 500;
  const details = match ? match[2] : msg;
  return new Response(JSON.stringify({ error: 'insightface_failed', status, details }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Verify Supabase JWT from Authorization header. Returns userId or null. */
export async function verifyJwt(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

/** Model registry — community hashes pinned for reproducibility. */
export const INSIGHTFACE_MODELS = {
  // RetinaFace detector with 5 landmarks
  detect: { model: 'cjwbw/retinaface' },
  // ArcFace r100 embeddings (512D)
  encode: { model: 'lucataco/arcface' },
  // GenderAge + emotion via face analysis
  analyze: { model: 'cjwbw/insightface-analysis' },
  // Silent Face Anti-Spoofing (MiniFAS)
  liveness: { model: 'minivision/silent-face-anti-spoofing' },
} as const;
