#!/usr/bin/env node
/**
 * Onda 107 — Gate de cobertura de partições.
 *
 * Falha (exit 1) quando:
 *  - um pai particionado por RANGE com coluna `user_id` tem menos de
 *    MIN_MONTHS meses de cobertura futura (risco de 23514 na ingestão);
 *  - um pai desses não tem partição DEFAULT (balde de contingência);
 *  - alguma partição (inclusive a DEFAULT) está sem RLS ou sem policy própria;
 *  - a última execução registrada em `partition_maintenance_runs` falhou.
 *
 * Avisa (sem falhar) quando:
 *  - a partição DEFAULT acumulou linhas (indica relógio de câmera errado ou
 *    cobertura que já expirou em algum momento);
 *  - não há permissão para inspecionar `cron.job` (ambiente sandbox).
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as PG*.
 * Uso: `npm run db:check:partitions`  (variável MIN_MONTHS ajusta o limiar)
 */
import { execFileSync } from 'node:child_process';

const MIN_MONTHS = Number.parseInt(process.env.PARTITION_MIN_MONTHS ?? '3', 10);
const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

/**
 * Executa SQL e devolve as linhas já divididas por coluna.
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

/* 1) Cobertura futura + DEFAULT por pai ------------------------------- */
// Lê os bounds direto do catálogo: não depende da função admin-only
// `get_partition_coverage()`, que exige sessão autenticada como admin.
const coverage = query(`
  WITH parts AS (
    SELECT p.relname AS parent,
           pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_namespace n ON n.oid = p.relnamespace
    JOIN pg_partitioned_table pt ON pt.partrelid = p.oid
    WHERE n.nspname = 'public' AND p.relkind = 'p' AND pt.partstrat = 'r'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = p.oid AND a.attname = 'user_id'
          AND a.attnum > 0 AND NOT a.attisdropped
      )
  ),
  bounds AS (
    SELECT parent,
           bound = 'DEFAULT' AS is_default,
           CASE WHEN bound = 'DEFAULT' THEN NULL
                ELSE (substring(bound from 'TO \\(''([0-9-]{10})'))::date
           END AS upper_bound
    FROM parts
  ),
  agg AS (
    SELECT parent,
           bool_or(is_default) AS has_default,
           MAX(upper_bound)    AS last_bound
    FROM bounds
    GROUP BY parent
  )
  SELECT parent,
         COALESCE(last_bound::text, ''),
         has_default::text,
         -- Meses inteiros de cobertura à frente do mês corrente. O limite
         -- superior é exclusivo, por isso o -1.
         GREATEST(
           0,
           COALESCE(
             ((EXTRACT(YEAR  FROM age(last_bound, date_trunc('month', now())::date)) * 12)
            + (EXTRACT(MONTH FROM age(last_bound, date_trunc('month', now())::date))))::int - 1,
             0
           )
         )::text
  FROM agg
  ORDER BY parent;
`);

/** psql serializa boolean como 'true'/'false' em -tA (não 't'/'f'). */
const isTrue = (v) => v === 't' || v === 'true';

if (coverage.length === 0) {
  errors.push(
    'Nenhum pai particionado por RANGE com `user_id` encontrado — o gate perderia o sentido. ' +
      'Verifique a conexão ou remova o gate se o particionamento foi descontinuado.'
  );
}

for (const [parent, lastBound, hasDefault, monthsAhead] of coverage) {
  const months = Number.parseInt(monthsAhead, 10);
  if (Number.isNaN(months) || months < MIN_MONTHS) {
    errors.push(
      `\`${parent}\`: apenas ${monthsAhead} mês(es) de cobertura futura (mínimo ${MIN_MONTHS}, ` +
        `última partição até ${lastBound || 'desconhecida'}). ` +
        'Rode `SELECT public.ensure_future_partitions(6);` e confira o job pg_cron.'
    );
  }
  if (!isTrue(hasDefault)) {
    errors.push(
      `\`${parent}\`: sem partição DEFAULT. Timestamps fora do range abortam o INSERT (23514).`
    );
  }
}

/* 2) Partições sem blindagem ------------------------------------------ */
const unprotected = query(`
  SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relispartition
    AND (
      NOT c.relrowsecurity
      OR NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
    )
  ORDER BY c.relname;
`);
for (const [part] of unprotected) {
  errors.push(
    `Partição \`${part}\` sem RLS e/ou sem policy própria — leitura cross-tenant direta.`
  );
}

/* 3) Linhas na DEFAULT (sintoma, não falha) --------------------------- */
const defaults = query(`
  SELECT c.relname, GREATEST(c.reltuples, 0)::bigint::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE '%\\_default'
  ORDER BY c.relname;
`);
for (const [part, rows] of defaults) {
  if (Number.parseInt(rows, 10) > 0) {
    warnings.push(
      `\`${part}\` acumulou ~${rows} linha(s). Investigue relógio das câmeras ou janelas de cobertura vencidas.`
    );
  }
}

/* 4) Última execução da manutenção ------------------------------------ */
try {
  const runs = query(`
    SELECT ok::text, COALESCE(error_detail, ''), ran_at::text
    FROM public.partition_maintenance_runs
    ORDER BY ran_at DESC LIMIT 1;
  `);
  if (runs.length === 0) {
    warnings.push('`partition_maintenance_runs` vazia — a rotina ainda não rodou neste banco.');
  } else if (!isTrue(runs[0][0])) {
    errors.push(`Última manutenção de partições falhou em ${runs[0][2]}: ${runs[0][1]}`);
  }
} catch {
  warnings.push('Sem acesso a `partition_maintenance_runs` nesta conexão — verificação pulada.');
}

/* 5) Agendamento pg_cron (best effort) -------------------------------- */
try {
  const jobs = query(`
    SELECT jobname, schedule, active::text
    FROM cron.job
    WHERE command ILIKE '%ensure_future_partitions%';
  `);
  const active = jobs.filter((j) => isTrue(j[2]));
  if (active.length === 0) {
    errors.push(
      'Nenhum job pg_cron ativo chamando `ensure_future_partitions` — a cobertura vai expirar silenciosamente.'
    );
  }
} catch {
  warnings.push(
    'Sem permissão para ler `cron.job` nesta conexão — verificação de agendamento pulada.'
  );
}

/* Saída ---------------------------------------------------------------- */
for (const w of warnings) console.warn(`⚠️  ${w}`);

if (errors.length > 0) {
  console.error('\n❌ Gate de cobertura de partições reprovado:');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log(
  `✅ Cobertura de partições OK (mínimo ${MIN_MONTHS} meses, DEFAULT presente e todas as partições blindadas).`
);
