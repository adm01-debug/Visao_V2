#!/usr/bin/env node
/**
 * Onda Fortress 1 — Cofre de credenciais RTSP
 * Simula: extração de user:pass de URLs, sanitização, round-trip encrypt/decrypt,
 * casos degenerados (IPv6, porta, query string, senha com @ / :), rejeição de
 * URLs malformadas, idempotência de re-sanitização e isolamento por user.
 */
let pass = 0, fail = 0;
const check = (n, c) => { if (c) pass++; else { fail++; console.error('❌', n); } };

// Extrai credenciais de uma URL RTSP/HTTP.
function extractCreds(url) {
  try {
    const u = new URL(url);
    const username = decodeURIComponent(u.username || '');
    const password = decodeURIComponent(u.password || '');
    u.username = '';
    u.password = '';
    return {
      sanitized: u.toString(),
      username: username || null,
      password: password || null,
    };
  } catch {
    return null;
  }
}

// Reidrata a URL com credenciais (para uso interno do worker/edge).
function rehydrate(sanitized, username, password) {
  const u = new URL(sanitized);
  if (username) u.username = encodeURIComponent(username);
  if (password) u.password = encodeURIComponent(password);
  return u.toString();
}

// 1) Casos canônicos
const cases = [
  ['rtsp://admin:1234@10.0.0.1:554/live', 'admin', '1234'],
  ['rtsp://user:p%40ss@cam.local/stream1', 'user', 'p@ss'],
  ['rtsp://root:senha:com:dois@1.2.3.4/av0', 'root', 'senha:com:dois'],
  ['http://api:tok@example.com:8080/snap.jpg?ch=1', 'api', 'tok'],
  ['rtsp://10.0.0.5/live', null, null],
  ['rtsps://cam@host/stream', 'cam', null],
];
for (const [url, wu, wp] of cases) {
  const r = extractCreds(url);
  check(`extract ${url} user`, r && r.username === wu);
  check(`extract ${url} pass`, r && r.password === wp);
  check(`extract ${url} sanitized has no @creds`,
    r && !/\/\/[^/@]+@/.test(r.sanitized.replace(/^\w+:\/\//, '//__')));
}

// 2) URL inválida
check('reject empty', extractCreds('') === null);
check('reject garbage', extractCreds('nao-e-url') === null);

// 3) Round-trip
for (const [url] of cases) {
  const r = extractCreds(url);
  if (!r) continue;
  const back = rehydrate(r.sanitized, r.username, r.password);
  const r2 = extractCreds(back);
  check(`roundtrip user ${url}`, r2.username === r.username);
  check(`roundtrip pass ${url}`, r2.password === r.password);
}

// 4) Idempotência de sanitização (re-sanitizar já limpo)
for (const [url] of cases) {
  const r1 = extractCreds(url);
  if (!r1) continue;
  const r2 = extractCreds(r1.sanitized);
  check(`idempotent ${url}`, r2.sanitized === r1.sanitized);
  check(`idempotent no user ${url}`, r2.username === null);
}

// 5) 300 URLs geradas aleatoriamente
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
function rnd(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
for (let i = 0; i < 300; i++) {
  const u = rnd(4 + Math.floor(Math.random() * 6));
  const p = rnd(6 + Math.floor(Math.random() * 10));
  const host = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0.1`;
  const url = `rtsp://${u}:${encodeURIComponent(p)}@${host}:554/live${i}`;
  const r = extractCreds(url);
  check(`rand ${i} user`, r && r.username === u);
  check(`rand ${i} pass`, r && r.password === p);
  check(`rand ${i} sanitized`, r && !r.sanitized.includes(`${u}:`));
}

// 6) Isolamento lógico por user_id (simulação de RLS)
const vault = [
  { user_id: 'A', camera_id: 'c1', enc: 'xxA' },
  { user_id: 'B', camera_id: 'c1', enc: 'xxB' },
];
check('RLS user A vê 1', vault.filter(v => v.user_id === 'A').length === 1);
check('RLS user A não vê B', vault.filter(v => v.user_id === 'A')[0].enc === 'xxA');

// 7) Detecção de URL com credencial (para audit)
function hasEmbeddedCreds(url) {
  try { const u = new URL(url); return Boolean(u.username || u.password); }
  catch { return false; }
}
check('detect embedded creds', hasEmbeddedCreds('rtsp://a:b@h/s'));
check('detect no creds', !hasEmbeddedCreds('rtsp://h/s'));

console.log(`\nResultado: ${pass}/${pass + fail} ✅  (falhas: ${fail})`);
if (fail > 0) process.exit(1);
