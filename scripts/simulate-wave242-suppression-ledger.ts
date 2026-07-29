/**
 * Onda 242 — simulação combinatória da trilha do ruído evitado.
 *
 * Varre milhares de combinações de (volume, janela, legibilidade, entrega,
 * relógio) e valida as invariantes S1–S10 em toda a grade. Roda com:
 *   npm run simulate:wave242
 */
import {
  buildSuppressionLedger,
  classifyPerDay,
  SUPPRESSION_ROW_CAP,
  type DeliveryRow,
  type SuppressionLedger,
  type SuppressionRow,
} from '../src/lib/maintenance/suppressionLedger';

const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const H = 3_600_000;

let assertions = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  assertions += 1;
  if (!condition) failures.push(label);
}

type Corruption = 'none' | 'empty_key' | 'bad_channel' | 'bad_clock' | 'future' | 'out_of_window';

function makeRow(
  key: string,
  channel: 'telegram' | 'email',
  ageHours: number,
  corruption: Corruption,
): SuppressionRow {
  const base: SuppressionRow = {
    conditionKey: key,
    channel,
    severity: 'critical',
    windowMinutes: 1440,
    suppressedAt: new Date(NOW - ageHours * H).toISOString(),
  };
  switch (corruption) {
    case 'empty_key':
      return { ...base, conditionKey: '   ' };
    case 'bad_channel':
      return { ...base, channel: 'sms' };
    case 'bad_clock':
      return { ...base, suppressedAt: 'não-é-data' };
    case 'future':
      return { ...base, suppressedAt: new Date(NOW + H).toISOString() };
    case 'out_of_window':
      return { ...base, suppressedAt: new Date(NOW - 10_000 * H).toISOString() };
    default:
      return base;
  }
}

function invariants(ledger: SuppressionLedger, label: string): void {
  // S5 — sem condição legível o veredito é sempre `no_history`.
  check(`${label}: S5 vazio ⇒ no_history`, ledger.conditions.length > 0 || ledger.verdict === 'no_history');
  // S1 — a soma das condições é exatamente o total contabilizado.
  const sum = ledger.conditions.reduce((acc, c) => acc + c.suppressed, 0);
  check(`${label}: S1 contabilidade fechada`, sum === ledger.suppressed);
  // S2/S4 — nada negativo, nada inventado.
  check(`${label}: contadores não-negativos`, ledger.unreadable >= 0 && ledger.outOfWindow >= 0);
  // S6 — toda condição sem entrega é starved e está na lista.
  for (const c of ledger.conditions) {
    check(
      `${label}: S6 starved ⇔ sem entrega (${c.conditionKey})`,
      (c.delivered === 0) === (c.verdict === 'starved'),
    );
    check(
      `${label}: S6 lista consistente (${c.conditionKey})`,
      (c.verdict === 'starved') === ledger.starved.includes(c.conditionKey),
    );
    // S8 — o rótulo de volume é sempre o da taxa diária.
    if (c.verdict !== 'starved') {
      check(`${label}: S8 rótulo = taxa (${c.conditionKey})`, c.verdict === classifyPerDay(c.perDay));
    }
  }
  // S7 — o veredito geral é o pior entre as condições.
  const rank = { no_history: 0, light: 1, moderate: 2, heavy: 3, starved: 4 } as const;
  const worst = ledger.conditions.reduce(
    (acc, c) => (rank[c.verdict] > rank[acc] ? c.verdict : acc),
    'no_history' as SuppressionLedger['verdict'],
  );
  check(`${label}: S7 pior governa`, ledger.verdict === worst);
  // S10 — ordem estável.
  for (let i = 1; i < ledger.conditions.length; i += 1) {
    const prev = ledger.conditions[i - 1];
    const cur = ledger.conditions[i];
    check(
      `${label}: S10 ordem estável`,
      prev.suppressed > cur.suppressed ||
        (prev.suppressed === cur.suppressed && prev.conditionKey <= cur.conditionKey),
    );
  }
}

const KEYS = ['admission_trend:a', 'admission_reconcile:b', 'admission_backlog:c', 'partition_drain'];
const CHANNELS: Array<'telegram' | 'email'> = ['telegram', 'email'];
const CORRUPTIONS: Corruption[] = ['none', 'empty_key', 'bad_channel', 'bad_clock', 'future', 'out_of_window'];
const WINDOWS = [1, 6, 24, 72, 168, 720];
const VOLUMES = [0, 1, 2, 5, 12, 40];

let scenarios = 0;

for (const windowHours of WINDOWS) {
  for (const volume of VOLUMES) {
    for (const corruption of CORRUPTIONS) {
      for (const deliveryMode of ['none', 'same', 'other'] as const) {
        for (const keyCount of [1, 2, 4]) {
          scenarios += 1;
          const rows: SuppressionRow[] = [];
          for (let i = 0; i < volume; i += 1) {
            const key = KEYS[i % keyCount];
            const channel = CHANNELS[i % 2];
            const ageHours = (i % Math.max(1, Math.trunc(windowHours))) * 0.5;
            rows.push(makeRow(key, channel, ageHours, i === 0 ? corruption : 'none'));
          }
          const deliveries: DeliveryRow[] =
            deliveryMode === 'none'
              ? []
              : KEYS.slice(0, deliveryMode === 'same' ? keyCount : 1).map((key) => ({
                  conditionKey: key,
                  channel: 'telegram',
                  sentAt: new Date(NOW - 0.25 * H).toISOString(),
                }));

          const ledger = buildSuppressionLedger(rows, deliveries, NOW, windowHours);
          invariants(ledger, `w=${windowHours} v=${volume} c=${corruption} d=${deliveryMode} k=${keyCount}`);

          // Determinismo: a mesma entrada produz exatamente o mesmo retrato.
          const again = buildSuppressionLedger(rows, deliveries, NOW, windowHours);
          check('determinismo', JSON.stringify(ledger) === JSON.stringify(again));
        }
      }
    }
  }
}

// Saturação declarada (S9).
{
  const rows = Array.from({ length: SUPPRESSION_ROW_CAP + 500 }, () =>
    makeRow('admission_trend:a', 'telegram', 1, 'none'),
  );
  const ledger = buildSuppressionLedger(rows, [], NOW, 168);
  check('S9 satura no teto', ledger.saturated && ledger.suppressed === SUPPRESSION_ROW_CAP);
}

// Janela inválida nunca extrapola.
for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  const ledger = buildSuppressionLedger([makeRow('a', 'telegram', 1, 'none')], [], NOW, bad);
  check(`janela inválida ${bad}`, ledger.verdict === 'no_history' && ledger.suppressed === 0);
}

console.log(
  `Onda 242 — cenários: ${scenarios.toLocaleString('pt-BR')}; asserções: ${assertions.toLocaleString('pt-BR')}`,
);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length}):`);
  for (const f of failures.slice(0, 20)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('Todas as invariantes S1–S10 se mantiveram.');
