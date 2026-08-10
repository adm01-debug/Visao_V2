#!/usr/bin/env node
/**
 * Onda 116 — Gate da correlação automática de causa raiz.
 *
 * O ponto cego que este gate fecha: a correlação pode existir no banco e mesmo
 * assim ser inútil — coletor parado, janela degenerada, ou (o pior caso) um
 * backlog crescendo sem nenhuma causa identificada, que é exatamente o cenário
 * em que a triagem manual é obrigatória e ninguém percebe.
 *
 * Falha (exit 1) quando:
 *  - a tabela ou a rotina de correlação sumiram;
 *  - a rotina deixou de ser SECURITY DEFINER ou virou executável por anon/authenticated;
 *  - a última execução falhou (`ok = false`);
 *  - o veredito calculado por `src/lib/rootCauseCorrelation.ts` sobre os dados
 *    reais é `critical` (backlog crescente sem dono).
 *
 * Avisa (sem falhar) quando o veredito é `warning` ou o coletor está parado.
 *
 * Uso: `npm run db:check:root-cause`
 */
import { execFileSync } from 'node:child_process';
import {
  correlateRootCause,
  summarizeRootCause,
  EMPTY_BUCKETS,
} from '../src/lib/rootCauseCorrelation.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

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

const errors = [];
const warnings = [];

// ------------------------------------------------------- 1) blindagem da rotina
const fn = query(`
  SELECT p.prosecdef,
         has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE'),
         has_function_privilege('service_role', p.oid, 'EXECUTE')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'correlate_backlog_root_cause'
`);

if (fn.length === 0) {
  errors.push('public.correlate_backlog_root_cause não existe — a correlação de causa raiz sumiu.');
} else {
  const [secdef, anonExec, authExec, svcExec] = fn[0];
  if (secdef !== 't') errors.push('correlate_backlog_root_cause deixou de ser SECURITY DEFINER.');
  if (anonExec === 't') errors.push('correlate_backlog_root_cause é executável por anon.');
  if (authExec === 't') errors.push('correlate_backlog_root_cause é executável por authenticated.');
  if (svcExec !== 't')
    errors.push('service_role perdeu EXECUTE em correlate_backlog_root_cause — o cron não roda.');
}

// ------------------------------------------------------------ 2) RLS da tabela
const rls = query(`
  SELECT c.relrowsecurity,
         has_table_privilege('anon', c.oid, 'SELECT')
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'root_cause_correlation_runs'
`);

if (rls.length === 0) {
  errors.push('Tabela public.root_cause_correlation_runs não existe.');
} else {
  const [rowsec, anonSelect] = rls[0];
  if (rowsec !== 't') errors.push('root_cause_correlation_runs está sem RLS habilitado.');
  if (anonSelect === 't') errors.push('root_cause_correlation_runs é legível por anon.');
}

// ---------------------------------------------------- 3) veredito sobre o real
if (errors.length === 0) {
  const rows = query(`
    SELECT ok,
           COALESCE(error_detail, ''),
           EXTRACT(EPOCH FROM (now() - ran_at)) / 3600.0,
           growth::text,
           skew_findings::text
    FROM public.root_cause_correlation_runs
    ORDER BY ran_at DESC
    LIMIT 1
  `);

  if (rows.length === 0) {
    warnings.push('Nenhuma execução de correlação registrada ainda — aguardando o primeiro cron.');
  } else {
    const [ok, errDetail, ageH, growthJson, skewJson] = rows[0];
    if (ok !== 't') {
      errors.push(`Última correlação falhou: ${errDetail || 'sem detalhe'}`);
    }
    if (Number(ageH) > 24) {
      warnings.push(
        `Última correlação tem ${Number(ageH).toFixed(1)}h — o cron de 6h pode estar parado.`
      );
    }

    const growthRaw = JSON.parse(growthJson || '[]');
    const skewRaw = JSON.parse(skewJson || '[]');

    const growth = growthRaw.map((g) => ({
      parent: String(g.parent),
      currentRows: Number(g.current_rows ?? 0),
      rowsAddedInWindow: Number(g.rows_added_in_window ?? 0),
      windowHours: Number(g.window_hours ?? 0),
      buckets: g.buckets
        ? {
            pre2000: Number(g.buckets.pre2000 ?? 0),
            future: Number(g.buckets.future ?? 0),
            recentGap: Number(g.buckets.recentGap ?? 0),
            unknown: Number(g.buckets.unknown ?? 0),
          }
        : EMPTY_BUCKETS,
    }));

    const skewFindings = skewRaw.map((f) => ({
      cameraId: String(f.camera_id ?? ''),
      cameraName: f.camera_name ?? null,
      sourceTable: String(f.source_table ?? ''),
      severity: String(f.severity ?? 'ok'),
      direction: String(f.direction ?? 'none'),
      sampleCount: Number(f.sample_count ?? 0),
      medianSkewSeconds: Number(f.median_skew_seconds ?? 0),
      sentinelRows: Number(f.sentinel_rows ?? 0),
      detectedAtMs: Number(f.detected_at_ms ?? 0),
      suppressed: Boolean(f.suppressed),
    }));

    const correlations = correlateRootCause({ nowMs: Date.now(), growth, skewFindings });
    const summary = summarizeRootCause(correlations);

    console.log(`Correlação de causa raiz: ${summary.severity} — ${summary.reason}`);
    for (const c of correlations) {
      if (c.verdict === 'no_backlog' || c.verdict === 'insufficient_data') continue;
      console.log(
        `  · ${c.parent}: ${c.verdict} (+${c.rowsAddedInWindow} linhas em ${c.windowHours.toFixed(1)}h, ` +
          `${Math.round(c.attributedRatio * 100)}% atribuído) → ${c.recommendation}`
      );
    }

    if (summary.severity === 'critical') errors.push(summary.reason);
    else if (summary.severity === 'warning') warnings.push(summary.reason);
  }
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length > 0) {
  console.error(`\n❌ Gate de causa raiz falhou (${errors.length}):`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log('✅ Correlação de causa raiz saudável.');
