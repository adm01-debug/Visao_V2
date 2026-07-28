#!/usr/bin/env node
/**
 * Onda 190 — Simulação exaustiva da Conexão por Registro.
 *
 * Varre o espaço de estados do julgamento (status × prazo × versão apresentada
 * × relógio) e depois submete o livro a adversários: relógio para trás, rotação
 * em rajada, revogação no meio da graça e força bruta de segredo.
 */
import {
  ROTATION_GRACE_MS,
  authenticateDevice,
  isWellFormedCode,
  revokeDevice,
  rotateSecret,
  silenceMs,
} from '../src/lib/devices/deviceEnrollment.ts';

let assertions = 0;
const failures = [];
function ok(condition, label) {
  assertions += 1;
  if (!condition) failures.push(label);
}

const CODE = 'ABCDEFGH1234';
const T0 = 1_700_000_000_000;

const base = (over = {}) => ({
  deviceCode: CODE,
  status: 'active',
  secretHash: 'hash-v2',
  secretVersion: 2,
  secretIssuedAt: T0,
  previousSecretHash: 'hash-v1',
  rotatedAt: T0,
  expiresAt: null,
  lastSeenAt: T0 - 60_000,
  ...over,
});

// ─────────────────────────────────────────────────────────────
// 1) Varredura combinatória do julgamento
// ─────────────────────────────────────────────────────────────
const statuses = ['pending', 'active', 'revoked'];
const hashes = ['hash-v2', 'hash-v1', 'hash-v0', 'lixo', ''];
const expiries = [null, T0 - 1, T0 + 10_000, T0 + 10_000_000];
const rotatedAts = [null, T0, T0 - ROTATION_GRACE_MS, T0 - ROTATION_GRACE_MS - 1];
const clocks = [
  T0 - 1_000,
  T0,
  T0 + 1,
  T0 + ROTATION_GRACE_MS,
  T0 + ROTATION_GRACE_MS + 1,
  T0 + 20_000_000,
];

