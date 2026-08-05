#!/usr/bin/env tsx
/**
 * Onda 232 — Simulação exaustiva do fan-in de passivo do expurgo.
 *
 * Não busca "passar": busca quebrar. Varre o espaço de séries de passivo,
 * linhas sujas, ordens embaralhadas e cadências absurdas, exigindo que as
 * leis I1–I8 se sustentem em todos os cenários.
 */
import {
  COOLDOWN_CEILING_MINUTES,
  COOLDOWN_FLOOR_MINUTES,
  PERSIST_RUNS,
  assessBacklogFromRows,
  backlogCooldownMinutes,
  evaluateAdmissionBacklog,
  severityForVerdict,
  type BacklogVerdict,
} from '../src/lib/alarms/admissionBacklogAlert.ts';

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const DAY = 86_400_000;

let assertions = 0;
const failures: string[] = [];

function check(cond: boolean, msg: string): void {
  assertions += 1;
  if (!cond && failures.length < 25) failures.push(msg);
}

type Row = Record<string, unknown>;

function run(
  index: number,
  deferred: number,
  dirty: 'none' | 'mirror' | 'clock' | 'cap' = 'none'
): Row {
  const base: Row = {
    id: `run-${index}`,
    executed_at: new Date(NOW - index * DAY).toISOString(),
    cutoff_at: new Date(NOW - 400 * DAY).toISOString(),
    retention_days: 365,
    batch_cap: 50_000,
    deleted_count: 10,
    deferred_count: deferred,
    quarantined_count: 0,
    capped: deferred > 0,
    duration_ms: 12,
  };
  if (dirty === 'mirror') base.capped = deferred === 0;
  if (dirty === 'clock') base.executed_at = 'não-é-data';
  if (dirty === 'cap') base.batch_cap = 0;
  return base;
}

/** Referência independente do veredito (reimplementação ingênua, para cruzar). */
function expectedVerdict(series: number[]): BacklogVerdict {
  if (series.length === 0) return 'no_data';
  if (series[0] === 0) return 'clear';
  let consecutive = 0;
  for (const v of series) {
    if (v > 0) consecutive += 1;
    else break;
  }
  const block = series.slice(0, consecutive).slice().reverse();
  let growing = false;
  for (let i = 1; i < block.length; i += 1) {
    if (block[i] > block[i - 1]) growing = true;
    else if (block[i] < block[i - 1]) growing = false;
  }
  if (growing) return 'growing';
  if (consecutive >= PERSIST_RUNS) return 'persistent';
  return 'spike';
}

/* 1) Espaço completo de séries de passivo (valores 0..3 escalados) ---------- */
const LEVELS = [0, 5, 50, 500];
for (const a of LEVELS)
  for (const b of LEVELS)
    for (const c of LEVELS)
      for (const d of LEVELS) {
        const series = [a, b, c, d];
        const rows = series.map((v, i) => run(i, v));
        const got = assessBacklogFromRows(rows);
        const want = expectedVerdict(series.slice(0, PERSIST_RUNS));
        check(got.verdict === want, `série ${series} → ${got.verdict} (esperado ${want})`);

        // Determinismo sob embaralhamento (I7 da onda 231 herdada).
        const shuffled = [...rows].reverse();
        check(
          JSON.stringify(assessBacklogFromRows(shuffled)) === JSON.stringify(got),
          `ordem alterou o veredito da série ${series}`
        );

        // Severidade coerente com o veredito.
        const alert = evaluateAdmissionBacklog(rows);
        const sev = severityForVerdict(got.verdict);
        check(
          (alert === null && sev === null) || alert?.severity === sev,
          `severidade incoerente na série ${series}`
        );
        if (alert) {
          check(alert.routine === 'admission_backlog:ledger_purge', 'chave de rotina divergente');
          check(alert.reason.length > 20, 'motivo curto demais');
          check(alert.detail.deferred_now === got.deferredNow, 'detalhe divergente do retrato');
          // I3 — alerta jamais é emitido com passivo atual zero.
          check(alert.detail.deferred_now > 0, `alerta emitido com passivo zero (${series})`);
        }
      }

