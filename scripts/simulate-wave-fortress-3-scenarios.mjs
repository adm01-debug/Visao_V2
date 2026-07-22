#!/usr/bin/env node
/**
 * Onda Fortress 3 — simulação (>= 600 cenários).
 * Cobre: rehidratação de URL, fallback seguro, autorização service-role,
 * cache TTL + invalidação, rate-limit por worker, rotação em voo,
 * mascaramento de segredos em log.
 */
import crypto from 'node:crypto';

let ok = 0, fail = 0;
const errs = [];
const check = (name, cond) => { if (cond) ok++; else { fail++; errs.push(name); } };

// -------- helpers espelhando o backend --------
const rehydrate = (sanitized, user, pass) => {
  if (!user || !pass) return sanitized;
  const m = sanitized.match(/^([a-z]+):\/\/(.+)$/i);
  if (!m) return sanitized;
  return `${m[1]}://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${m[2]}`;
};

const MASK_RE = /:\/\/([^:/@\s]+):([^@\s]+)@/g;
const mask = (s) => typeof s === 'string' ? s.replace(MASK_RE, '://***:***@') : s;
const maskObj = (o) => JSON.parse(JSON.stringify(o), (_, v) => typeof v === 'string' ? mask(v) : v);

// cache com TTL
class TtlCache {
  constructor(ttl) { this.ttl = ttl; this.m = new Map(); }
  get(k, now) {
    const e = this.m.get(k);
    if (!e || now > e.exp) { this.m.delete(k); return null; }
    return e.v;
  }
  set(k, v, now) { this.m.set(k, { v, exp: now + this.ttl }); }
  invalidate(k) { this.m.delete(k); }
}

// rate-limit sliding window por prefixo
const RL_MAX = 120, RL_WIN = 60_000;
const rlStore = new Map();
const rlCheck = (key, t) => {
  const e = rlStore.get(key);
  if (!e || t > e.reset) { rlStore.set(key, { c: 1, reset: t + RL_WIN }); return true; }
  e.c++; return e.c <= RL_MAX;
};

// -------- 1) Rehidratação (>=250) --------
const schemes = ['rtsp', 'rtsps', 'http', 'https'];
const hosts = ['cam.local', '10.0.0.1', '[fe80::1]', 'gate.example.com'];
const ports = ['', ':554', ':8080', ':443'];
const paths = ['/live', '/stream/1', '/onvif?token=abc', '/h/1/main'];
const passes = ['p@ss', 'p:ss', 'p/ss', 'ção', 'sp ace', 'A1b2!', crypto.randomBytes(8).toString('base64url')];

let n = 0;
for (const s of schemes)
  for (const h of hosts)
    for (const port of ports)
      for (const p of paths)
        for (const pw of passes) {
          if (n++ >= 260) break;
          const user = `u${n}`;
          const sanitized = `${s}://${h}${port}${p}`;
          const url = rehydrate(sanitized, user, pw);
          const m = url.match(/^([a-z]+):\/\/([^:]+):([^@]+)@(.+)$/i);
          check(`rh-${n}`, !!m && decodeURIComponent(m[2]) === user && decodeURIComponent(m[3]) === pw && `${m[1]}://${m[4]}` === sanitized);
        }

// -------- 2) Fallback seguro (>=80) --------
for (let i = 0; i < 80; i++) {
  const pub = `http://public${i}.example.com/live`;
  // sem creds no cofre → devolve URL original
  check(`fb-pub-${i}`, rehydrate(pub, null, null) === pub);
  // cofre com creds e URL já limpa → rehidrata
  const r = rehydrate(pub, `u${i}`, `secret${i}`);
  check(`fb-vault-${i}`, r.startsWith('http://u') && r.includes('@public'));
}

