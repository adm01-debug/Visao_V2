#!/usr/bin/env node
/**
 * Onda Fortress 2 — simulação de cenários (>=500)
 * Cobre: rotação de chave, idempotência, autorização, rate-limit,
 * validação de payload, round-trip encrypt/decrypt lógico.
 */
import crypto from 'node:crypto';

let ok = 0,
  fail = 0;
const errs = [];
const check = (name, cond) => {
  if (cond) ok++;
  else {
    fail++;
    errs.push(name);
  }
};

// --- helpers (espelham a lógica do backend) ---
const fingerprint = (key) => crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
const encrypt = (plain, key) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(key).digest(),
    iv
  );
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
};
const decrypt = (b64, key) => {
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, 12),
    tag = raw.subarray(12, 28),
    data = raw.subarray(28);
  const d = crypto.createDecipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(key).digest(),
    iv
  );
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
};

// URL parse (mesmo comportamento do extract_url_credentials)
const extract = (url) => {
  const m = url.match(/^(rtsp|rtsps|http|https):\/\/([^:@\/]+):([^@]+)@(.+)$/);
  if (!m) return { user: null, pass: null, sanitized: url };
  return {
    user: decodeURIComponent(m[2]),
    pass: decodeURIComponent(m[3]),
    sanitized: `${m[1]}://${m[4]}`,
  };
};

// --- cenários ---

// 1) Rate-limit sliding window (60s / 30 req)
const RL = { max: 30, win: 60_000 };
const rlStore = new Map();
const rlCheck = (ip, t) => {
  const e = rlStore.get(ip);
  if (!e || t > e.reset) {
    rlStore.set(ip, { c: 1, reset: t + RL.win });
    return true;
  }
  e.c++;
  return e.c <= RL.max;
};
for (let i = 1; i <= 40; i++) check(`rl-ip1-${i}`, rlCheck('1.1.1.1', 1000) === i <= 30);
for (let i = 1; i <= 30; i++) check(`rl-ip2-${i}`, rlCheck('2.2.2.2', 1000) === true);
check('rl-reset', rlCheck('1.1.1.1', 70_000) === true);

// 2) Validação de chave
const validateKey = (k) => typeof k === 'string' && k.length >= 16;
check('key-null', !validateKey(null));
check('key-short', !validateKey('short'));
check('key-16', validateKey('a'.repeat(16)));
check('key-64', validateKey('a'.repeat(64)));

// 3) Validação de action (Zod-like)
const ACTIONS = new Set(['store', 'reveal', 'audit', 'migrate_batch', 'rotate_key']);
['store', 'reveal', 'audit', 'migrate_batch', 'rotate_key'].forEach((a) =>
  check(`act-${a}`, ACTIONS.has(a))
);
['delete', 'drop', '', 'x', 'STORE'].forEach((a) => check(`act-bad-${a}`, !ACTIONS.has(a)));

// 4) Autorização: comum só toca próprias câmeras; admin toca todas
const canWrite = (role, ownerId, actorId) => role === 'admin' || ownerId === actorId;
check('auth-owner-self', canWrite('operator', 'u1', 'u1'));
check('auth-other-user', !canWrite('operator', 'u1', 'u2'));
check('auth-admin-any', canWrite('admin', 'u1', 'u2'));

// 5) URLs sem credencial (skip)
['rtsp://cam.local/stream', 'http://192.168.0.1/live', 'https://public.example.com/h/1'].forEach(
  (u) => {
    const { user } = extract(u);
    check(`skip-noauth-${u}`, user === null);
  }
);

// 6) URLs com senha contendo caracteres especiais URL-encoded
const specials = [
  ['pa%40ss', 'pa@ss'],
  ['p%3Ass', 'p:ss'],
  ['p%2Fss', 'p/ss'],
  ['%C3%A7%C3%A3o', 'ção'],
  ['sp%20ace', 'sp ace'],
];
specials.forEach(([enc, dec], idx) => {
  const url = `rtsp://user:${enc}@host/path`;
  const p = extract(url);
  check(`special-${idx}-pass`, p.pass === dec);
  check(`special-${idx}-sanitized`, p.sanitized === 'rtsp://host/path');
});

// 7) Round-trip encrypt/decrypt — 400 URLs aleatórias
const KEY_A = crypto.randomBytes(32).toString('hex'); // 64 chars
const KEY_B = crypto.randomBytes(32).toString('hex');
for (let i = 0; i < 400; i++) {
  const user = `u${i}${crypto.randomBytes(2).toString('hex')}`;
  const pass = crypto.randomBytes(6 + (i % 12)).toString('base64url');
  const url = `rtsp://${user}:${encodeURIComponent(pass)}@10.0.${i % 256}.${(i * 7) % 256}:554/live${i}`;
  const p = extract(url);
  check(`rt-extract-${i}`, p.user === user && p.pass === pass);
  const ct = encrypt(pass, KEY_A);
  check(`rt-decrypt-${i}`, decrypt(ct, KEY_A) === pass);
  // rotação: re-encriptar com KEY_B
  const ct2 = encrypt(decrypt(ct, KEY_A), KEY_B);
  check(`rt-rotate-${i}`, decrypt(ct2, KEY_B) === pass);
  // chave errada rejeita
  let rejected = false;
  try {
    decrypt(ct, KEY_B);
  } catch {
    rejected = true;
  }
  check(`rt-wrongkey-${i}`, rejected);
}

// 8) key_fingerprint muda com rotação
check('fp-differs', fingerprint(KEY_A) !== fingerprint(KEY_B));
check('fp-stable', fingerprint(KEY_A) === fingerprint(KEY_A));

// 9) Idempotência de store (UNIQUE camera_id)
const store = new Map();
const upsert = (cid, ct) => store.set(cid, ct);
upsert('c1', 'enc1');
upsert('c1', 'enc2');
upsert('c2', 'x');
check('idem-size', store.size === 2);
check('idem-latest', store.get('c1') === 'enc2');

// 10) JSON malformado / body vazio
const parseBody = (raw) => {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
};
check('json-bad', parseBody('{not json').ok === false);
check('json-empty', parseBody('').ok === false);
check('json-good', parseBody('{"action":"audit"}').ok === true);

// 11) Nunca ecoa a chave em respostas
const sanitizeResponse = (obj, key) => JSON.stringify(obj).indexOf(key) === -1;
check('no-echo-key', sanitizeResponse({ ok: true, count: 3 }, KEY_A));

console.log(`\n[Fortress-2] ${ok} ok / ${fail} fail (total ${ok + fail})`);
if (fail) {
  console.log('Falhas:', errs.slice(0, 10));
  process.exit(1);
}
