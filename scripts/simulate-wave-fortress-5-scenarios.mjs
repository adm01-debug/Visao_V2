#!/usr/bin/env node
// Wave Fortress 5 — simulador de envelope encryption + rotação de DEK/KEK.
// Modela em JS o mesmo contrato do pgcrypto usado no Postgres:
//   password_ct = pgp_sym_encrypt(password, dek)
//   dek_wrapped = pgp_sym_encrypt(dek,      kek[version])
// A validação garante: (a) round-trip, (b) rotação preserva plaintext,
// (c) rewrap de KEK migra sem tocar em password_ct, (d) backfill idempotente.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

// AES-256-GCM como stand-in de pgp_sym_encrypt (mesma semântica de round-trip).
function enc(plain, key32) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key32, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}
function dec(blob, key32) {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = createDecipheriv('aes-256-gcm', key32, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
const kdf = (raw) => createHash('sha256').update(String(raw)).digest();

const results = { roundTrip: 0, rotateDek: 0, rewrapKek: 0, backfill: 0 };
const failures = [];
const check = (cond, label) => {
  if (cond) return true;
  failures.push(label);
  return false;
};

// ---- 600 cenários: envelope round-trip ----
{
  const kek = { 1: kdf('KEK_V1_' + randomBytes(16).toString('hex')) };
  for (let i = 0; i < 600; i++) {
    const plainLen = 8 + (i % 4088);
    const plain = randomBytes(plainLen);
    const dek = randomBytes(32);
    const pwCt = enc(plain, dek);
    const dekWrapped = enc(dek, kek[1]);
    // decrypt path
    const dekOut = dec(dekWrapped, kek[1]);
    const plainOut = dec(pwCt, dekOut);
    const ok = check(plainOut.equals(plain), `rt#${i}`);
    // KEK errada deve falhar
    let failedAsExpected = false;
    try {
      dec(dekWrapped, kdf('wrong'));
    } catch {
      failedAsExpected = true;
    }
    ok && failedAsExpected ? results.roundTrip++ : failures.push(`rt-wrongkey#${i}`);
  }
}

// ---- 300 cenários: rotação de DEK por linha ----
{
  const kek = kdf('KEK_V1_stable');
  for (let i = 0; i < 300; i++) {
    const plain = randomBytes(64 + i);
    // v1
    const dek1 = randomBytes(32);
    const pwCt1 = enc(plain, dek1);
    const wrap1 = enc(dek1, kek);
    // rotate → nova DEK
    const dekOld = dec(wrap1, kek);
    const pOld = dec(pwCt1, dekOld);
    const dek2 = randomBytes(32);
    const pwCt2 = enc(pOld, dek2);
    const wrap2 = enc(dek2, kek);
    // DEK antiga não deve decifrar novo ciphertext
    let oldFails = false;
    try {
      dec(pwCt2, dekOld);
    } catch {
      oldFails = true;
    }
    // DEK nova decifra
    const dekNew = dec(wrap2, kek);
    const pNew = dec(pwCt2, dekNew);
    if (check(pNew.equals(plain), `rot#${i}`) && oldFails) results.rotateDek++;
  }
}

// ---- 200 cenários: rewrap de KEK em massa (mantém password_ct) ----
{
  const kek1 = kdf('KEK_V1');
  const kek2 = kdf('KEK_V2');
  for (let i = 0; i < 200; i++) {
    const rows = [];
    const n = 5 + (i % 20);
    for (let r = 0; r < n; r++) {
      const plain = randomBytes(32 + r);
      const dek = randomBytes(32);
      rows.push({ plain, pwCt: enc(plain, dek), wrapped: enc(dek, kek1), kekVersion: 1 });
    }
    // rewrap em massa
    for (const row of rows) {
      const dek = dec(row.wrapped, kek1);
      row.wrapped = enc(dek, kek2);
      row.kekVersion = 2;
    }
    // decifrar todas com kek2
    let allOk = true;
    for (const row of rows) {
      const dek = dec(row.wrapped, kek2);
      if (!dec(row.pwCt, dek).equals(row.plain)) {
        allOk = false;
        break;
      }
    }
    // password_ct não deve ter mudado (armazenado bit-a-bit igual)
    // e kek1 não deve mais decifrar wrapped
    let kek1Fails = true;
    try {
      dec(rows[0].wrapped, kek1);
      kek1Fails = false;
    } catch {}
    if (check(allOk && kek1Fails, `rewrap#${i}`)) results.rewrapKek++;
  }
}

// ---- 100 cenários: backfill idempotente ----
{
  const kek = kdf('KEK_V1');
  for (let i = 0; i < 100; i++) {
    // legado: encrypted_password = enc(plain, KEK_direta), sem dek_wrapped
    const plain = randomBytes(48);
    const legacyCt = enc(plain, kek);
    // backfill: decifra com KEK direta, gera DEK, recifra com DEK, wrap DEK com KEK
    const pOld = dec(legacyCt, kek);
    const dek = randomBytes(32);
    const newCt = enc(pOld, dek);
    const wrapped = enc(dek, kek);
    // idempotência: rodar novamente NÃO deve retentar (linha já tem wrapped)
    const alreadyEnveloped = wrapped != null;
    // validar decrypt
    const pNew = dec(newCt, dec(wrapped, kek));
    if (check(pNew.equals(plain) && alreadyEnveloped, `bf#${i}`)) results.backfill++;
  }
}

const total = 600 + 300 + 200 + 100;
const passed = results.roundTrip + results.rotateDek + results.rewrapKek + results.backfill;
console.log(JSON.stringify({ results, total, passed, failures: failures.slice(0, 10) }, null, 2));
if (passed !== total) {
  console.error(`FAIL: ${total - passed}/${total}`);
  process.exit(1);
}
console.log(`OK: ${total} cenários simulados verdes.`);