/* 2) Linhas sujas nunca provam nem aliviam (I1) ---------------------------- */
for (const dirty of ['mirror', 'clock', 'cap'] as const) {
  for (const level of [0, 7, 700]) {
    const only = assessBacklogFromRows([run(0, level, dirty)]);
    check(only.verdict === 'no_data', `linha suja (${dirty}) virou ${only.verdict}`);

    // Linha suja recente não pode mascarar passivo válido anterior…
    const mixed = assessBacklogFromRows([
      run(0, level, dirty),
      run(1, 900),
      run(2, 900),
      run(3, 900),
    ]);
    check(
      mixed.verdict === 'persistent',
      `linha suja (${dirty}) alterou veredito de passivo válido: ${mixed.verdict}`
    );
  }
}

/* 3) Cooldown: piso, teto, monotonia e recusa de cadência inválida (I7) ----- */
let previous = 0;
for (let cadence = 1; cadence <= 20_000; cadence += 1) {
  const v = backlogCooldownMinutes(cadence);
  check(
    v >= COOLDOWN_FLOOR_MINUTES && v <= COOLDOWN_CEILING_MINUTES,
    `cooldown fora da faixa: ${v}`
  );
  check(v >= previous, `cooldown não monotônico em ${cadence}`);
  previous = v;
}
for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, -Number.MAX_SAFE_INTEGER]) {
  let threw = false;
  try {
    backlogCooldownMinutes(bad);
  } catch {
    threw = true;
  }
  check(threw, `cadência inválida aceita: ${bad}`);
}

/* 4) Entradas hostis nunca lançam (robustez total) -------------------------- */
const hostile: unknown[] = [
  null,
  undefined,
  [],
  [null],
  [{}],
  [{ deferred_count: '10' }],
  [{ ...run(0, 10), deferred_count: '10' }],
  [{ ...run(0, 10), deferred_count: -5 }],
  [{ ...run(0, 10), id: 42 }],
  [{ ...run(0, 10), executed_at: new Date(NOW) }],
];
for (const input of hostile) {
  let threw = false;
  try {
    const a = assessBacklogFromRows(input as never);
    check(typeof a.verdict === 'string', 'veredito ausente em entrada hostil');
    evaluateAdmissionBacklog(input as never, { cadenceMinutes: 1440 });
  } catch (err) {
    threw = true;
    failures.push(`entrada hostil lançou: ${String(err)}`);
  }
  check(!threw, 'entrada hostil lançou exceção');
}

/* 5) Volume: séries longas aleatórias determinísticas ----------------------- */
let seed = 232;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
for (let iter = 0; iter < 40_000; iter += 1) {
  const len = 1 + Math.floor(rnd() * 8);
  const series = Array.from({ length: len }, () => (rnd() < 0.4 ? 0 : Math.floor(rnd() * 1000)));
  const rows = series.map((v, i) => run(i, v));
  const got = assessBacklogFromRows(rows);
  check(
    got.verdict === expectedVerdict(series.slice(0, PERSIST_RUNS)),
    `série longa divergente: ${series}`
  );
  check(got.trend.length <= PERSIST_RUNS, 'janela de tendência estourou');
  check(
    got.trend.every((v) => Number.isInteger(v) && v >= 0),
    'tendência com valor inválido'
  );
  const alert = evaluateAdmissionBacklog(rows, { cadenceMinutes: 1440 });
  check(alert === null || alert.cooldownMinutes === 1440, 'cooldown divergente da cadência');
}

/* Relatório ----------------------------------------------------------------- */
console.log(`\n=== Onda 232 — simulação do fan-in de passivo ===`);
console.log(`Asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} falha(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ Todas as leis I1–I8 sustentadas.\n');