// -------- 3) Autorização service-role (>=60) --------
const SERVICE_KEY = 'srv_' + crypto.randomBytes(16).toString('hex');
const isServiceRole = (h) => h === `Bearer ${SERVICE_KEY}`;
const cases = [
  ['', false], ['Bearer anon', false], ['Bearer authenticated', false],
  ['Bearer ' + crypto.randomBytes(20).toString('hex'), false],
  [`Bearer ${SERVICE_KEY}`, true],
];
for (let i = 0; i < 12; i++) for (const [h, exp] of cases) check(`sr-${i}-${h.slice(0,10)}`, isServiceRole(h) === exp);

// -------- 4) Cache TTL + invalidação (>=80) --------
const cache = new TtlCache(60_000);
for (let i = 0; i < 40; i++) {
  const cid = `c${i}`;
  cache.set(cid, `rtsp://u:p@h/${i}`, 1000);
  check(`ct-hit-${i}`, cache.get(cid, 1500) !== null);
  check(`ct-hit-59s-${i}`, cache.get(cid, 60_000) !== null);
  check(`ct-miss-61s-${i}`, cache.get(cid, 62_000) === null);
  cache.set(cid, `rtsp://u:p@h/${i}`, 100_000);
  cache.invalidate(cid);
  check(`ct-inv-${i}`, cache.get(cid, 100_100) === null);
}

// -------- 5) Rate-limit por worker (>=40) --------
const workers = ['ptz', 'health', 'restart', 'bandwidth'];
for (const w of workers) {
  const key = `vault-reveal-${w}:1.1.1.1`;
  for (let i = 1; i <= 130; i++) {
    const allowed = rlCheck(key, 1000);
    if (i <= 120) check(`rl-${w}-${i}`, allowed === true);
    else check(`rl-${w}-block-${i}`, allowed === false);
  }
}
// prefixos independentes: worker A esgotado não bloqueia B
check('rl-isolation-ptz-vs-health', rlStore.get('vault-reveal-health:1.1.1.1').c < 121);

// -------- 6) Rotação em voo (>=50) --------
const KEY_OLD = crypto.randomBytes(32).toString('hex');
const KEY_NEW = crypto.randomBytes(32).toString('hex');
const enc = (plain, k) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(k).digest(), iv);
  const e = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), e]).toString('base64');
};
const dec = (b64, k) => {
  const raw = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(k).digest(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
};
const dualRead = (ct, primary, secondary) => {
  try { return dec(ct, primary); } catch { return dec(ct, secondary); }
};
for (let i = 0; i < 50; i++) {
  const plain = `p${i}${crypto.randomBytes(4).toString('hex')}`;
  const ctOld = enc(plain, KEY_OLD);
  // in-flight: cache foi encriptado com OLD; leitor tenta NEW e cai no OLD
  check(`rot-inflight-${i}`, dualRead(ctOld, KEY_NEW, KEY_OLD) === plain);
  const ctNew = enc(plain, KEY_NEW);
  check(`rot-post-${i}`, dualRead(ctNew, KEY_NEW, KEY_OLD) === plain);
}

// -------- 7) Nunca logar segredo (>=40) --------
const rtspSecret = 'rtsp://admin:SuperSecret1!@cam.local:554/live';
for (let i = 0; i < 25; i++) {
  const entry = { level: 'info', msg: `probe done`, url: rtspSecret, retry: i };
  const line = JSON.stringify(maskObj(entry));
  check(`mask-json-${i}`, !line.includes('SuperSecret1!'));
  check(`mask-json-user-${i}`, !line.includes('admin:SuperSecret'));
}
for (const s of [
  `curl -v ${rtspSecret}`,
  `failed to open ${rtspSecret} timeout=5s`,
  `pipe ${rtspSecret} | ffmpeg`,
]) check(`mask-str-${s.slice(0,10)}`, !mask(s).includes('SuperSecret1!'));
// não deve alterar strings sem creds
check('mask-noop-1', mask('http://public/live') === 'http://public/live');
check('mask-noop-2', mask('no url here') === 'no url here');
check('mask-noop-null', mask(null) === null);

// -------- resumo --------
console.log(`\n[Fortress-3] ${ok} ok / ${fail} fail (total ${ok+fail})`);
if (fail) { console.log('Falhas:', errs.slice(0, 15)); process.exit(1); }
