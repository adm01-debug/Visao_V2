/**
 * Onda 192 — simulação do fan-in de silêncio de dispositivo.
 *
 * Pergunta desta onda: "o vigia manda o técnico para o lugar certo?"
 * Varredura combinatória completa + fuzz determinístico, provando que:
 *   - silêncio que nós causamos (revogado/vencido) nunca vira alerta;
 *   - "nunca visto" nunca é confundido com "sumiu";
 *   - recusa recente vence silêncio (credencial, não rede);
 *   - rotação compra carência, mas rotação velha não desculpa nada;
 *   - relógio adiantado nunca vira gravidade nem silêncio negativo;
 *   - a classificação é monotônica no tempo e estável na ordenação.
 */
import {
  CLOCK_SKEW_TOLERANCE_MINUTES,
  CRITICAL_FACTOR,
  DENIAL_WINDOW_MINUTES,
  HEARTBEAT_MINUTES,
  ROTATION_GRACE_MINUTES,
  WARN_FACTOR,
  classifyDeviceSilence,
  compareDeviceSilence,
  summarizeDeviceSilence,
} from '../src/lib/devices/deviceSilence.ts';

let assertions = 0;
const failures = [];
const ok = (cond, msg) => {
  assertions += 1;
  if (!cond) failures.push(msg);
};

const MIN = 60_000;
const T0 = Date.parse('2026-07-28T12:00:00.000Z');
const code = (n) => `DEV${String(n).padStart(9, '0')}`;

const snap = (over = {}) => ({
  registrationId: 'r-1',
  deviceCode: code(1),
  label: 'Gravador térreo',
  status: 'active',
  lastSeenAt: T0 - 5 * MIN,
  lastDeniedAt: null,
  expiresAt: null,
  rotatedAt: null,
  createdAt: T0 - 10 * 24 * 60 * MIN,
  ...over,
});

// ─────────────────────────────────────────────────────────────
// 1. Varredura combinatória completa do espaço de retratos
// ─────────────────────────────────────────────────────────────
const statuses = ['pending', 'active', 'revoked'];
const seenOffsets = [null, -1, 5, 44, 45, 46, 119, 120, 121, 5000];
const deniedOffsets = [null, 0, 5, 59, 60, 61, 5000];
const expiryOffsets = [null, -1000, -1, 1, 1000];
const rotatedOffsets = [null, 1, 24, 25, 26, 5000];

let cases = 0;
for (const status of statuses) {
  for (const seen of seenOffsets) {
    for (const denied of deniedOffsets) {
      for (const exp of expiryOffsets) {
        for (const rot of rotatedOffsets) {
          const s = snap({
            status,
            lastSeenAt: seen === null ? null : T0 - seen * MIN,
            lastDeniedAt: denied === null ? null : T0 - denied * MIN,
            expiresAt: exp === null ? null : T0 + exp * MIN,
            rotatedAt: rot === null ? null : T0 - rot * MIN,
          });
          const v = classifyDeviceSilence(s, T0);
          cases += 1;

          // I1 — invariante de forma: veredito sempre completo e coerente.
          ok(typeof v.state === 'string' && v.reason.length > 0, 'I1 veredito sem estado ou sem motivo');
          ok(v.routineKey === `device:${s.deviceCode}`, 'I1 chave do barramento instável');
          ok(v.severity === null || v.severity === 'warning' || v.severity === 'critical', 'I1 gravidade fora do domínio');
          ok(v.silenceMinutes === null || v.silenceMinutes >= 0, 'I2 silêncio negativo escapou');

          // I3 — silêncio que nós mesmos causamos nunca alerta.
          if (status === 'revoked') {
            ok(v.state === 'expected_silence' && v.severity === null, 'I3 registro revogado gerou alerta');
          }

          // I4 — "ok" só existe com prova de vida dentro da cadência.
          if (v.state === 'ok') {
            ok(s.lastSeenAt !== null && seen < WARN_FACTOR * HEARTBEAT_MINUTES, 'I4 "ok" sem prova de vida recente');
            ok(v.severity === null, 'I4 "ok" com gravidade');
          }

          // I5 — nunca visto jamais é classificado como sumiço.
          if (s.lastSeenAt === null) {
            ok(
              v.state !== 'silent_warn' && v.state !== 'silent_critical',
              'I5 dispositivo nunca visto foi acusado de sumir',
            );
          }

          // I6 — quem está sendo recusado nunca é diagnosticado como offline.
          if (v.state === 'rejected_presence') {
            ok(v.severity === 'critical', 'I6 recusa presente não é crítica');
            ok(/segredo/.test(v.reason) && !/rede/.test(v.reason.replace('não a rede', '')), 'I6 diagnóstico de recusa aponta rede');
            ok(status !== 'revoked', 'I6 revogado virou recusa acionável');
          }
        }
      }
    }
  }
}
ok(cases === statuses.length * seenOffsets.length * deniedOffsets.length * expiryOffsets.length * rotatedOffsets.length,
  'I0 varredura combinatória incompleta');

