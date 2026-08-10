/**
 * Onda 236 — simulação de larga escala do fan-in da tendência.
 *
 * Força bruta sobre todas as séries de órfão de comprimento 0..7 com valores
 * 0..2 (3^0+...+3^7 = 3.280 séries), cruzadas com cadências e janelas, e
 * conferidas contra uma referência escrita de forma INDEPENDENTE da régua.
 */

import {
  assessOrphanTrend,
  type ReconcileSnapshotReading,
} from '../src/lib/alarms/admissionOrphanTrend.ts';
import {
  ADMISSION_TREND_PREFIX,
  buildTrendAlert,
  trendAlertSeverity,
  trendCooldownMinutes,
} from '../src/lib/alarms/admissionTrendAlert.ts';

let assertions = 0;
let failures = 0;
function check(cond: boolean, msg: string): void {
  assertions += 1;
  if (!cond) {
    failures += 1;
    if (failures <= 20) console.error(`✗ ${msg}`);
  }
}

const BASE = Date.parse('2026-07-01T00:00:00.000Z');

function readings(series: readonly number[], unreadable = 0): ReconcileSnapshotReading[] {
  const out: ReconcileSnapshotReading[] = series.map((orphan, i) => ({
    id: `v${i}`,
    status: 'valid',
    reason: null,
    observedAt: BASE + i * 86_400_000,
    verdict: orphan > 0 ? 'unaccounted' : 'reconciled',
    orphan,
    expired: orphan + 1,
    deferred: 0,
    drift: 0,
  }));
  for (let i = 0; i < unreadable; i += 1) {
    out.push({
      id: `u${i}`,
      status: 'unreadable',
      reason: 'orphan_count_ilegivel',
      observedAt: BASE + (series.length + i) * 86_400_000,
      verdict: null,
      orphan: null,
      expired: null,
      deferred: null,
      drift: null,
    });
  }
  return out;
}

/** Referência independente: severidade esperada, deduzida da série crua. */
function refSeverity(series: readonly number[], window: number): 'warning' | 'critical' | null {
  const s = series.slice(-window);
  if (s.length === 0) return null;
  if ((s[s.length - 1] ?? 0) === 0) return null;
  let i = s.length - 1;
  while (i - 1 >= 0 && (s[i - 1] ?? 0) > 0) i -= 1;
  const block = s.slice(i);
  if (block.length < 3) return 'warning'; // emerging
  let up = true;
  let down = true;
  for (let k = 1; k < block.length; k += 1) {
    if ((block[k] ?? 0) <= (block[k - 1] ?? 0)) up = false;
    if ((block[k] ?? 0) >= (block[k - 1] ?? 0)) down = false;
  }
  if (up) return 'critical'; // growing
  if (down) return 'warning'; // resolving
  return 'critical'; // persistent
}

function* allSeries(maxLen: number, maxVal: number): Generator<number[]> {
  for (let len = 0; len <= maxLen; len += 1) {
    const total = (maxVal + 1) ** len;
    for (let n = 0; n < total; n += 1) {
      const s: number[] = [];
      let x = n;
      for (let k = 0; k < len; k += 1) {
        s.push(x % (maxVal + 1));
        x = Math.floor(x / (maxVal + 1));
      }
      yield s;
    }
  }
}

const CADENCES = [1, 30, 59, 60, 120, 1440, 2880, 100000];
const WINDOWS = [1, 2, 3, 5, 14];

let series = 0;
for (const s of allSeries(7, 2)) {
  series += 1;
  for (const window of WINDOWS) {
    const a = assessOrphanTrend(readings(s), { window });
    const expected = refSeverity(s, window);
    const sev = trendAlertSeverity(a.verdict);
    check(sev === expected, `severidade [${s}] w=${window}: ${sev} ≠ ${expected}`);

    for (const cadence of CADENCES) {
      const alert = buildTrendAlert(a, { cadenceMinutes: cadence, window });
      if (expected === null) {
        check(alert === null, `[${s}] w=${window} deveria não emitir`);
        continue;
      }
      if (alert === null) {
        check(false, `[${s}] w=${window} deveria emitir ${expected}`);
        continue;
      }
      check(alert.severity === expected, `sev alerta [${s}]`);
      check(alert.routine.startsWith(ADMISSION_TREND_PREFIX), 'M7 prefixo');
      check(!alert.routine.startsWith('admission_reconcile:'), 'M7 sem colisão');
      // M2/M3 — só growing usa meia cadência.
      const half = alert.verdict === 'growing';
      const base = half ? Math.round(cadence / 2) : Math.round(cadence);
      const expectedCd = Math.min(1440, Math.max(60, base));
      check(alert.cooldownMinutes === expectedCd, `cooldown [${s}] c=${cadence}`);
      check(alert.cooldownMinutes >= 60 && alert.cooldownMinutes <= 1440, 'piso/teto');
      // M8 — a série viaja no detalhe e na frase.
      check(alert.detail.series.join(',') === a.trend.join(','), 'M8 série no detalhe');
      check(alert.reason.includes('cadência'), 'M8 frase com cadência');
      check(alert.detail.orphan_now > 0, 'emitiu com órfão atual > 0');
      check(alert.observedAt !== null, 'observedAt presente');
    }
  }
}

// M6 — histórico só com fotos ilegíveis nunca vira tendência.
for (let u = 1; u <= 30; u += 1) {
  const a = assessOrphanTrend(readings([], u));
  check(a.readable === 0 && a.unreadable === u, `M6 contagem u=${u}`);
  check(buildTrendAlert(a) === null, `M6 não emite com ${u} ilegíveis`);
}

// M6b — ilegíveis não apagam uma tendência real.
for (let u = 0; u <= 10; u += 1) {
  const a = assessOrphanTrend(readings([1, 2, 3], u));
  const alert = buildTrendAlert(a);
  check(alert !== null && alert.severity === 'critical', `M6b crescente com ${u} ilegíveis`);
  check(alert?.detail.unreadable === u, 'M6b ilegíveis contadas à parte');
}

// M1 — cadência inválida falha alto, nunca silencia.
for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  let threw = false;
  try {
    trendCooldownMinutes(bad, 'growing');
  } catch {
    threw = true;
  }
  check(threw, `cadência inválida ${bad} deveria lançar`);
}

// Entrada nula é ausência de informação, nunca alerta.
check(buildTrendAlert(null) === null, 'null não emite');
check(buildTrendAlert(undefined) === null, 'undefined não emite');

console.log(`\nSéries avaliadas: ${series}`);
console.log(`Asserções: ${assertions}`);
console.log(
  failures === 0 ? '✓ Onda 236 — todas as leis M1–M8 verificadas' : `✗ ${failures} falhas`
);
process.exit(failures === 0 ? 0 : 1);
