/**
 * Simulação exaustiva — Onda 223 ("está armado agora?").
 *
 * Não confio no veredito da régua contra ela mesma: cada cenário é conferido
 * contra um **oráculo independente** que varre o minuto atual e os próximos
 * 7 dias com aritmética própria, sem reaproveitar `minutesUntilFlip`.
 *
 * Rode com: npx tsx scripts/simulate-wave223.ts
 */

import { evaluateArmedNow, type ArmedInput, type ArmedState } from '../src/lib/alarms/armedNow';
import {
  MINUTES_PER_DAY,
  normalizeSchedule,
  type AlarmSchedule,
} from '../src/lib/alarms/alarmAggregation';

let assertions = 0;
const failures: string[] = [];
const assert = (cond: boolean, msg: string) => {
  assertions += 1;
  if (!cond && failures.length < 25) failures.push(msg);
};

/** Oráculo: cobertura no minuto absoluto da semana (0..10079). */
function coveredAt(schedule: AlarmSchedule | null, weekMinute: number): boolean {
  const days = normalizeSchedule(schedule);
  if (days.every((d) => d.length === 0)) return true;
  const day = Math.floor(weekMinute / MINUTES_PER_DAY) % 7;
  const minute = weekMinute % MINUTES_PER_DAY;
  for (const p of days[day] ?? []) {
    if (p.startMin < p.endMin) {
      if (minute >= p.startMin && minute < p.endMin) return true;
    } else if (minute >= p.startMin) return true;
  }
  const prev = (day + 6) % 7;
  for (const p of days[prev] ?? []) {
    if (p.startMin > p.endMin && minute < p.endMin) return true;
  }
  return false;
}

/** Domingo 2026-07-26 00:00 UTC — início de semana alinhado (getUTCDay()===0). */
const WEEK_START = Date.UTC(2026, 6, 26, 0, 0);

let rngState = 20260223;
const rnd = (n: number) => {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState % n;
};

const randomSchedule = (): AlarmSchedule | null => {
  if (rnd(6) === 0) return null;
  const out: { startMin: number; endMin: number }[][] = [];
  for (let d = 0; d < 7; d += 1) {
    const count = rnd(4);
    const periods: { startMin: number; endMin: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const start = rnd(MINUTES_PER_DAY);
      const len = 1 + rnd(600);
      const end = (start + len) % MINUTES_PER_DAY || MINUTES_PER_DAY;
      if (start !== end) periods.push({ startMin: start, endMin: end });
    }
    out.push(periods);
  }
  return out;
};

const HEALTHS: ArmedInput['health'][] = ['ok', 'inconsistent', 'inoperative'];

for (let scenario = 0; scenario < 900; scenario += 1) {
  const schedule = randomSchedule();
  for (const health of HEALTHS) {
    for (const enabled of [true, false]) {
      for (let probe = 0; probe < 12; probe += 1) {
        const weekMinute = rnd(7 * MINUTES_PER_DAY);
        const at = WEEK_START + weekMinute * 60_000;
        const v = evaluateArmedNow({ enabled, health, schedule }, at, 0);

        // L1 — desabilitado e inoperante nunca são efetivos.
        if (!enabled) {
          assert(v.state === 'off' && !v.effective, `desabilitado virou ${v.state}`);
          continue;
        }
        if (health === 'inoperative') {
          assert(v.state === 'inoperative' && !v.effective, `inoperante virou ${v.state}`);
          continue;
        }

        const covered = coveredAt(schedule, weekMinute);

        // L2 — `effective` bate com o oráculo, sempre.
        assert(v.effective === covered, `cobertura divergente em ${weekMinute} (${v.state})`);

        // L3 — estado coerente com a saúde declarada.
        const expected: ArmedState = covered
          ? health === 'inconsistent'
            ? 'armed_degraded'
            : 'armed'
          : 'idle';
        assert(v.state === expected, `estado ${v.state} ≠ ${expected}`);

        // L4 — a virada anunciada é o primeiro minuto em que o oráculo inverte.
        if (v.minutesToChange !== null) {
          const flip = v.minutesToChange;
          assert(flip >= 1 && flip <= 7 * MINUTES_PER_DAY, `virada fora de faixa: ${flip}`);
          for (let k = 1; k < flip; k += 1) {
            const inter = coveredAt(schedule, (weekMinute + k) % (7 * MINUTES_PER_DAY));
            if (inter !== covered) {
              assert(false, `virada anunciada tarde: real ${k}, dito ${flip}`);
              break;
            }
          }
          const atFlip = coveredAt(schedule, (weekMinute + flip) % (7 * MINUTES_PER_DAY));
          assert(atFlip !== covered, `virada anunciada cedo demais em ${flip}`);
        } else {
          // L5 — sem virada só é legítimo quando a semana inteira é igual.
          let uniform = true;
          for (let k = 1; k <= 7 * MINUTES_PER_DAY && uniform; k += 1) {
            if (coveredAt(schedule, (weekMinute + k) % (7 * MINUTES_PER_DAY)) !== covered) {
              uniform = false;
            }
          }
          assert(uniform, 'anunciou "sem virada" numa agenda que muda');
          // L6 — "sem virada" e não coberto precisa ser declarado inalcançável.
          assert(covered || v.unreachable, 'agenda que nunca abre não foi declarada inalcançável');
        }

        // L7 — rótulo nunca é vazio e nunca diz "armado" sem efetividade.
        assert(v.label.trim().length > 0, 'rótulo vazio');
        assert(
          v.effective || !/^Armado/.test(v.label),
          `rótulo mente: "${v.label}" sem efetividade`
        );
      }
    }
  }
}

// Relógios impossíveis nunca viram "não armado".
for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  const v = evaluateArmedNow({ enabled: true, health: 'ok', schedule: null }, bad, 0);
  assert(v.state === 'unknown', `relógio inválido virou ${v.state}`);
}

// Fuso: deslocar o relógio e o fuso na mesma medida não muda nada (invariância).
for (let i = 0; i < 400; i += 1) {
  const schedule = randomSchedule();
  const weekMinute = rnd(7 * MINUTES_PER_DAY);
  const tz = rnd(24 * 60) - 12 * 60;
  const a = evaluateArmedNow(
    { enabled: true, health: 'ok', schedule },
    WEEK_START + weekMinute * 60_000,
    tz
  );
  const b = evaluateArmedNow(
    { enabled: true, health: 'ok', schedule },
    WEEK_START + weekMinute * 60_000 + tz * 60_000,
    0
  );
  assert(a.state === b.state, 'deslocamento equivalente mudou o estado');
  assert(a.minutesToChange === b.minutesToChange, 'deslocamento equivalente mudou a virada');
}

if (failures.length > 0) {
  console.log(`✗ Onda 223 — ${failures.length} falha(s) em ${assertions} asserções\n`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`✓ Onda 223 — ${assertions} asserções, nenhuma falha`);