for (const status of statuses) {
  for (const presentedHash of hashes) {
    for (const expiresAt of expiries) {
      for (const rotatedAt of rotatedAts) {
        for (const now of clocks) {
          const reg = base({
            status,
            expiresAt,
            rotatedAt,
            previousSecretHash: rotatedAt === null ? null : 'hash-v1',
          });
          const v = authenticateDevice(reg, { deviceCode: CODE, presentedHash, now });

          // Invariante 2: revogado nunca entra.
          if (status === 'revoked') {
            ok(v.outcome === 'denied' && v.reason === 'revoked', 'revogado aceito');
          }
          // Invariante 3: prazo vencido nunca entra.
          if (status !== 'revoked' && expiresAt !== null && now >= expiresAt) {
            ok(v.outcome === 'denied' && v.reason === 'expired', 'expirado aceito');
          }
          // Invariante 5: relógio antes da emissão nunca aceita.
          if (
            status === 'active' &&
            now < T0 &&
            !(expiresAt !== null && now >= expiresAt)
          ) {
            ok(v.outcome === 'denied', 'relógio anômalo aceito');
          }
          // Invariante 7: recusa nunca move prova de vida.
          if (v.outcome === 'denied') {
            ok(v.registration === null || v.registration.lastSeenAt === reg.lastSeenAt,
              'recusa moveu lastSeenAt');
            ok(v.usedVersion === null && v.usedGrace === false, 'recusa reportou versão');
          }
          // Aceitação só com hash conhecido.
          if (v.outcome === 'accepted') {
            ok(presentedHash === 'hash-v2' || presentedHash === 'hash-v1',
              `aceitou hash desconhecido ${presentedHash}`);
            ok(v.registration.lastSeenAt >= now, 'aceitação não registrou vida');
            ok(v.registration.lastSeenAt >= reg.lastSeenAt, 'lastSeenAt andou para trás');
            if (presentedHash === 'hash-v1') {
              ok(v.usedGrace === true && v.usedVersion === 1, 'graça mal rotulada');
              ok(now - rotatedAt <= ROTATION_GRACE_MS, 'graça fora da janela');
            } else {
              ok(v.usedGrace === false && v.usedVersion === 2, 'versão vigente mal rotulada');
            }
          }
          // Determinismo: mesmo insumo, mesmo veredito.
          const again = authenticateDevice(reg, { deviceCode: CODE, presentedHash, now });
          ok(again.outcome === v.outcome && again.reason === v.reason, 'julgamento não determinístico');
          // Pureza: o registro de entrada nunca é mutado.
          ok(reg.lastSeenAt === base().lastSeenAt && reg.secretVersion === 2, 'entrada mutada');
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 2) Códigos malformados e dispositivo inexistente
// ─────────────────────────────────────────────────────────────
const badCodes = ['', 'abc', 'abcdefgh1234', 'ABCDEFGH123', 'ABCDEFGH12345', 'ABCDEFG 1234', null, 42, undefined, {}];
for (const code of badCodes) {
  ok(!isWellFormedCode(code), `código inválido aceito: ${String(code)}`);
  const v = authenticateDevice(base(), { deviceCode: code, presentedHash: 'hash-v2', now: T0 + 1 });
  ok(v.outcome === 'denied' && v.reason === 'malformed_code', 'código inválido passou');
  ok(v.registration === null, 'código inválido vazou registro');
}
for (const presentedHash of hashes) {
  const v = authenticateDevice(null, { deviceCode: CODE, presentedHash, now: T0 + 1 });
  ok(v.outcome === 'denied' && v.reason === 'unknown_device', 'desconhecido não recusado');
  // Invariante 6: público idêntico ao de segredo errado.
  const wrong = authenticateDevice(base(), { deviceCode: CODE, presentedHash: 'nada', now: T0 + 1 });
  ok(v.outcome === wrong.outcome, 'veredito público distingue existência');
}

// ─────────────────────────────────────────────────────────────
// 3) Rotação em rajada — só a versão imediatamente anterior sobrevive
// ─────────────────────────────────────────────────────────────
let reg = base({ previousSecretHash: null, rotatedAt: null, secretVersion: 1, secretHash: 'h1' });
const history = ['h1'];
for (let i = 2; i <= 40; i += 1) {
  const now = T0 + i * 1_000;
  const rot = rotateSecret({ registration: reg, nextSecretHash: `h${i}`, now });
  ok(rot.ok, `rotação ${i} recusada`);
  reg = rot.registration;
  history.push(`h${i}`);
  ok(reg.secretVersion === i, 'versão não incrementou');
  ok(reg.previousSecretHash === `h${i - 1}`, 'graça não é da versão anterior');

  for (const h of history) {
    const v = authenticateDevice(reg, { deviceCode: CODE, presentedHash: h, now: now + 1 });
    if (h === `h${i}`) ok(v.outcome === 'accepted' && !v.usedGrace, 'vigente recusado');
    else if (h === `h${i - 1}`) ok(v.outcome === 'accepted' && v.usedGrace, 'graça recusada');
    else ok(v.outcome === 'denied', `versão antiga ${h} ainda aceita na v${i}`);
  }
  // Fim da graça é um corte duro.
  const after = authenticateDevice(reg, {
    deviceCode: CODE,
    presentedHash: `h${i - 1}`,
    now: now + ROTATION_GRACE_MS + 1,
  });
  ok(after.outcome === 'denied' && after.reason === 'grace_window_closed', 'graça eterna');
}

// Rotação recusada em casos de governança
ok(rotateSecret({ registration: reg, nextSecretHash: reg.secretHash, now: T0 + 10 }).ok === false,
  'reemitiu o mesmo segredo');
ok(rotateSecret({ registration: revokeDevice(reg), nextSecretHash: 'novo', now: T0 + 10 }).ok === false,
  'revogado ressuscitou por rotação');
ok(rotateSecret({ registration: reg, nextSecretHash: 'novo', now: reg.secretIssuedAt - 1 }).ok === false,
  'rotação com relógio para trás');

// ─────────────────────────────────────────────────────────────
// 4) Revogação no meio da graça e idempotência
// ─────────────────────────────────────────────────────────────
const rotated = rotateSecret({ registration: base(), nextSecretHash: 'hash-v3', now: T0 + 100 }).registration;
for (let dt = 0; dt <= ROTATION_GRACE_MS; dt += 15_000) {
  const now = T0 + 100 + dt;
  ok(authenticateDevice(rotated, { deviceCode: CODE, presentedHash: 'hash-v2', now }).outcome === 'accepted',
    'graça deveria valer');
  const dead = revokeDevice(rotated);
  ok(dead.previousSecretHash === null && dead.rotatedAt === null, 'revogação manteve graça');
  for (const h of ['hash-v3', 'hash-v2', 'hash-v1']) {
    ok(authenticateDevice(dead, { deviceCode: CODE, presentedHash: h, now }).reason === 'revoked',
      'revogado julgado por segredo');
  }
  ok(revokeDevice(dead) === dead, 'revogação não idempotente');
}

// ─────────────────────────────────────────────────────────────
// 5) Força bruta: 100k hashes aleatórios jamais entram
// ─────────────────────────────────────────────────────────────
let seed = 20260728;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
for (let i = 0; i < 100_000; i += 1) {
  const guess = `h${Math.floor(rnd() * 1e9).toString(16)}`;
  const v = authenticateDevice(base(), { deviceCode: CODE, presentedHash: guess, now: T0 + 1 });
  ok(v.outcome === 'denied', 'força bruta acertou');
  ok(v.registration.lastSeenAt === base().lastSeenAt, 'força bruta manteve dispositivo "vivo"');
}

// ─────────────────────────────────────────────────────────────
// 6) Silêncio: clamp e ausência de contato
// ─────────────────────────────────────────────────────────────
ok(silenceMs(base({ lastSeenAt: null }), T0) === null, 'sem contato deveria ser desconhecido');
for (const dt of [-1_000_000, -1, 0, 1, 999_999]) {
  const s = silenceMs(base({ lastSeenAt: T0 }), T0 + dt);
  ok(s >= 0, 'silêncio negativo');
  ok(s === Math.max(0, dt), 'silêncio mal calculado');
}

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`\n❌ Onda 190 — ${failures.length} falhas (${unique.length} distintas):`);
  unique.slice(0, 20).forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✅ Onda 190 — conexão por registro: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`);