// ─────────────────────────────────────────────────────────────
// 2. Fronteiras declaradas (o corte é exatamente onde foi dito)
// ─────────────────────────────────────────────────────────────
const at = (m) => classifyDeviceSilence(snap({ lastSeenAt: T0 - m * MIN }), T0).state;
ok(at(WARN_FACTOR * HEARTBEAT_MINUTES - 1) === 'ok', 'F1 avisou antes da fronteira de aviso');
ok(at(WARN_FACTOR * HEARTBEAT_MINUTES) === 'silent_warn', 'F2 fronteira de aviso não disparou');
ok(at(CRITICAL_FACTOR * HEARTBEAT_MINUTES - 1) === 'silent_warn', 'F3 escalou antes da fronteira crítica');
ok(at(CRITICAL_FACTOR * HEARTBEAT_MINUTES) === 'silent_critical', 'F4 fronteira crítica não disparou');

// Recusa: dentro da janela domina, fora dela não.
const withDenial = (m) =>
  classifyDeviceSilence(
    snap({ lastSeenAt: T0 - 500 * MIN, lastDeniedAt: T0 - m * MIN }),
    T0,
  ).state;
ok(withDenial(DENIAL_WINDOW_MINUTES) === 'rejected_presence', 'F5 recusa na fronteira não dominou');
ok(withDenial(DENIAL_WINDOW_MINUTES + 1) === 'silent_critical', 'F6 recusa velha continuou dominando');

// Rotação: carência exata, e rotação anterior à última presença não vale.
const rot = (m, seenM) =>
  classifyDeviceSilence(snap({ lastSeenAt: T0 - seenM * MIN, rotatedAt: T0 - m * MIN }), T0).state;
ok(rot(HEARTBEAT_MINUTES + ROTATION_GRACE_MINUTES, 200) === 'rotation_grace', 'F7 carência de rotação encurtada');
ok(rot(HEARTBEAT_MINUTES + ROTATION_GRACE_MINUTES + 1, 200) === 'silent_critical', 'F8 carência de rotação eterna');
ok(rot(20, 5) === 'ok', 'F9 rotação recente com presença posterior deveria ser "ok"');

