/**
 * Onda 143 — `fleet-health`: endpoint de consulta da saúde da frota.
 *
 * Por que existe: hoje a tela lê `cameras` + `camera_health_state` direto do
 * cliente e agrega no navegador. Isso funciona para a UI, mas não é integrável
 * com segurança por terceiros (outro app, um painel de TV, um script): cada
 * consumidor teria de reimplementar a agregação e o contrato de estados.
 *
 * Modelo de acesso — três camadas, nenhuma delas dispensável:
 *  1. `verify_jwt = true` no config: a plataforma rejeita assinatura inválida
 *     antes mesmo de a função rodar.
 *  2. `getUser()` (revalida no servidor de Auth) + exigência de papel atribuído
 *     em `user_roles`. Sessão válida sem papel NÃO é autorização.
 *  3. Cliente Supabase com o JWT do chamador (anon key, jamais service role):
 *     a RLS continua sendo a única fonte de verdade sobre QUAIS câmeras a
 *     pessoa enxerga. Usar service role aqui transformaria o endpoint num
 *     vazamento de frota inteira.
 *
 * Somente leitura: sem POST de mutação, sem efeito colateral.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

type HealthState = 'online' | 'degraded' | 'offline' | 'unknown';

const STATES: readonly HealthState[] = ['online', 'degraded', 'offline', 'unknown'];
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

interface HealthRow {
  camera_id: string;
  state: string | null;
  consecutive_failures: number | null;
  last_check_at: string | null;
  last_state_change_at: string | null;
  last_latency_ms: number | null;
  last_message: string | null;
}

interface CameraRow {
  id: string;
  name: string | null;
  location: string | null;
  status: string | null;
}

function json(body: unknown, status: number, req: Request, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}

/** Estado desconhecido é preservado como `unknown` — nunca promovido a `online`. */
function normalizeState(value: string | null): HealthState {
  return (STATES as readonly string[]).includes(value ?? '') ? (value as HealthState) : 'unknown';
}

function clampLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, n));
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, req, { Allow: 'GET, POST, OPTIONS' });
  }

  // Barreira barata antes de qualquer ida ao banco: protege contra varredura
  // anônima do endpoint por IP mesmo sem token válido.
  const ipLimit = checkRateLimit(req, RATE_LIMITS.standard, 'fleet-health', getCorsHeaders(req));
  if (!ipLimit.allowed) return ipLimit.response;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401, req);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  if (!SUPABASE_URL || !ANON_KEY) {
    return json({ error: 'misconfigured' }, 500, req);
  }

  // Cliente do CHAMADOR: a RLS decide o recorte. Nunca service role.
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await client.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return json({ error: 'unauthorized' }, 401, req);
  }

  // Autorização: sessão válida não basta, é preciso papel atribuído.
  const { data: roleRows, error: roleErr } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (roleErr) {
    return json({ error: 'authorization_failed' }, 500, req);
  }
  const roles = (roleRows ?? []).map((r) => String((r as { role: unknown }).role));
  if (roles.length === 0) {
    return json({ error: 'forbidden', reason: 'no_role_assigned' }, 403, req);
  }

  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get('limit'));
  const stateParam = url.searchParams.get('state');
  const stateFilter = (STATES as readonly string[]).includes(stateParam ?? '')
    ? (stateParam as HealthState)
    : null;

  const [camerasRes, healthRes] = await Promise.all([
    client.from('cameras').select('id, name, location, status').order('name').limit(MAX_LIMIT),
    client
      .from('camera_health_state')
      .select(
        'camera_id, state, consecutive_failures, last_check_at, last_state_change_at, last_latency_ms, last_message'
      )
      .limit(MAX_LIMIT),
  ]);

  if (camerasRes.error || healthRes.error) {
    return json(
      { error: 'query_failed', details: camerasRes.error?.message ?? healthRes.error?.message },
      500,
      req
    );
  }

  const healthById = new Map<string, HealthRow>();
  for (const row of (healthRes.data ?? []) as HealthRow[]) healthById.set(row.camera_id, row);

  const all = ((camerasRes.data ?? []) as CameraRow[]).map((camera) => {
    const health = healthById.get(camera.id);
    return {
      camera_id: camera.id,
      name: camera.name ?? 'Sem nome',
      location: camera.location,
      camera_status: camera.status,
      // Câmera sem linha de saúde é `unknown`, não `offline`: nunca inventamos
      // uma falha que o monitor não observou.
      state: normalizeState(health?.state ?? null),
      consecutive_failures: health?.consecutive_failures ?? 0,
      last_check_at: health?.last_check_at ?? null,
      last_state_change_at: health?.last_state_change_at ?? null,
      last_latency_ms: health?.last_latency_ms ?? null,
      last_message: health?.last_message ?? null,
    };
  });

  // O resumo cobre SEMPRE a frota visível inteira; o filtro afeta só as linhas.
  const counts: Record<HealthState, number> = { online: 0, degraded: 0, offline: 0, unknown: 0 };
  let latencySum = 0;
  let latencyCount = 0;
  for (const item of all) {
    counts[item.state] += 1;
    if (typeof item.last_latency_ms === 'number') {
      latencySum += item.last_latency_ms;
      latencyCount += 1;
    }
  }

  const rows = stateFilter ? all.filter((item) => item.state === stateFilter) : all;

  return json(
    {
      generated_at: new Date().toISOString(),
      summary: {
        total: all.length,
        ...counts,
        uptime_pct: all.length > 0 ? Math.round((counts.online / all.length) * 100) : 0,
        avg_latency_ms: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
      },
      filter: { state: stateFilter, limit },
      truncated: rows.length > limit,
      rows: rows.slice(0, limit),
    },
    200,
    req
  );
});
