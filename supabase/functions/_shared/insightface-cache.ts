/**
 * VISÃO — Wave 11: dedicated edge_cache table with per-namespace TTL
 * and hit/miss telemetry into query_telemetry.
 *
 * Storage: public.edge_cache (service_role only, RLS locked).
 * Falls back gracefully — cache errors NEVER block the caller.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CACHE_PREFIX = 'if-enc:';

/** TTL (seconds) per namespace. Bump `MODEL_VERSION` in caller to invalidate. */
export const NAMESPACE_TTL: Record<string, number> = {
  encode: 24 * 3600, // ArcFace embedding — stable per identity
  detect: 1 * 3600, // RetinaFace bboxes — scene may change
  analyze: 6 * 3600, // Age/gender/emotion — semi-stable
  liveness: 15 * 60, // Anti-spoof — short TTL prevents replay abuse
};

let _client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  return _client;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const buf = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function cacheKey(namespace: string, modelVersion: string, hash: string): string {
  return `${CACHE_PREFIX}${namespace}:${modelVersion}:${hash}`;
}

/** Fire-and-forget telemetry. Never awaited by hot path. */
function recordTelemetry(namespace: string, outcome: 'hit' | 'miss', latencyMs: number): void {
  admin()
    .from('query_telemetry')
    .insert({
      query_type: `edge_cache_${outcome}`,
      table_name: 'edge_cache',
      metadata: { namespace, latency_ms: latencyMs },
      duration_ms: latencyMs,
    })
    .then(
      () => {},
      () => {}
    );
}

export async function readCache<T>(namespace: string, key: string): Promise<T | null> {
  const t0 = Date.now();
  try {
    const { data } = await admin()
      .from('edge_cache')
      .select('response')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    const outcome: 'hit' | 'miss' = data ? 'hit' : 'miss';
    recordTelemetry(namespace, outcome, Date.now() - t0);
    return (data?.response as T) ?? null;
  } catch {
    recordTelemetry(namespace, 'miss', Date.now() - t0);
    return null;
  }
}

export async function writeCache<T>(namespace: string, key: string, response: T): Promise<void> {
  const ttl = NAMESPACE_TTL[namespace];
  if (!ttl || ttl <= 0) return;
  if (response === null || response === undefined) return;
  try {
    const payload = JSON.stringify(response);
    const size = new TextEncoder().encode(payload).length;
    if (size > 1_048_576) return; // 1 MB CHECK constraint
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    await admin()
      .from('edge_cache')
      .upsert(
        {
          key,
          namespace,
          response: response as unknown as Record<string, unknown>,
          size_bytes: size,
          expires_at: expiresAt,
        },
        { onConflict: 'key' }
      );
  } catch (err) {
    console.warn('edge_cache write failed', err);
  }
}
