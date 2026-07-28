#!/usr/bin/env tsx
/**
 * Onda 233 — Gate da conciliação estoque × trilha do livro de admissão.
 *
 * Falha (exit 1) quando:
 *  - `admission_reconcile_classify` / `admission_ledger_reconcile` não existem;
 *  - alguma delas é executável por `anon`/`authenticated`;
 *  - a que lê o estoque não é SECURITY DEFINER;
 *  - o veredito SQL diverge do veredito TS em qualquer sonda;
 *  - a rotina de inventário aceita prazo de retenção fora da faixa 30–3650.
 *
 * Uso: `npm run db:check:admission-reconcile`
 */
import { execFileSync } from 'node:child_process';
import {
  reconcileAdmissionLedger,
  type ReconcileVerdict,
} from '../src/lib/alarms/admissionReconciliation.ts';
import { readPurgeRun } from '../src/lib/alarms/admissionPurgeHistory.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

function query(sql: string): string[][] {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const isTrue = (v: string) => v === 't' || v === 'true';
const errors: string[] = [];

/* 1) Existência e blindagem ------------------------------------------------- */
const FUNCS = [
  {
    name: 'admission_reconcile_classify',
    args: 'boolean, boolean, boolean, bigint, bigint, bigint',
    definer: false,
  },
  { name: 'admission_ledger_reconcile', args: 'integer, timestamp with time zone', definer: true },
] as const;

for (const fn of FUNCS) {
  const rows = query(`
    SELECT p.prosecdef::text,
           has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
           has_function_privilege('anon',          p.oid, 'EXECUTE')::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = '${fn.name}'
      AND pg_catalog.oidvectortypes(p.proargtypes) = '${fn.args}';
  `);
  if (rows.length === 0) {
    errors.push(`public.${fn.name}(${fn.args}) não existe.`);
    continue;
  }
  const [secdef, authExec, anonExec] = rows[0];
  if (fn.definer && !isTrue(secdef)) {
    errors.push(`${fn.name} precisa ser SECURITY DEFINER para ler o estoque completo.`);
  }
  if (isTrue(authExec)) errors.push(`${fn.name} não pode ser executável por 'authenticated'.`);
  if (isTrue(anonExec)) errors.push(`${fn.name} não pode ser executável por 'anon'.`);
}

/* 2) Recusa de prazo fora da faixa ------------------------------------------ */
for (const days of [1, 29, 3651, 100000]) {
  const [row] = query(
    `SELECT public.admission_ledger_reconcile(${days}, now()) ->> 'refusal';`,
  );
  if (!row || row[0] !== 'bad_retention_days') {
    errors.push(`admission_ledger_reconcile aceitou prazo inválido de ${days} dias.`);
  }
}

/* 3) Paridade TS ↔ SQL do veredito ------------------------------------------ */
const T0 = Date.parse('2026-07-01T03:47:00.000Z');
const DAY = 86_400_000;

const EXPIRED = [0, 1, 2, 3, 7, 50, 999];
const DRIFT = [0, 1, 3, 7];
const DEFERRED = [0, 1, 2, 3, 7, 50, 999];
const FLAGS: Array<[boolean, boolean, boolean]> = [
  [true, true, false],
  [true, true, true],
  [true, false, false],
  [true, false, true],
  [false, true, false],
  [false, false, false],
];

type Probe = { sql: string; expected: ReconcileVerdict; tag: string };
const probes: Probe[] = [];

for (const [readable, hasRun, stale] of FLAGS) {
  for (const expired of EXPIRED) {
    for (const drift of DRIFT) {
      for (const deferred of DEFERRED) {
        if (drift > expired) continue;

        // Reproduz o mesmo caso na régua pura.
        const run = hasRun
          ? readPurgeRun({
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
            })
          : null;

        const observedAt = stale ? T0 - DAY : T0 + 3_600_000;
        const inventory = readable
          ? {
              observed_at: new Date(observedAt).toISOString(),
              cutoff_at: new Date(observedAt - 365 * DAY).toISOString(),
              retention_days: 365,
              expired_stock: String(expired),
              drift_stock: String(drift),
              quarantined_stock: '0',
              total_stock: '1000000',
            }
          : null;

        const expected = reconcileAdmissionLedger(inventory, run).verdict;
        probes.push({
          sql: `public.admission_reconcile_classify(${readable}, ${hasRun}, ${stale}, ${expired}, ${drift}, ${deferred})`,
          expected,
          tag: `r${readable}/h${hasRun}/s${stale}/e${expired}/d${drift}/f${deferred}`,
        });
      }
    }
  }
}

// Lote único: uma ida ao banco para todas as sondas.
const batched = query(
  `SELECT ${probes.map((p, i) => `${p.sql} AS v${i}`).join(', ')};`,
);
const values = batched[0] ?? [];
probes.forEach((p, i) => {
  if (values[i] !== p.expected) {
    errors.push(`paridade rompida em ${p.tag}: SQL=${values[i]} TS=${p.expected}`);
  }
});

/* 4) Resultado --------------------------------------------------------------- */
if (errors.length > 0) {
  console.error('❌ Gate da conciliação do livro de admissão falhou:');
  for (const e of errors.slice(0, 25)) console.error(`  · ${e}`);
  process.exit(1);
}
console.log(
  `✅ Conciliação do livro de admissão: ${probes.length} sondas de paridade TS↔SQL, blindagem e recusas OK.`,
);
