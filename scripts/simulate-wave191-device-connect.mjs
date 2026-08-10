#!/usr/bin/env node
/**
 * Onda 191 — Simulação exaustiva da porta pública `device-connect`.
 *
 * A pergunta desta simulação não é "a lógica acerta?" (isso a Onda 190 já
 * provou), e sim: **um adversário aprende alguma coisa observando a porta?**
 * Varremos todo o espaço de estados e comparamos as respostas byte a byte,
 * caçando qualquer canal lateral: corpo diferente, status diferente, campo a
 * mais, motivo vazado, segredo ecoado.
 */
import { readFileSync } from 'node:fs';
import {
  ROTATION_GRACE_MS,
  authenticateDevice,
  revokeDevice,
  rotateSecret,
} from '../src/lib/devices/deviceEnrollment.ts';
import {
  CONNECT_SESSION_TTL_S,
  SECRET_MAX_LENGTH,
  SECRET_MIN_LENGTH,
  deniedResponse,
  malformedResponse,
  normalizeIp,
  parseConnectRequest,
  toAuditEntry,
  toPublicResponse,
} from '../supabase/functions/_shared/deviceConnect.ts';

let assertions = 0;
const failures = [];
function ok(condition, label) {
  assertions += 1;
  if (!condition) failures.push(label);
}

const CODE = 'ABCDEFGH1234';
const T0 = 1_700_000_000_000;
const CANON = JSON.stringify(deniedResponse());
const SECRET = 'S'.repeat(32);

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
// 1. Varredura combinatória: toda recusa é indistinguível
// ─────────────────────────────────────────────────────────────
const statuses = ['pending', 'active', 'revoked'];
const hashes = ['hash-v2', 'hash-v1', 'hash-v0', 'lixo', ''];
const clocks = [
  T0 - 1_000,
  T0,
  T0 + 1,
  T0 + ROTATION_GRACE_MS - 1,
  T0 + ROTATION_GRACE_MS,
  T0 + ROTATION_GRACE_MS + 1,
  T0 + 86_400_000,
];
const deadlines = [null, T0 - 1, T0 + 10, T0 + ROTATION_GRACE_MS, T0 + 10_000_000];
const graces = [
  { previousSecretHash: 'hash-v1', rotatedAt: T0 },
  { previousSecretHash: null, rotatedAt: null },
];
const lives = [null, T0 - 3_600_000, T0 + 3_600_000];

const deniedShapes = new Set();
const deniedReasons = new Set();
let accepted = 0;

for (const status of statuses) {
  for (const presented of hashes) {
    for (const now of clocks) {
      for (const expiresAt of deadlines) {
        for (const grace of graces) {
          for (const lastSeenAt of lives) {
            const reg = base({ status, expiresAt, lastSeenAt, ...grace });
            const verdict = authenticateDevice(reg, {
              deviceCode: CODE,
              presentedHash: presented,
              now,
            });
            const res = toPublicResponse(verdict);
            const serialized = JSON.stringify(res);

            if (verdict.outcome === 'denied') {
              accepted += 0;
              deniedShapes.add(serialized);
              deniedReasons.add(verdict.reason);
              ok(serialized === CANON, `I1 recusa distinguível (${status}/${verdict.reason})`);
              ok(res.status === 401, 'I1 status de recusa não canônico');
              ok(!('secretVersion' in res.body), 'I2 versão vazada em recusa');
              ok(!('reason' in res.body), 'I2 motivo vazado ao cliente');
            } else {
              accepted += 1;
              ok(res.status === 200, 'I3 aceitação sem 200');
              ok(res.body.connected === true, 'I3 aceitação sem confirmação');
              ok(res.body.sessionTtlSeconds === CONNECT_SESSION_TTL_S, 'I4 TTL não é do servidor');
              ok(typeof res.body.secretVersion === 'number', 'I3 versão ausente na aceitação');
              ok(res.body.secretStale === verdict.usedGrace, 'I5 aviso de segredo velho perdido');
            }

            // A trilha, ao contrário da resposta, precisa DISTINGUIR.
            const entry = toAuditEntry(verdict, {
              registrationId: 'reg-1',
              userId: 'user-1',
              deviceCode: CODE,
              sourceIp: '203.0.113.9',
            });
            ok(entry.reason === verdict.reason, 'I6 trilha perdeu o motivo real');
            ok(
              entry.event === (verdict.outcome === 'accepted' ? 'auth_accepted' : 'auth_denied'),
              'I6 evento da trilha divergiu do veredito'
            );
            ok(entry.used_grace === verdict.usedGrace, 'I6 graça não registrada');
            ok(JSON.stringify(entry).includes(SECRET) === false, 'I7 segredo apareceu na trilha');
          }
        }
      }
    }
  }
}

ok(deniedShapes.size === 1, `I1 existem ${deniedShapes.size} formas distintas de recusa`);
ok(deniedReasons.size >= 5, 'cobertura insuficiente de motivos internos');
ok(accepted > 0, 'nenhum caso de aceitação exercitado');

