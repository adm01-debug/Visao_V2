/**
 * VISÃO — Wave Storage 26: Alertmanager Silence API integration.
 *
 * Endpoints (admin-only, rate-limited 20 req/min per admin):
 *   POST   ?action=create       → cria silence (payload custom OU derivado de alerta)
 *   POST   ?action=from_alert   → cria silence a partir de { alertname, labels, durationMinutes, comment }
 *   GET    ?action=list         → lista silences ativos
 *   DELETE ?id=<silenceId>      → expira (encerra) silence
 *
 * Segurança:
 *  - Bearer JWT do usuário obrigatório; `has_role(user, 'admin')` obrigatório.
 *  - Nunca expõe ALERTMANAGER_URL / ALERTMANAGER_TOKEN ao cliente.
 *  - Duração: min 5 min, max 24 h (default 60 min). Rejeita `matchEverything`.
 *  - Toda operação registra em `alertmanager_silences_audit` (append-only).
 *  - Retries com backoff exponencial + timeout 8s por chamada upstream.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const AM_URL = (Deno.env.get('ALERTMANAGER_URL') || '').replace(/\/$/, '');
const AM_TOKEN = Deno.env.get('ALERTMANAGER_TOKEN') || '';
const AM_TIMEOUT_MS = 8_000;
const AM_MAX_RETRIES = 3;

const MIN_MINUTES = 5;
const MAX_MINUTES = 24 * 60;
const DEFAULT_MINUTES = 60;
const MAX_MATCHERS = 12;

const rlStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = rlStore.get(key);
  if (!e || now > e.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  e.count++;
  return e.count <= limit;
}

type Matcher = { name: string; value: string; isRegex?: boolean; isEqual?: boolean };

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
const MATCH_EVERYTHING_VALUES = new Set(['', '.*', '.+', '.*?', '^.*$']);

export function validateMatchers(input: unknown): { ok: true; matchers: Matcher[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'matchers_required' };
  if (input.length > MAX_MATCHERS) return { ok: false, error: 'too_many_matchers' };
  const out: Matcher[] = [];
  let hasNarrowing = false;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_matcher' };
    const m = raw as Record<string, unknown>;
    const name = typeof m.name === 'string' ? m.name.trim() : '';
    const value = typeof m.value === 'string' ? m.value : '';
    const isRegex = m.isRegex === true;
    const isEqual = m.isEqual !== false;
    if (!NAME_RE.test(name)) return { ok: false, error: `invalid_matcher_name:${name}` };
    if (value.length > 512) return { ok: false, error: 'matcher_value_too_long' };
    if (isRegex) {
      try { new RegExp(value); } catch { return { ok: false, error: 'invalid_regex' }; }
    }
    const isMatchAll = isRegex && isEqual && MATCH_EVERYTHING_VALUES.has(value);
    if (!isMatchAll) hasNarrowing = true;
    out.push({ name, value, isRegex, isEqual });
  }
  if (!hasNarrowing) return { ok: false, error: 'match_everything_forbidden' };
  return { ok: true, matchers: out };
}

export function clampDurationMinutes(v: unknown): number {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
}

export function buildMatchersFromAlert(payload: {
  alertname?: unknown;
  labels?: unknown;
}): Matcher[] {
  const matchers: Matcher[] = [];
  if (typeof payload.alertname === 'string' && NAME_RE.test(payload.alertname)) {
    matchers.push({ name: 'alertname', value: payload.alertname, isRegex: false, isEqual: true });
  }
  if (payload.labels && typeof payload.labels === 'object' && !Array.isArray(payload.labels)) {
    for (const [k, v] of Object.entries(payload.labels as Record<string, unknown>)) {
      if (!NAME_RE.test(k)) continue;
      if (typeof v !== 'string' || v.length === 0 || v.length > 512) continue;
      // Skip volatile/noisy labels that would over-narrow OR broaden silence
      if (k === 'instance' || k === '__name__') continue;
      matchers.push({ name: k, value: v, isRegex: false, isEqual: true });
      if (matchers.length >= MAX_MATCHERS) break;
    }
  }
  return matchers;
}

async function callAlertmanager(path: string, init: RequestInit): Promise<Response> {
  if (!AM_URL) throw new Error('alertmanager_url_missing');
  const url = `${AM_URL}${path}`;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= AM_MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AM_TIMEOUT_MS);
    try {
      const headers = new Headers(init.headers || {});
      headers.set('Accept', 'application/json');
      if (init.body) headers.set('Content-Type', 'application/json');
      if (AM_TOKEN) headers.set('Authorization', `Bearer ${AM_TOKEN}`);
      const res = await fetch(url, { ...init, headers, signal: ctrl.signal });
      clearTimeout(timer);
      // Retry only on 5xx / 429; 4xx are terminal
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`am_http_${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
    if (attempt < AM_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('am_unreachable');
}

async function audit(
  supabase: ReturnType<typeof createClient>,
  entry: {
    action: string;
    silence_id: string | null;
    user_id: string;
    matchers: Matcher[] | null;
    duration_minutes: number | null;
    comment: string | null;
    status: 'ok' | 'error';
    error_message?: string | null;
  },
) {
  try {
    await supabase.from('alertmanager_silences_audit').insert({
      action: entry.action,
      silence_id: entry.silence_id,
      actor_user_id: entry.user_id,
      matchers: entry.matchers,
      duration_minutes: entry.duration_minutes,
      comment: entry.comment,
      status: entry.status,
      error_message: entry.error_message ?? null,
    });
  } catch { /* audit best-effort */ }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || (req.method === 'DELETE' ? 'expire' : 'list');

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' });
  const user = userData.user;

  const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (!isAdmin) return json(403, { error: 'forbidden' });

  if (!rateLimit(user.id)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  const createdBy = user.email || user.id;

  try {
    if (req.method === 'GET' && action === 'list') {
      const res = await callAlertmanager('/api/v2/silences', { method: 'GET' });
      const body = await res.json().catch(() => []);
      return json(res.ok ? 200 : 502, res.ok ? { silences: body } : { error: 'am_error', details: body });
    }

    if (req.method === 'DELETE' || action === 'expire') {
      const id = url.searchParams.get('id') || '';
      if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) return json(400, { error: 'invalid_silence_id' });
      const res = await callAlertmanager(`/api/v2/silence/${id}`, { method: 'DELETE' });
      const ok = res.ok || res.status === 404;
      await audit(admin, {
        action: 'expire', silence_id: id, user_id: user.id,
        matchers: null, duration_minutes: null, comment: null,
        status: ok ? 'ok' : 'error',
        error_message: ok ? null : `am_http_${res.status}`,
      });
      return json(ok ? 200 : 502, { ok, silence_id: id });
    }

    if (req.method === 'POST' && (action === 'create' || action === 'from_alert')) {
      let payload: Record<string, unknown> = {};
      try { payload = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }

      let matchers: Matcher[];
      if (action === 'from_alert') {
        const derived = buildMatchersFromAlert(payload);
        const v = validateMatchers(derived);
        if (!v.ok) return json(400, { error: v.error });
        matchers = v.matchers;
      } else {
        const v = validateMatchers(payload.matchers);
        if (!v.ok) return json(400, { error: v.error });
        matchers = v.matchers;
      }

      const minutes = clampDurationMinutes(payload.durationMinutes);
      const comment = typeof payload.comment === 'string' && payload.comment.trim().length > 0
        ? payload.comment.trim().slice(0, 500)
        : null;
      if (!comment) return json(400, { error: 'comment_required' });

      const now = new Date();
      const endsAt = new Date(now.getTime() + minutes * 60_000);
      const amPayload = {
        matchers, comment, createdBy,
        startsAt: now.toISOString(), endsAt: endsAt.toISOString(),
      };

      const res = await callAlertmanager('/api/v2/silences', {
        method: 'POST', body: JSON.stringify(amPayload),
      });
      const body = await res.json().catch(() => ({}));
      const silenceId = typeof body?.silenceID === 'string' ? body.silenceID : null;

      await audit(admin, {
        action, silence_id: silenceId, user_id: user.id,
        matchers, duration_minutes: minutes, comment,
        status: res.ok ? 'ok' : 'error',
        error_message: res.ok ? null : `am_http_${res.status}`,
      });

      return json(res.ok ? 201 : 502,
        res.ok
          ? { silence_id: silenceId, endsAt: amPayload.endsAt, matchers, duration_minutes: minutes }
          : { error: 'am_error', details: body });
    }

    return json(400, { error: 'unknown_action' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await audit(admin, {
      action, silence_id: null, user_id: user.id,
      matchers: null, duration_minutes: null, comment: null,
      status: 'error', error_message: msg,
    });
    return json(502, { error: 'am_unreachable', details: msg });
  }
});
