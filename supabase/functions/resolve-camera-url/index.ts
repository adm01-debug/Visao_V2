// Wave Fortress 3 — resolve-camera-url
// Rehidrata a URL de stream de uma câmera para workers internos (service_role only).
// Nunca ecoa a URL final em logs. Cache in-memory 60s com invalidação Realtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { checkRateLimit, type RateLimitConfig } from '../_shared/rateLimiter.ts';
import { maskSecrets } from '../_shared/maskSecrets.ts';
import { recordEdgeError } from '../_shared/errorAudit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAULT_KEY = Deno.env.get('CAMERA_VAULT_KEY') ?? '';
const KEK_V1 = Deno.env.get('CAMERA_VAULT_KEK_V1') ?? '';

const bodySchema = z.object({
  camera_id: z.string().uuid(),
  purpose: z.enum(['ptz', 'health', 'restart', 'bandwidth', 'recording']),
});

const CACHE_TTL_MS = 60_000;
type CacheEntry = { url: string; source: 'vault' | 'plain'; exp: number };
const cache = new Map<string, CacheEntry>();
const WORKER_RL: RateLimitConfig = { maxRequests: 120, windowMs: 60_000 };

// Realtime cache-bust — inicializa uma vez por instância
let realtimeReady = false;
function ensureRealtimeInvalidator() {
  if (realtimeReady) return;
  realtimeReady = true;
  try {
    const rt = createClient(SUPABASE_URL, SERVICE_KEY);
    rt.channel('resolve-camera-url:vault')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'camera_credentials' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { camera_id?: string } | null;
          if (row?.camera_id) cache.delete(row.camera_id);
        }
      )
      .subscribe();
  } catch (_) {
    /* silencioso — probes seguem sem invalidação, apenas TTL */
  }
}

const j = (payload: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const log = (level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) => {
  // maskSecrets é rede-de-segurança: campos abaixo nunca deveriam conter a URL crua.
  const safe = maskSecrets({
    level,
    fn: 'resolve-camera-url',
    msg,
    ...meta,
    ts: new Date().toISOString(),
  });
  console.log(JSON.stringify(safe));
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const pre = handleCors(req);
  if (pre) return pre;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_KEY}`) {
    log('warn', 'unauthorized_call');
    return j({ error: 'service_role_required' }, 403, cors);
  }

  if (!VAULT_KEY || VAULT_KEY.length < 16) {
    log('error', 'vault_key_missing');
    return j({ error: 'vault_key_not_configured' }, 500, cors);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return j({ error: 'invalid_json' }, 400, cors);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success)
    return j({ error: 'validation_failed', details: parsed.error.flatten() }, 400, cors);
  const { camera_id, purpose } = parsed.data;

  const rl = checkRateLimit(req, WORKER_RL, `vault-reveal-${purpose}`, cors);
  if (!rl.allowed) return rl.response;

  ensureRealtimeInvalidator();

  const now = Date.now();
  const hit = cache.get(camera_id);
  if (hit && now < hit.exp) {
    log('info', 'cache_hit', { camera_id, purpose, source: hit.source });
    return j({ ok: true, url: hit.url, source: hit.source, cached: true }, 200, cors);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Envelope Encryption v2 primeiro; fallback para v1 legado.
  let url = '';
  if (KEK_V1 && KEK_V1.length >= 16) {
    const v2 = await admin.rpc('get_camera_stream_url_v2', {
      p_camera_id: camera_id,
      p_kek: KEK_V1,
    });
    if (!v2.error && typeof v2.data === 'string' && v2.data) url = v2.data;
    else if (v2.error) log('warn', 'v2_failed_fallback', { camera_id, err: v2.error.message });
  }
  if (!url) {
    // A funcao no banco declara `_camera_id`/`_key`; PostgREST resolve RPC por nome
    // de argumento, entao `p_*` era reportado como funcao inexistente (PGRST202).
    const v1 = await admin.rpc('get_camera_stream_url', {
      _camera_id: camera_id,
      _key: VAULT_KEY,
    });
    if (v1.error) {
      log('error', 'rpc_failed', { camera_id, purpose, err: v1.error.message });
      await recordEdgeError({
        function_name: 'resolve-camera-url',
        error_code: 'rpc_failed',
        http_status: 500,
        camera_id,
        run_from: 'cloud',
        message: v1.error.message,
        // Falha de RPC é dependência da nuvem: nenhuma câmera deve ser acusada.
        cloud_dependency: true,
        context: { purpose, rpc: 'get_camera_stream_url' },
      });
      return j({ error: 'rpc_failed', detail: v1.error.message }, 500, cors);
    }
    url = (v1.data as string | null) ?? '';
  }
  if (!url) return j({ error: 'camera_not_found_or_empty' }, 404, cors);

  // Heurística de origem: se contém `user:pass@`, veio do cofre; se não, é público.
  const source: 'vault' | 'plain' = /:\/\/[^:/@]+:[^@]+@/.test(url) ? 'vault' : 'plain';
  cache.set(camera_id, { url, source, exp: now + CACHE_TTL_MS });
  log('info', 'resolved', { camera_id, purpose, source, cache_hit: false });
  return j({ ok: true, url, source, cached: false }, 200, cors);
});
