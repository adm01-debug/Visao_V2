#!/usr/bin/env node
/**
 * Onda 113 — Gate da tendência de backlog da partição DEFAULT.
 *
 * Diferença de projeto em relação às ondas anteriores: a classificação NÃO é
 * reimplementada aqui nem em SQL. O gate lê as amostras brutas de
 * `partition_backlog_samples` e as submete a `src/lib/partitionBacklogTrend.ts`
 * — exatamente a mesma função que a UI usa. Isso elimina por construção a
 * divergência clássica entre "o painel diz OK" e "o alerta diz crítico".
 *
 * Falha (exit 1) quando:
 *  - `public.sample_partition_backlog` não existe, não é SECURITY DEFINER
 *    ou é executável por `anon`;
 *  - `partition_backlog_samples` está sem RLS ou legível por `anon`;
 *  - existe alguma partição DEFAULT sem nenhuma amostra (coletor cego);
 *  - algum pai é classificado como `critical`.
 *
 * Avisa (sem falhar) quando:
 *  - há pai em `warning`;
 *  - a série está obsoleta ou curta demais;
 *  - `cron.job` não é legível nesta conexão.
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as PG*.
 * Uso: `npm run db:check:backlog-trend`
 */
import { execFileSync } from 'node:child_process';
import {
  evaluateBacklogSeries,
  DEFAULT_BACKLOG_TREND_THRESHOLDS,
  describeTrend,
  formatHours,
} from '../src/lib/partitionBacklogTrend.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

const thresholds = {
  ...DEFAULT_BACKLOG_TREND_THRESHOLDS,
  warnRows: Number.parseInt(process.env.BACKLOG_WARN_ROWS ?? '10000', 10),
  criticalRows: Number.parseInt(process.env.BACKLOG_CRITICAL_ROWS ?? '50000', 10),
  saturationRows: Number.parseInt(process.env.BACKLOG_CRITICAL_ROWS ?? '50000', 10),
  maxSampleAgeHours: Number.parseFloat(process.env.BACKLOG_MAX_SAMPLE_AGE_HOURS ?? '6'),
};

/**
 * @param {string} sql
 * @returns {string[][]}
 */
function query(sql) {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const isTrue = (v) => v === 't' || v === 'true';

/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];

/* 1) Blindagem da rotina coletora ------------------------------------- */
try {
  const proc = query(`
    SELECT p.prosecdef::text,
           has_function_privilege('anon', p.oid, 'EXECUTE')::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'sample_partition_backlog';
  `);
  if (proc.length === 0) {
    errors.push('Rotina `public.sample_partition_backlog` não encontrada.');
  } else {
    const [secdef, anonExec] = proc[0];
    if (!isTrue(secdef)) errors.push('`sample_partition_backlog` não é SECURITY DEFINER.');
    if (isTrue(anonExec)) errors.push('`sample_partition_backlog` é executável por `anon`.');
  }
} catch (err) {
  errors.push(`Falha ao inspecionar a rotina coletora: ${err.message}`);
}

/* 2) Blindagem da tabela de amostras ---------------------------------- */
try {
  const tbl = query(`
    SELECT c.relrowsecurity::text,
           has_table_privilege('anon', c.oid, 'SELECT')::text
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'partition_backlog_samples';
  `);
  if (tbl.length === 0) {
    errors.push('Tabela `public.partition_backlog_samples` não encontrada.');
  } else {
    const [rls, anonRead] = tbl[0];
    if (!isTrue(rls)) errors.push('`partition_backlog_samples` está sem RLS habilitada.');
    if (isTrue(anonRead)) errors.push('`partition_backlog_samples` é legível por `anon`.');
  }
} catch (err) {
  errors.push(`Falha ao inspecionar a tabela de amostras: ${err.message}`);
}

/* 3) Cobertura: toda partição DEFAULT precisa estar sendo medida ------- */
/** @type {string[]} */
let defaults = [];
try {
  defaults = query(`
    SELECT i.inhparent::regclass::text
      FROM pg_class c
      JOIN pg_inherits i ON i.inhrelid = c.oid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT';
  `).map((r) => r[0]);
} catch (err) {
  warnings.push(`Não foi possível listar as partições DEFAULT: ${err.message}`);
}

/* 4) Avaliação da tendência com a MESMA lógica da UI ------------------- */
try {
  const rows = query(`
    SELECT parent_table, default_partition, row_count,
           (extract(epoch from sampled_at) * 1000)::bigint
      FROM public.partition_backlog_samples
     WHERE sampled_at > now() - interval '7 days'
     ORDER BY parent_table, sampled_at;
  `);

  /** @type {Map<string, { parent: string, defaultPartition: string, samples: {sampledAtMs:number,rowCount:number}[] }>} */
  const byParent = new Map();
  for (const [parent, part, count, ms] of rows) {
    if (!byParent.has(parent)) {
      byParent.set(parent, { parent, defaultPartition: part, samples: [] });
    }
    byParent.get(parent).samples.push({
      sampledAtMs: Number.parseInt(ms, 10),
      rowCount: Number.parseInt(count, 10),
    });
  }

  for (const parent of defaults) {
    if (!byParent.has(parent)) {
      errors.push(`Partição DEFAULT de \`${parent}\` não possui nenhuma amostra: coletor cego.`);
    }
  }

  const now = Date.now();
  for (const series of byParent.values()) {
    const v = evaluateBacklogSeries(series, now, thresholds);
    const line =
      `${v.parent}: ${v.currentRows.toLocaleString('pt-BR')} linha(s), ` +
      `tendência ${describeTrend(v.trend).toLowerCase()}` +
      (v.slopePerHour === null ? '' : ` (${v.slopePerHour.toFixed(1)}/h)`) +
      (v.hoursToSaturation === null ? '' : `, saturação em ${formatHours(v.hoursToSaturation)}`);

    if (v.severity === 'critical') {
      errors.push(`${line} — ${v.reasons[0]}`);
    } else if (v.severity === 'warning') {
      warnings.push(`${line} — ${v.reasons[0]}`);
    } else {
      console.log(`ℹ️  ${line}`);
    }
  }
} catch (err) {
  errors.push(`Falha ao avaliar a tendência de backlog: ${err.message}`);
}

/* 5) Agendamento ------------------------------------------------------ */
try {
  const job = query(`
    SELECT schedule, active::text FROM cron.job WHERE jobname = 'partition-backlog-sampler';
  `);
  if (job.length === 0) {
    errors.push('Job `partition-backlog-sampler` não está agendado no pg_cron.');
  } else if (!isTrue(job[0][1])) {
    errors.push('Job `partition-backlog-sampler` existe, porém está inativo.');
  }
} catch {
  warnings.push('cron.job não legível nesta conexão — agendamento não verificado.');
}

/* Relatório ----------------------------------------------------------- */
for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`❌ ${e}`);
  process.exit(1);
}
console.log('✅ Tendência de backlog da DEFAULT íntegra (coletor blindado, agendado e sem saturação prevista).');