// ─────────────────────────────────────────────────────────────
// 2. Dispositivo desconhecido é indistinguível de segredo errado
// ─────────────────────────────────────────────────────────────
for (const now of clocks) {
  const unknown = authenticateDevice(null, { deviceCode: CODE, presentedHash: 'x', now });
  const wrong = authenticateDevice(base(), { deviceCode: CODE, presentedHash: 'x', now });
  ok(
    JSON.stringify(toPublicResponse(unknown)) === JSON.stringify(toPublicResponse(wrong)),
    'I8 varredura consegue distinguir dispositivo inexistente'
  );
  const entry = toAuditEntry(unknown, {
    registrationId: null,
    userId: null,
    deviceCode: CODE,
    sourceIp: null,
  });
  ok(
    entry.registration_id === null && entry.event === 'auth_denied',
    'I9 varredura não fica visível'
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Leitura do pedido: fuzz de corpo hostil
// ─────────────────────────────────────────────────────────────
const hostileBodies = [
  null,
  undefined,
  42,
  'texto',
  [],
  [{ deviceCode: CODE, secret: SECRET }],
  {},
  { deviceCode: CODE },
  { secret: SECRET },
  { deviceCode: 123, secret: SECRET },
  { deviceCode: CODE, secret: 123 },
  { deviceCode: CODE.toLowerCase(), secret: SECRET },
  { deviceCode: `${CODE} `, secret: SECRET },
  { deviceCode: CODE.slice(0, 11), secret: SECRET },
  { deviceCode: `${CODE}X`, secret: SECRET },
  { deviceCode: "ABC'; DROP TABLE device_registrations;--", secret: SECRET },
  { deviceCode: CODE, secret: 'x'.repeat(SECRET_MIN_LENGTH - 1) },
  { deviceCode: CODE, secret: 'x'.repeat(SECRET_MAX_LENGTH + 1) },
  { deviceCode: CODE, secret: SECRET, now: T0 - 10_000_000 },
  { deviceCode: CODE, secret: SECRET, sessionTtlSeconds: 999_999 },
  { deviceCode: CODE, secret: SECRET, status: 'active' },
  { deviceCode: CODE, secret: SECRET, __proto__: { admin: true } },
];

for (const body of hostileBodies) {
  const parsed = parseConnectRequest(body);
  assertions += 1;
  if (parsed.ok) {
    // Só os corpos genuinamente válidos passam — e sem nenhum campo extra.
    ok(Object.keys(parsed.value).length === 2, 'I10 campo extra sobreviveu à leitura');
    ok(parsed.value.deviceCode === CODE, 'I10 código adulterado na leitura');
    ok(parsed.value.secret === SECRET, 'I10 segredo adulterado na leitura');
  } else {
    const res = parsed.kind === 'not_json' ? malformedResponse() : deniedResponse();
    ok(res.body.connected === false, 'I11 corpo hostil não foi recusado');
    if (parsed.kind === 'unusable') {
      ok(JSON.stringify(res) === CANON, 'I11 corpo inválido gera resposta distinta da recusa');
    }
  }
}

// O relógio e o TTL nunca vêm do dispositivo.
const injected = parseConnectRequest({
  deviceCode: CODE,
  secret: SECRET,
  now: 1,
  sessionTtlSeconds: 9,
});
ok(
  injected.ok && !('now' in injected.value) && !('sessionTtlSeconds' in injected.value),
  'I12 dispositivo governou relógio ou prazo'
);

// ─────────────────────────────────────────────────────────────
// 4. Adversário: sobrevivência da graça e revogação em pleno voo
// ─────────────────────────────────────────────────────────────
let reg = base();
for (let version = 0; version < 200; version += 1) {
  const now = T0 + version * 60_000;
  const rot = rotateSecret({ registration: reg, nextSecretHash: `hash-r${version}`, now });
  ok(rot.ok, `I13 rotação ${version} recusada indevidamente`);
  reg = rot.registration;

  // A antepenúltima versão nunca volta, em nenhum instante da graça.
  for (const delta of [0, 1, ROTATION_GRACE_MS - 1, ROTATION_GRACE_MS, ROTATION_GRACE_MS + 1]) {
    const stale = authenticateDevice(reg, {
      deviceCode: CODE,
      presentedHash: version >= 1 ? `hash-r${version - 1}` : 'hash-v2',
      now: now + delta,
    });
    const expected = delta <= ROTATION_GRACE_MS;
    ok(
      (stale.outcome === 'accepted') === expected,
      `I14 graça mal aplicada (v${version}, +${delta}ms)`
    );
    if (stale.outcome === 'accepted') {
      ok(toPublicResponse(stale).body.secretStale === true, 'I15 aviso de segredo velho ausente');
    } else {
      ok(JSON.stringify(toPublicResponse(stale)) === CANON, 'I15 recusa de graça é distinguível');
    }

    // Duas versões atrás: nunca, em instante nenhum.
    if (version >= 2) {
      const ancient = authenticateDevice(reg, {
        deviceCode: CODE,
        presentedHash: `hash-r${version - 2}`,
        now: now + delta,
      });
      ok(ancient.outcome === 'denied', `I16 segredo antepenúltimo aceito (v${version})`);
    }
  }

  // Revogação no meio da graça mata as duas versões.
  const dead = revokeDevice(reg);
  for (const presented of [`hash-r${version}`, version >= 1 ? `hash-r${version - 1}` : 'hash-v2']) {
    const v = authenticateDevice(dead, {
      deviceCode: CODE,
      presentedHash: presented,
      now: now + 1,
    });
    ok(v.outcome === 'denied' && v.reason === 'revoked', 'I17 revogação não venceu a graça');
    ok(JSON.stringify(toPublicResponse(v)) === CANON, 'I17 revogado é distinguível na porta');
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Força bruta: nenhuma tentativa falha vira prova de vida
// ─────────────────────────────────────────────────────────────
const target = base({ lastSeenAt: T0 - 7_200_000 });
for (let i = 0; i < 20_000; i += 1) {
  const v = authenticateDevice(target, {
    deviceCode: CODE,
    presentedHash: `tentativa-${i}`,
    now: T0 + i,
  });
  ok(v.outcome === 'denied', 'I18 força bruta acertou');
  ok(
    v.registration === null || v.registration.lastSeenAt === target.lastSeenAt,
    'I19 tentativa falha moveu a prova de vida'
  );
}

// ─────────────────────────────────────────────────────────────
// 6. IP: nunca derrubar a trilha por um cabeçalho sujo
// ─────────────────────────────────────────────────────────────
const ipCases = [
  ['203.0.113.9', '203.0.113.9'],
  ['203.0.113.9, 70.41.3.18', '203.0.113.9'],
  ['  203.0.113.9  ', '203.0.113.9'],
  ['2001:db8::1', '2001:db8::1'],
  ['999.1.1.1', null],
  ['not-an-ip', null],
  ['', null],
  [null, null],
  ['x'.repeat(300), null],
  ["1.1.1.1'; DROP TABLE x;--", null],
];
for (const [input, expected] of ipCases) {
  ok(normalizeIp(input) === expected, `I20 IP mal normalizado: ${String(input).slice(0, 20)}`);
  const entry = toAuditEntry(
    authenticateDevice(null, { deviceCode: CODE, presentedHash: 'x', now: T0 }),
    {
      registrationId: null,
      userId: null,
      deviceCode: CODE,
      sourceIp: input,
    }
  );
  ok(entry.source_ip === expected, 'I21 trilha aceitou IP não normalizado');
}

// ─────────────────────────────────────────────────────────────
// 6b. Fuzz determinístico: 120 mil estados aleatórios, uma só recusa
// ─────────────────────────────────────────────────────────────
let seed = 0x191c0de;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

for (let i = 0; i < 120_000; i += 1) {
  const state = base({
    status: pick(statuses),
    secretVersion: 1 + Math.floor(rnd() * 50),
    secretIssuedAt: T0 + Math.floor((rnd() - 0.5) * 10_000_000),
    expiresAt: pick([null, T0 + Math.floor((rnd() - 0.5) * 10_000_000)]),
    previousSecretHash: pick(['hash-v1', null]),
    rotatedAt: null,
    lastSeenAt: pick([null, T0 - Math.floor(rnd() * 10_000_000)]),
  });
  if (state.previousSecretHash === null) {
    state.rotatedAt = null;
  } else {
    state.rotatedAt = T0 + Math.floor((rnd() - 0.5) * 1_000_000);
  }
  const now = T0 + Math.floor((rnd() - 0.5) * 20_000_000);
  const verdict = authenticateDevice(state, {
    deviceCode: pick([CODE, 'ZZZZZZZZ0000']),
    presentedHash: pick(['hash-v2', 'hash-v1', 'ruido']),
    now,
  });
  const res = toPublicResponse(verdict);
  if (verdict.outcome === 'denied') {
    ok(JSON.stringify(res) === CANON, `I23 fuzz produziu recusa distinguível (${verdict.reason})`);
  } else {
    ok(
      res.status === 200 && res.body.sessionTtlSeconds === CONNECT_SESSION_TTL_S,
      'I23 fuzz produziu aceitação fora do contrato'
    );
    ok(
      verdict.registration.lastSeenAt >= (state.lastSeenAt ?? now),
      'I24 prova de vida andou para trás'
    );
  }
}

// ─────────────────────────────────────────────────────────────
// 7. O código-fonte da porta não pode registrar segredo
// ─────────────────────────────────────────────────────────────
const connectSource = readFileSync('supabase/functions/_shared/deviceConnect.ts', 'utf8');
ok(!/console\.(log|info|warn|error)\s*\(.*secret/i.test(connectSource), 'I22 log com segredo');
ok(
  !/body\.secret/.test(connectSource.replace(/const secret = body\.secret;/, '')),
  'I22 segredo manuseado fora da leitura'
);

if (failures.length > 0) {
  console.error(`❌ Onda 191 — ${failures.length} falha(s) em ${assertions} asserções:`);
  for (const f of [...new Set(failures)].slice(0, 20)) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(
  `\n✅ Onda 191 — porta de conexão por registro: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`
);
