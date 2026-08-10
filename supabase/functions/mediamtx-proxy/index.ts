// Edge Function: mediamtx-proxy
// -----------------------------------------------------------------------------
// Proxy AUTENTICADO para a Control API do MediaMTX.
// O front NUNCA fala direto com a :9997. Fluxo:
//   browser (JWT do usuário) -> esta função (verify_jwt=true) -> MediaMTX (Basic
//   auth, endereço de rede interna que jamais é exposto ao browser).
//
// Defesas aplicadas:
//   - Autenticação Supabase (assinatura verificada pela plataforma + requireAuth).
//   - Rate limiting por IP (RATE_LIMITS.standard).
//   - Allowlist de AÇÕES (list/get/add/remove) — nada de /v3/config/global/*.
//   - Sanitização de path name (anti path traversal) — primitiva fuzzada.
//   - Allowlist de campos do body (anti-RCE runOn*, anti prototype pollution, anti SSRF).
//   - Correção de bug: remove usa DELETE /v3/config/paths/delete/{name} (o hook
//     antigo usava POST .../remove/, que retorna 404).
//   - Gate de mutação por papel (MEDIAMTX_ADMIN_ROLES), com auditoria.
//   - Timeout defensivo no upstream + mascaramento de segredos nos logs.
// -----------------------------------------------------------------------------

import { requireAuth, type AuthUser } from '../_shared/auth.ts';
import { handleCors, addCorsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { maskSecrets } from '../_shared/maskSecrets.ts';
import { sanitizePathName, validatePathBody } from '../_shared/mediamtxPath.ts';

const FN = 'mediamtx-proxy';

// Secrets server-side — configurados via `supabase secrets set` (NUNCA VITE_).
const MEDIAMTX_API_URL = Deno.env.get('MEDIAMTX_API_URL') ?? '';
const MEDIAMTX_API_USER = Deno.env.get('MEDIAMTX_API_USER') ?? '';
const MEDIAMTX_API_PASS = Deno.env.get('MEDIAMTX_API_PASS') ?? '';
// Papéis autorizados a MUTAR streams. Vazio => qualquer autenticado (com log de alerta).
const ADMIN_ROLES = (Deno.env.get('MEDIAMTX_ADMIN_ROLES') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

type Level = 'info' | 'warn' | 'error';
const log = (level: Level, msg: string, meta: Record<string, unknown> = {}) =>
  console.log(
    JSON.stringify(maskSecrets({ level, fn: FN, msg, ...meta, ts: new Date().toISOString() }))
  );

function json(body: unknown, status: number, req: Request): Response {
  const res = new Response(body === null ? 'null' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(res, req);
}

// Fetch para o MediaMTX com Basic auth (injetado no servidor) e timeout defensivo.
async function mtxFetch(path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const auth = 'Basic ' + btoa(`${MEDIAMTX_API_USER}:${MEDIAMTX_API_PASS}`);
    return await fetch(MEDIAMTX_API_URL + path, {
      ...init,
      signal: ctrl.signal,
      headers: { ...(init.headers ?? {}), Authorization: auth },
    });
  } finally {
    clearTimeout(t);
  }
}

interface Payload {
  action?: string;
  name?: unknown;
  source?: unknown;
  config?: unknown;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pre = handleCors(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req);

  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, req);

  if (!MEDIAMTX_API_URL || !MEDIAMTX_API_USER || !MEDIAMTX_API_PASS) {
    log('error', 'missing-upstream-config');
    return json({ error: 'proxy-misconfigured' }, 500, req);
  }

  const rl = checkRateLimit(req, RATE_LIMITS.standard, FN, cors);
  if (!rl.allowed) return rl.response;

  let user: AuthUser;
  try {
    user = await requireAuth(req);
  } catch {
    return json({ error: 'unauthorized' }, 401, req);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ error: 'invalid-json' }, 400, req);
  }

  const action = payload.action;
  const mutating = action === 'add' || action === 'remove';

  if (mutating) {
    const authorized = ADMIN_ROLES.length === 0 ? true : ADMIN_ROLES.includes(user.role);
    if (!authorized) {
      log('warn', 'mutation-denied', { uid: user.id, role: user.role, action });
      return json({ error: 'forbidden' }, 403, req);
    }
    if (ADMIN_ROLES.length === 0) {
      log('warn', 'mutation-open-no-role-gate', { uid: user.id, action });
    }
  }

  try {
    switch (action) {
      case 'list': {
        const r = await mtxFetch('/v3/paths/list');
        const data = await r.json().catch(() => ({ items: [] }));
        return json({ items: data.items ?? [] }, r.ok ? 200 : 502, req);
      }

      case 'get': {
        const s = sanitizePathName(payload.name);
        if (!s.ok) return json({ error: 'invalid-name', reason: s.reason }, 400, req);
        // Concatenação CRUA: o sanitizador garante que não há traversal (invariante fuzzada).
        const r = await mtxFetch(`/v3/paths/get/${s.value}`);
        if (r.status === 404) return json(null, 404, req);
        const data = await r.json().catch(() => null);
        return json(data, r.ok ? 200 : 502, req);
      }

      case 'add': {
        const s = sanitizePathName(payload.name);
        if (!s.ok) return json({ error: 'invalid-name', reason: s.reason }, 400, req);

        const rawBody =
          payload.config && typeof payload.config === 'object'
            ? payload.config
            : { source: payload.source, sourceOnDemand: true, sourceOnDemandCloseAfter: '30s' };

        const v = validatePathBody(rawBody);
        if (!v.ok) {
          log('warn', 'body-rejected', { reason: v.reason, uid: user.id });
          return json({ error: 'invalid-config', reason: v.reason }, 400, req);
        }
        if (typeof v.value!.source !== 'string' || (v.value!.source as string).length < 3) {
          return json({ error: 'source-required' }, 400, req);
        }

        const r = await mtxFetch(`/v3/config/paths/add/${s.value}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(v.value),
        });
        const txt = await r.text();
        log('info', 'path-add', { uid: user.id, name: s.value, status: r.status });
        return json(
          r.ok
            ? { ok: true }
            : { error: 'upstream', detail: (maskSecrets({ d: txt }) as { d: string }).d },
          r.ok ? 200 : 502,
          req
        );
      }

      case 'remove': {
        const s = sanitizePathName(payload.name);
        if (!s.ok) return json({ error: 'invalid-name', reason: s.reason }, 400, req);
        // BUG FIX: verbo DELETE + endpoint /delete/ (o hook antigo usava POST /remove/ => 404).
        const r = await mtxFetch(`/v3/config/paths/delete/${s.value}`, { method: 'DELETE' });
        log('info', 'path-remove', { uid: user.id, name: s.value, status: r.status });
        return json(r.ok ? { ok: true } : { error: 'upstream' }, r.ok ? 200 : 502, req);
      }

      default:
        return json({ error: 'unknown-action' }, 400, req);
    }
  } catch (e) {
    const err = e as Error;
    const aborted = err?.name === 'AbortError';
    log('error', 'proxy-exception', { err: String(err?.message ?? err), aborted });
    return json({ error: aborted ? 'upstream-timeout' : 'proxy-error' }, aborted ? 504 : 500, req);
  }
});
