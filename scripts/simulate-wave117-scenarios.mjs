#!/usr/bin/env node
/**
 * Onda 117 — Simulador exaustivo da escada de escalonamento.
 *
 * Varre o produto cartesiano de severidade × idade × nível atual × estado de
 * reconhecimento × estado de despacho × instante do último degrau, checando as
 * invariantes I1..I11 documentadas em `src/lib/maintenanceEscalation.ts`.
 *
 * Uso: `npm run simulate:wave117`
 */
import {
  DEFAULT_ESCALATION_THRESHOLDS,
  evaluateAlertEscalation,
  evaluateEscalations,
  targetLevelForAge,
} from '../src/lib/maintenanceEscalation.ts';

const T = DEFAULT_ESCALATION_THRESHOLDS;
const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const MIN = 60_000;

const SEVERITIES = /** @type {const} */ (['critical', 'warning']);
const LEVELS = [0, 1, 2, 3];
const AGES = [
  -120, -1, 0, 1, 15, 29, 30, 31, 60, 74, 75, 76, 119, 120, 121, 239, 240, 241, 359, 360, 361, 720,
  1439, 1440, 1441, 4320, 43200,
];
const LAST_STEP_AGES = [null, 0, 1, 29, 30, 31, 120, 5000];
const DISPATCHES = [
  { delivered: true, failedChannels: 0, neverAttempted: false },
  { delivered: true, failedChannels: 1, neverAttempted: false },
  { delivered: false, failedChannels: 2, neverAttempted: false },
  { delivered: false, failedChannels: 0, neverAttempted: true },
];
const ACKS = [null, 'old', 'fresh'];

let scenarios = 0;
let assertions = 0;
const failures = [];

function check(cond, label, ctx) {
  assertions += 1;
  if (!cond) failures.push(`${label} :: ${JSON.stringify(ctx)}`);
}

/** @returns {import('../src/lib/maintenanceEscalation.ts').AlertSnapshot} */
function snapshot({ severity, ageMin, level, lastStepAgeMin, dispatch, ack }) {
  return {
    id: `a-${scenarios}`,
    routine: 'partition_drain',
    severity,
    reason: 'teste',
    createdAtMs: NOW - ageMin * MIN,
    acknowledgedAtMs: ack === null ? null : ack === 'fresh' ? NOW - MIN : NOW - 5000 * MIN,
    escalationLevel: level,
    lastEscalatedAtMs: lastStepAgeMin === null ? null : NOW - lastStepAgeMin * MIN,
    dispatch,
  };
}

for (const severity of SEVERITIES) {
  const ceiling = T.maxLevel[severity];
  for (const ageMin of AGES) {
    for (const level of LEVELS) {
      for (const lastStepAgeMin of LAST_STEP_AGES) {
        for (const dispatch of DISPATCHES) {
          for (const ack of ACKS) {
            scenarios += 1;
            const alert = snapshot({ severity, ageMin, level, lastStepAgeMin, dispatch, ack });
            const d = evaluateAlertEscalation(alert, NOW);
            const ctx = { severity, ageMin, level, lastStepAgeMin, dispatch, ack, to: d.toLevel };

            // I1 — reconhecido nunca escala.
            if (ack !== null) check(!d.shouldEscalate && d.toLevel === d.fromLevel, 'I1', ctx);

            // I2 — nunca decresce.
            check(d.toLevel >= d.fromLevel, 'I2', ctx);

            // I3 — no máximo +1 por avaliação.
            check(d.toLevel - d.fromLevel <= 1, 'I3', ctx);

            // I4 — respeita o cooldown entre degraus.
            if (lastStepAgeMin !== null && lastStepAgeMin < T.minStepMinutes) {
              check(!d.shouldEscalate, 'I4', ctx);
            }

            // I5 — teto por severidade (nível de partida acima do teto não é
            // reduzido, mas também nunca é ultrapassado por um degrau novo).
            if (d.shouldEscalate) check(d.toLevel <= ceiling, 'I5', ctx);

            // I8 — idade negativa (relógio recuado) não escala.
            if (ageMin <= 0) check(!d.shouldEscalate, 'I8', ctx);

            // I11 — degrau para nível ≥ 2 sempre emite alerta no barramento.
            if (d.shouldEscalate) check(d.emitsAlert === d.toLevel >= 2, 'I11', ctx);

            // I9 — idempotência: aplicar o degrau e reavaliar não age de novo.
            if (d.shouldEscalate) {
              const applied = {
                ...alert,
                escalationLevel: d.toLevel,
                lastEscalatedAtMs: NOW,
              };
              check(!evaluateAlertEscalation(applied, NOW).shouldEscalate, 'I9', ctx);
            }
          }
        }
      }
    }
  }
}

