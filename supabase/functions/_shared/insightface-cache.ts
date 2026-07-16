/**
 * VISÃO - Wave 10: Content-addressed cache for InsightFace encode calls.
 * Reuses public.idempotency_keys as a poor-man's KV. Cuts Replicate cost
 * ~6× for repeat frames (same face crop across seconds/minutes).
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CACHE_TTL_HOURS = 24;
const CACHE_PREFIX = 'if-enc:';

let _client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  return _client;
}

/** Hash arbitrary bytes/strings into a stable hex digest. */
export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const buf = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Derive a cache key that isolates namespaces + model version. */
export function cacheKey(namespace: string, modelVersion: string, hash: string): string {
  return `${CACHE_PREFIX}${namespace}:${modelVersion}:${hash}`;
}

/** Look up a cached response. Returns null on miss/expired/error. */
export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const { data } = await admin()
      .from('idempotency_keys')
      .select('response, created_at')
      .eq('key', key)
      .maybeSingle();
    if (!data) return null;
    const ageMs = Date.now() - new Date(data.created_at as string).getTime();
    if (ageMs > CACHE_TTL_HOURS * 3_600_000) return null;
    return data.response as T;
  } catch {
    return null;
  }
}

/** Persist a response. Best-effort; swallows errors so cache never blocks the request. */
export async function writeCache<T>(key: string, response: T): Promise<void> {
  try {
    await admin()
      .from('idempotency_keys')
      .upsert({ key, response: response as unknown as Record<string, unknown> }, { onConflict: 'key' });
  } catch (err) {
    console.warn('insightface-cache write failed', err);
  }
}
