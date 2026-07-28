#!/usr/bin/env tsx
/**
 * Onda 233 — Simulação exaustiva da conciliação estoque × trilha.
 *
 * Varre o produto cartesiano de inventários (legíveis e corrompidos de todas
 * as formas conhecidas) × execuções (válidas, contestadas, ilegíveis, ausentes)
 * e cobra invariantes que nenhuma implementação futura pode quebrar.
 */
import {
  reconcileAdmissionLedger,
  reconcileSeverity,
  type ReconcileVerdict,
} from '../src/lib/alarms/admissionReconciliation.ts';
import { readPurgeRun } from '../src/lib/alarms/admissionPurgeHistory.ts';

const T0 = Date.parse('2026-07-01T03:47:00.000Z');
const DAY = 86_400_000;

let assertions = 0;
const failures: string[] = [];

function check(cond: boolean, msg: string) {
  assertions++;
  if (!cond) failures.push(msg);
}

const EXPIRED = [0, 1, 2, 3, 5, 8, 50, 500, 5000];
const DRIFT = [0, 1, 2, 3, 5, 8, 50];
const DEFERRED = [0, 1, 2, 3, 5, 8, 50, 500, 5000];
const OBS_OFFSET = [-DAY, -1, 0, 1, 3_600_000, 7 * DAY];
const TOTAL = [5000, 100000];

const RUN_KINDS = ['valid', 'contested', 'unreadable', 'absent'] as const;

function makeRun(kind: (typeof RUN_KINDS)[number], deferred: number) {
  if (kind === 'absent') return null;
  const base = {
    id: 'r',
    executed_at: new Date(T0).toISOString(),
    cutoff_at: new Date(T0 - 365 * DAY).toISOString(),
    retention_days: 365,
    batch_cap: 50_000,
    deleted_count: 10,
    deferred_count: deferred,
    quarantined_count: 0,
    capped: deferred > 0,
    duration_ms: 5,
  };
  if (kind === 'contested') return readPurgeRun({ ...base, capped: !(deferred > 0) });
  if (kind === 'unreadable') return readPurgeRun({ ...base, executed_at: 'nunca' });
  return readPurgeRun(base);
}

for (const kind of RUN_KINDS) {
  for (const expired of EXPIRED) {
    for (const drift of DRIFT) {
      for (const deferred of DEFERRED) {
        for (const off of OBS_OFFSET) {
          for (const total of TOTAL) {
            if (drift > expired) continue; // deriva é subconjunto do vencido
            const run = makeRun(kind, deferred);
            const snap = reconcileAdmissionLedger(
              {
                observed_at: new Date(T0 + off).toISOString(),
                cutoff_at: new Date(T0 + off - 365 * DAY).toISOString(),
                retention_days: 365,
                expired_stock: String(expired),
                drift_stock: String(drift),
                quarantined_stock: '3',
                total_stock: String(total),
              },
              run,
            );
            const tag = `${kind}/e${expired}/d${drift}/f${deferred}/o${off}`;

            // Invariante 1 — órfão só existe no veredito que o acusa.
            check(
              snap.orphanCount === 0 || snap.verdict === 'unaccounted',
              `órfão fora de unaccounted em ${tag}`,
            );
            // Invariante 2 — órfão nunca excede o estoque vencido.
            check(snap.orphanCount <= expired, `órfão maior que estoque em ${tag}`);
            // Invariante 3 — quarentena nunca some do retrato (J7).
            check(snap.quarantinedStock === 3, `quarentena perdida em ${tag}`);
            // Invariante 4 — severidade deriva do veredito, sempre.
            check(
              snap.severity === reconcileSeverity(snap.verdict),
              `severidade divergente em ${tag}`,
            );
            // Invariante 5 — execução não-válida jamais acusa (J3).
            if (kind !== 'valid') {
              check(snap.verdict !== 'unaccounted', `acusação sem execução válida em ${tag}`);
              check(
                snap.verdict === (expired === 0 ? 'reconciled' : 'no_run'),
                `veredito errado sem execução válida em ${tag}`,
              );
            }
            // Invariante 6 — foto anterior à execução é indeterminada (J2).
            if (kind === 'valid' && off < 0) {
              check(snap.verdict === 'indeterminate', `foto obsoleta acusou em ${tag}`);
            }
            // Invariante 7 — aritmética fechada quando conclusivo (J4/J5/J6).
            if (kind === 'valid' && off >= 0) {
              const accounted = deferred + drift;
              const expect: ReconcileVerdict =
                expired > accounted ? 'unaccounted' : expired < accounted ? 'settling' : 'reconciled';
              check(snap.verdict === expect, `veredito ${snap.verdict} ≠ ${expect} em ${tag}`);
              check(
                snap.accountedFor === accounted,
                `dívida assumida errada em ${tag}`,
              );
              check(
                snap.orphanCount === Math.max(0, expired - accounted),
                `órfão mal contado em ${tag}`,
              );
            }
            // Invariante 8 — determinismo.
            const again = reconcileAdmissionLedger(
              {
                observed_at: new Date(T0 + off).toISOString(),
                cutoff_at: new Date(T0 + off - 365 * DAY).toISOString(),
                retention_days: 365,
                expired_stock: String(expired),
                drift_stock: String(drift),
                quarantined_stock: '3',
                total_stock: String(total),
              },
              run,
            );
            check(JSON.stringify(again) === JSON.stringify(snap), `não determinístico em ${tag}`);
          }
        }
      }
    }
  }
}

/* Corrupções de inventário — nenhuma pode virar veredito conclusivo. */
const CORRUPT: Array<Record<string, unknown>> = [
  { observed_at: null },
  { observed_at: 'ontem' },
  { cutoff_at: null },
  { cutoff_at: new Date(T0 + 10 * DAY).toISOString() },
  { retention_days: 0 },
  { retention_days: null },
  { expired_stock: -1 },
  { expired_stock: 1.5 },
  { expired_stock: 'dez' },
  { drift_stock: null },
  { quarantined_stock: 'x' },
  { total_stock: null },
  { total_stock: '1', expired_stock: '2' },
  { total_stock: '1', quarantined_stock: '9' },
];

for (const patch of CORRUPT) {
  for (const kind of RUN_KINDS) {
    const snap = reconcileAdmissionLedger(
      {
        observed_at: new Date(T0).toISOString(),
        cutoff_at: new Date(T0 - 365 * DAY).toISOString(),
        retention_days: 365,
        expired_stock: '4',
        drift_stock: '0',
        quarantined_stock: '0',
        total_stock: '10',
        ...patch,
      },
      makeRun(kind, 4),
    );
    check(
      snap.verdict === 'indeterminate',
      `inventário corrompido virou ${snap.verdict} (${JSON.stringify(patch)})`,
    );
    check(snap.orphanCount === 0, 'inventário corrompido acusou órfão');
    check(snap.reason !== null, 'inventário corrompido sem motivo auditável');
  }
}

if (failures.length > 0) {
  console.error(`❌ Onda 233 — ${failures.length} falhas em ${assertions} asserções`);
  for (const f of failures.slice(0, 25)) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✅ Onda 233 — ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`);