// I6 — monotonicidade da idade: envelhecer nunca reduz o nível alvo.
// I7 — despacho não entregue nunca produz alvo menor que o entregue.
for (const severity of SEVERITIES) {
  for (const dispatch of DISPATCHES) {
    let previous = -1;
    for (const ageMin of AGES.filter((a) => a >= 0)) {
      scenarios += 1;
      const target = targetLevelForAge(severity, ageMin, dispatch);
      check(target >= previous, 'I6', { severity, ageMin, dispatch, target, previous });
      previous = target;

      const deliveredTarget = targetLevelForAge(severity, ageMin, DISPATCHES[0]);
      if (!dispatch.delivered) {
        check(target >= deliveredTarget, 'I7', { severity, ageMin, target, deliveredTarget });
      }
    }
  }
}

// I10 — independência da ordem de entrada no agregado.
const pool = [];
for (const severity of SEVERITIES) {
  for (const ageMin of [10, 45, 200, 700, 2000]) {
    for (const dispatch of DISPATCHES) {
      pool.push({
        ...snapshot({ severity, ageMin, level: 0, lastStepAgeMin: null, dispatch, ack: null }),
        // IDs precisam ser únicos: a comparação por ordem normaliza por alertId.
        id: `pool-${String(pool.length).padStart(3, '0')}`,
      });
    }
  }
}
const baseline = evaluateEscalations({ nowMs: NOW, alerts: pool });
for (let seed = 0; seed < 200; seed += 1) {
  scenarios += 1;
  const shuffled = [...pool];
  let state = seed * 2654435761 + 1;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const got = evaluateEscalations({ nowMs: NOW, alerts: shuffled });
  const norm = (v) =>
    JSON.stringify(
      [...v.decisions]
        .sort((a, b) => a.alertId.localeCompare(b.alertId))
        .map((d) => [d.alertId, d.toLevel])
    );
  check(norm(got) === norm(baseline), 'I10-decisions', { seed });
  check(got.severity === baseline.severity, 'I10-severity', { seed });
}

// Sanidade da régua: um crítico não reconhecido chega ao plantão, e um warning
// jamais chega. Sem isto, um bug de limiares passaria por todas as invariantes
// (que são relacionais) sem nunca mover ninguém.
{
  scenarios += 2;
  const climb = (severity) => {
    let level = 0;
    let last = null;
    const created = NOW - 43200 * MIN;
    for (let step = 0; step < 10; step += 1) {
      const t = NOW - (9 - step) * 60 * MIN;
      const d = evaluateAlertEscalation(
        {
          id: 'x',
          routine: 'r',
          severity,
          reason: '',
          createdAtMs: created,
          acknowledgedAtMs: null,
          escalationLevel: level,
          lastEscalatedAtMs: last,
          dispatch: DISPATCHES[0],
        },
        t
      );
      if (d.shouldEscalate) {
        level = d.toLevel;
        last = t;
      }
    }
    return level;
  };
  check(climb('critical') === 3, 'ladder-critical-reaches-paging', { level: climb('critical') });
  check(climb('warning') === 2, 'ladder-warning-caps-at-escalated', { level: climb('warning') });
}

console.log(`Onda 117 — cenários: ${scenarios.toLocaleString('pt-BR')}`);
console.log(`Onda 117 — asserções: ${assertions.toLocaleString('pt-BR')}`);

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} violação(ões) de invariante:`);
  for (const f of failures.slice(0, 25)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ Todas as invariantes I1..I11 preservadas.');