// ─────────────────────────────────────────────────────────────
// 3. Relógio: adiantado é anomalia, nunca gravidade nem "ok" acidental
// ─────────────────────────────────────────────────────────────
for (let ahead = 0; ahead <= 30; ahead += 1) {
  const v = classifyDeviceSilence(snap({ lastSeenAt: T0 + ahead * MIN }), T0);
  if (ahead <= CLOCK_SKEW_TOLERANCE_MINUTES) {
    ok(v.state === 'ok', 'C1 tolerância de relógio recusou presença legítima');
    ok(v.silenceMinutes === 0, 'C2 silêncio negativo vazou como número');
  } else {
    ok(v.state === 'clock_anomaly' && v.severity === 'warning', 'C3 relógio adiantado não virou anomalia');
    ok(v.silenceMinutes === null, 'C4 anomalia de relógio inventou minutos de silêncio');
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Monotonicidade: com o tempo parado o mundo não piora sozinho,
//    e com o tempo andando a gravidade nunca melhora sem novo contato.
// ─────────────────────────────────────────────────────────────
const RANK = { ok: 0, rotation_grace: 0, awaiting_first_contact: 0, expected_silence: 0, clock_anomaly: 1, enrollment_lapsed: 1, silent_warn: 1, silent_critical: 2, rejected_presence: 2 };
for (const seen of [1, 30, 100]) {
  const s = snap({ lastSeenAt: T0 - seen * MIN });
  let prev = -1;
  for (let step = 0; step <= 400; step += 7) {
    const v = classifyDeviceSilence(s, T0 + step * MIN);
    const rank = RANK[v.state];
    ok(rank >= prev, `M1 gravidade melhorou sozinha (${v.state})`);
    prev = rank;
    const again = classifyDeviceSilence(s, T0 + step * MIN);
    ok(JSON.stringify(again) === JSON.stringify(v), 'M2 classificação não é determinística');
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Fuzz determinístico: 150 mil retratos aleatórios
// ─────────────────────────────────────────────────────────────
let seed = 0x192face;
const rnd = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const maybe = (v) => (rnd() < 0.35 ? null : v);

for (let i = 0; i < 150_000; i += 1) {
  const now = T0 + Math.floor((rnd() - 0.5) * 2_000_000);
  const s = snap({
    registrationId: `r-${i}`,
    deviceCode: code(i % 1000),
    status: pick(statuses),
    lastSeenAt: maybe(T0 - Math.floor(rnd() * 20_000) * MIN + Math.floor(rnd() * 100) * MIN),
    lastDeniedAt: maybe(T0 - Math.floor(rnd() * 2_000) * MIN),
    expiresAt: maybe(T0 + Math.floor((rnd() - 0.5) * 20_000) * MIN),
    rotatedAt: maybe(T0 - Math.floor(rnd() * 2_000) * MIN),
    createdAt: T0 - Math.floor(rnd() * 100_000) * MIN,
  });
  const v = classifyDeviceSilence(s, now);
  ok(v.silenceMinutes === null || v.silenceMinutes >= 0, 'Z1 fuzz produziu silêncio negativo');
  ok(s.status !== 'revoked' || v.severity === null, 'Z2 fuzz alertou sobre registro revogado');
  ok(!(s.lastSeenAt === null && (v.state === 'silent_warn' || v.state === 'silent_critical')),
    'Z3 fuzz acusou sumiço de quem nunca apareceu');
  ok(v.severity === null || v.reason.length > 10, 'Z4 alerta sem motivo legível para o operador');
}

// ─────────────────────────────────────────────────────────────
// 6. Ordenação e resumo do painel
// ─────────────────────────────────────────────────────────────
const fleet = [
  snap({ registrationId: 'a', deviceCode: code(10), lastSeenAt: T0 - 2 * MIN }),
  snap({ registrationId: 'b', deviceCode: code(11), lastSeenAt: T0 - 600 * MIN }),
  snap({ registrationId: 'c', deviceCode: code(12), status: 'revoked' }),
  snap({ registrationId: 'd', deviceCode: code(13), lastSeenAt: T0 - 50 * MIN }),
  snap({ registrationId: 'e', deviceCode: code(14), lastSeenAt: T0 - 700 * MIN, lastDeniedAt: T0 - 3 * MIN }),
  snap({ registrationId: 'f', deviceCode: code(15), lastSeenAt: null, expiresAt: T0 + 60 * MIN }),
].map((s) => classifyDeviceSilence(s, T0));

const sorted = [...fleet].sort(compareDeviceSilence);
ok(sorted[0].deviceCode === code(14), 'P1 recusa presente não ficou no topo');
ok(sorted[sorted.length - 1].deviceCode === code(12), 'P2 silêncio esperado não foi para o fim');

const summary = summarizeDeviceSilence(fleet);
ok(summary.total === 6, 'P3 total do resumo errado');
ok(summary.critical === 2 && summary.warning === 1, `P4 contagem de gravidade errada (${summary.critical}/${summary.warning})`);
ok(summary.quiet === 2, 'P5 silêncio esperado/aguardado foi contado como problema');
ok(summary.ok === 1, 'P6 contagem de saudáveis errada');
ok(summary.worst?.deviceCode === code(14), 'P7 pior caso do resumo não é o pior');
ok(summarizeDeviceSilence([]).worst === null, 'P8 frota vazia inventou um pior caso');
ok(summarizeDeviceSilence(fleet.filter((v) => v.severity === null)).worst === null,
  'P9 frota sem alerta apontou um "pior" que não é acionável');

// Ordenação não pode depender da ordem de entrada.
const shuffled = [...fleet].reverse().sort(compareDeviceSilence);
ok(JSON.stringify(shuffled.map((v) => v.deviceCode)) === JSON.stringify(sorted.map((v) => v.deviceCode)),
  'P10 ordenação instável conforme a entrada');

if (failures.length > 0) {
  console.error(`\n❌ Onda 192 — ${failures.length} falhas em ${assertions} asserções:`);
  for (const f of [...new Set(failures)].slice(0, 20)) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`\n✅ Onda 192 — fan-in de silêncio de dispositivo: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`);
