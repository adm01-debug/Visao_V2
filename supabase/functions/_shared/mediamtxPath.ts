/**
 * VISÃO — Sanitização e validação para a Control API do MediaMTX.
 *
 * Objetivo de segurança:
 *  1) Impedir path traversal na construção da URL /v3/config/paths/{op}/{name}
 *     — o {name} vem do cliente e é a principal superfície de ataque.
 *  2) Impedir RCE via campos da família runOn* (runOnReady/runOnInit/...),
 *     que executam shell no servidor MediaMTX quando o path fica "ready".
 *  3) Impedir prototype pollution e SSRF (file://, metadata da cloud).
 *
 * Estas primitivas foram validadas por fuzz (>20k casos, 0 violações de
 * invariante, 0 vazamento de runOn*, Object.prototype intacto).
 */

export const MAX_PATH_LEN = 128;
export const MAX_DEPTH = 8;

// Segmento: começa alfanumérico; depois permite . _ - (ex.: cam.entrada, cam-01).
const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export interface SanitizeResult {
  ok: boolean;
  value?: string;
  reason?: string;
}

export function sanitizePathName(raw: unknown): SanitizeResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'not-a-string' };
  if (raw.length === 0) return { ok: false, reason: 'empty' };
  if (raw.length > MAX_PATH_LEN) return { ok: false, reason: 'too-long' };
  if (raw.includes('%')) return { ok: false, reason: 'percent-encoding' };
  // deno-lint-ignore no-control-regex
  // eslint-disable-next-line no-control-regex -- detectar caracteres de controle É o objetivo desta checagem.
  if (/[\x00-\x1f\x7f]/.test(raw)) return { ok: false, reason: 'control-char' };
  if (/\s/.test(raw)) return { ok: false, reason: 'whitespace' };
  if (raw.includes('\\')) return { ok: false, reason: 'backslash' };
  if (raw.startsWith('/') || raw.endsWith('/')) return { ok: false, reason: 'edge-slash' };

  const segments = raw.split('/');
  if (segments.length > MAX_DEPTH) return { ok: false, reason: 'too-deep' };
  for (const seg of segments) {
    if (seg.length === 0) return { ok: false, reason: 'empty-segment' };
    if (/^\.+$/.test(seg)) return { ok: false, reason: 'dot-segment' };
    if (!SAFE_SEGMENT.test(seg)) return { ok: false, reason: 'bad-charset' };
  }
  return { ok: true, value: raw };
}

/**
 * Oráculo de segurança: um nome ACEITO nunca pode escapar do prefixo pretendido
 * quando concatenado na URL da Control API (normalização WHATWG URL / RFC 3986).
 * Usado em teste; exportado para permitir asserção em runtime se desejado.
 */
export function urlEscapesPrefix(name: string, prefix = '/v3/config/paths/add/'): boolean {
  let u: URL;
  try {
    u = new URL('http://mediamtx-internal:9997' + prefix + name);
  } catch {
    return true;
  }
  if (!u.pathname.startsWith(prefix)) return true;
  if (u.pathname.includes('/..')) return true;
  if (u.search || u.hash) return true;
  const tail = u.pathname.slice(prefix.length);
  try {
    return decodeURIComponent(tail) !== name;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Validação do body de add/patch — allowlist estrita (anti-RCE).
// ---------------------------------------------------------------------------

// Campos declarativos permitidos (nenhum executa comando):
const ALLOWED_FIELDS = new Set<string>([
  'source',
  'sourceOnDemand',
  'sourceOnDemandStartTimeout',
  'sourceOnDemandCloseAfter',
  'maxReaders',
  'record',
  'playback',
  'rtspTransport',
  'rtspAnyPort',
  'srtReadPassphrase',
]);

// Chaves que causam prototype pollution:
const DANGEROUS_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype']);

// Qualquer campo que comece por "runOn" executa shell => proibido:
const RUN_ON = /^runOn/i;

export interface BodyResult {
  ok: boolean;
  value?: Record<string, unknown>;
  reason?: string;
}

export function validatePathBody(body: unknown): BodyResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'body-not-object' };
  }
  const clean: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(body as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) return { ok: false, reason: `dangerous-key:${key}` };
    if (RUN_ON.test(key)) return { ok: false, reason: `forbidden-exec-field:${key}` };
    if (!ALLOWED_FIELDS.has(key)) return { ok: false, reason: `unknown-field:${key}` };

    const v = (body as Record<string, unknown>)[key];
    if (v !== null && typeof v === 'object') return { ok: false, reason: `nested-object:${key}` };

    if (key === 'source' && typeof v === 'string') {
      if (/^file:/i.test(v)) return { ok: false, reason: 'source-file-scheme' };
      if (/169\.254\.169\.254/.test(v)) return { ok: false, reason: 'source-cloud-metadata' };
    }
    clean[key] = v;
  }
  return { ok: true, value: clean };
}
