/**
 * VISÃO - Wave 9: Replicate proxy helper for InsightFace models.
 * Shared by insightface-* edge functions.
 */

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 800;
const MAX_POLL_MS = 30_000;

export interface ReplicatePrediction<TOutput = unknown> {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: TOutput;
  error?: string | null;
  logs?: string;
}

export interface RunModelOptions {
  /** Official model owner/name, e.g. `cjwbw/insightface-detect`. */
  model?: string;
  /** Community model version hash (used if model omitted). */
  version?: string;
  input: Record<string, unknown>;
  timeoutMs?: number;
}

/**
 * Run a Replicate model and wait for completion. Returns the parsed prediction.
 * Throws with `[status]: body` on error so the caller can surface it verbatim.
 */
export async function runReplicate<TOutput = unknown>(
  opts: RunModelOptions,
): Promise<ReplicatePrediction<TOutput>> {
  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token) throw new Error('[500]: REPLICATE_API_TOKEN not configured');

  const createUrl = opts.model
    ? `${REPLICATE_BASE}/models/${opts.model}/predictions`
    : `${REPLICATE_BASE}/predictions`;

  const body: Record<string, unknown> = { input: opts.input };
  if (opts.version) body.version = opts.version;

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=5',
    },
    body: JSON.stringify(body),
  });

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

  const deadline = Date.now() + (opts.timeoutMs ?? MAX_POLL_MS);
  while (
    pred.status === 'starting' || pred.status === 'processing'
  ) {
    if (Date.now() > deadline) {
      throw new Error(`[504]: replicate timeout after ${opts.timeoutMs ?? MAX_POLL_MS}ms`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(`${REPLICATE_BASE}/predictions/${pred.id}`, {
      headers: { Authorization: `Token ${token}` },
    });
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
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Parse `[status]: body` error thrown by runReplicate into a Response. */
export function errorResponse(err: unknown): Response {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/^\[(\d{3})\]:\s*(.*)$/s);
  const status = match ? Number(match[1]) : 500;
  const details = match ? match[2] : msg;
  return new Response(
    JSON.stringify({ error: 'insightface_failed', status, details }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
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
      Deno.env.get('SUPABASE_ANON_KEY')!,
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
