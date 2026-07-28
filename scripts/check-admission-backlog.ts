#!/usr/bin/env tsx
/**
 * Onda 232 — Gate do fan-in de passivo do expurgo do livro de admissão.
 *
 * Falha (exit 1) quando:
 *  - `admission_backlog_classify` / `admission_backlog_assess` /
 *    `evaluate_admission_backlog_alerts` não existem;
 *  - alguma delas é executável por `anon`/`authenticated`;
 *  - as que leem a trilha não são SECURITY DEFINER;
 *  - o veredito SQL diverge do veredito TS em qualquer sonda.
 *
 * Uso: `npm run db:check:admission-backlog`
 */
import { execFileSync } from 'node:child_process';
import {
  PERSIST_RUNS,
  assessBacklog,
  type BacklogVerdict,
} from '../src/lib/alarms/admissionBacklogAlert.ts';
import type { PurgeRunReading } from '../src/lib/alarms/admissionPurgeHistory.ts';

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
const FUNCS: Array<{ name: string; args: string; definer: boolean }> = [
  { name: 'admission_backlog_classify', args: 'bigint[]', definer: false },
  { name: 'admission_backlog_assess', args: 'integer', definer: true },
  { name: 'evaluate_admission_backlog_alerts', args: 'timestamp with time zone', definer: true },
];

for (const fn of FUNCS) {
  const rows = query(`
    SELECT p.prosecdef::text,
           has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
           has_function_privilege('anon',          p.oid, 'EXECUTE')::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = '${fn.name}'
      AND pg_get_function_identity_arguments(p.oid) LIKE '%${fn.args}';
  `);
  if (rows.length === 0) {
    errors.push(`public.${fn.name}(${fn.args}) não existe.`);
    continue;
  }
  const [secdef, authExec, anonExec] = rows[0];
  if (fn.definer && !isTrue(secdef)) {
    errors.push(`${fn.name} precisa ser SECURITY DEFINER para ler a trilha imutável.`);
  }
  if (isTrue(authExec)) errors.push(`${fn.name} está executável por \`authenticated\` — revogue o EXECUTE.`);
  if (isTrue(anonExec)) errors.push(`${fn.name} está executável por \`anon\` — revogue o EXECUTE.`);
}

/* 2) Paridade TS ↔ SQL ------------------------------------------------------ */
function tsVerdict(series: number[]): BacklogVerdict {
  const readings: PurgeRunReading[] = series.map((deferred, i) => ({
    id: `p${String(i).padStart(3, '0')}`,
    status: 'valid',
    reason: null,
    executedAt: 1_000_000_000_000 - i * 86_400_000,
    cutoffAt: 0,
    retentionDays: 365,
    batchCap: 50_000,
    deleted: 0,
    deferred,
    quarantined: 0,
    capped: deferred > 0,
    durationMs: 1,
  }));
  return assessBacklog(readings, { window: PERSIST_RUNS }).verdict;
}

const probes: number[][] = [[]];
const LEVELS = [0, 1, 7, 500];
for (const a of LEVELS) {
  probes.push([a]);
  for (const b of LEVELS) {
    probes.push([a, b]);
    for (const c of LEVELS) {
      probes.push([a, b, c]);
      for (const d of LEVELS) probes.push([a, b, c, d]);
    }
  }
}

if (errors.length === 0) {
  const values = probes
    .map((s, i) => `(${i}, ARRAY[${s.join(',')}]::bigint[])`)
    .join(',\n    ');
  const rows = query(`
    WITH probes(i, series) AS (VALUES
    ${values}
    )
    SELECT i::text, public.admission_backlog_classify(series)
    FROM probes ORDER BY i;
  `);

  if (rows.length !== probes.length) {
    errors.push(`sondas retornadas (${rows.length}) ≠ enviadas (${probes.length}).`);
  } else {
    for (const [idxRaw, sqlVerdict] of rows) {
      const i = Number(idxRaw);
      // A janela do espelho SQL é de PERSIST_RUNS; o TS aplica a mesma.
      const want = tsVerdict(probes[i].slice(0, PERSIST_RUNS));
      if (sqlVerdict !== want) {
        errors.push(`paridade quebrada em [${probes[i].join(',')}]: SQL=${sqlVerdict} TS=${want}`);
      }
    }
  }
}

/* 3) Agendamento ------------------------------------------------------------ */
if (errors.length === 0) {
  try {
    const job = query(
      `SELECT active::text, schedule FROM cron.job WHERE jobname = 'admission-backlog-fanin';`,
    );
    if (job.length === 0) errors.push("cron 'admission-backlog-fanin' não agendado.");
    else if (!isTrue(job[0][0])) errors.push("cron 'admission-backlog-fanin' está inativo.");
  } catch {
    console.warn('  ⚠️  cron.job não legível nesta conexão — verificação parcial.');
  }
}

/* 4) Relatório -------------------------------------------------------------- */
console.log(`\n=== Gate do fan-in de passivo (Onda 232) — ${probes.length} sondas de paridade ===\n`);
if (errors.length > 0) {
  console.error('❌ Falhas detectadas:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}
console.log('  ✅ Rotinas blindadas, agendadas e em paridade com a régua TypeScript.\n');
