#!/usr/bin/env node
/**
 * Gate de CI — Onda 134: registro único das rotinas de retenção.
 *
 * Verifica no banco real:
 *  1. Cobertura total: toda tabela `%_purge_runs` do schema `public` está
 *     registrada em `public.retention_routine_registry()` (e vice-versa).
 *  2. Paridade literal SQL ↔ TypeScript (`src/lib/retention/retentionRegistry.ts`):
 *     mesmos jobs, mesmas tabelas, mesmas cadências, mesmos limiares.
 *  3. Exposição: nenhuma das funções é executável por `anon`/PUBLIC e o
 *     painel exige papel de administrador.
 *  4. Bateria funcional em BEGIN ... ROLLBACK: classificação nas fronteiras,
 *     silêncio negativo e rotina que nunca executou.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const queryTx = (sql) =>
  query(sql)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== 'BEGIN' && line !== 'ROLLBACK')
    .join('');
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/retention/retentionRegistry.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');

// --- 1) Cobertura total --------------------------------------------------------
const purgeTables = query(`
  SELECT COALESCE(string_agg(c.relname, ',' ORDER BY c.relname), '')
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE '%\\_purge\\_runs'`)
  .split(',')
  .filter(Boolean);

const registered = query(`
  SELECT COALESCE(string_agg(source_table, ',' ORDER BY source_table), '')
    FROM public.retention_routine_registry()`)
  .split(',')
  .filter(Boolean);

for (const table of purgeTables) {
  check(
    'COBERTURA',
    registered.includes(table),
    `tabela de expurgo '${table}' não registrada — rotina rodaria sem supervisão`
  );
}
for (const table of registered) {
  check(
    'COBERTURA',
    purgeTables.includes(table),
    `registro aponta para tabela inexistente '${table}'`
  );
}

// --- 2) Paridade SQL <-> TypeScript -------------------------------------------
const sqlRegistry = query(`
  SELECT COALESCE(string_agg(job_name||'|'||source_table||'|'||cadence_minutes, ';' ORDER BY source_table), '')
    FROM public.retention_routine_registry()`);

const tsRegistry = [
  ...source.matchAll(
    /jobName:\s*'([^']+)',\s*sourceTable:\s*'([^']+)',\s*cadenceMinutes:\s*(\d+)/g
  ),
]
  .map(([, job, table, cadence]) => `${job}|${table}|${cadence}`)
  .sort((a, b) => a.split('|')[1].localeCompare(b.split('|')[1]))
  .join(';');

check(
  'PARIDADE',
  sqlRegistry === tsRegistry,
  `registro divergente\n  SQL: ${sqlRegistry}\n   TS: ${tsRegistry}`
);

const sqlThresholds = query(
  "SELECT grace_minutes||'|'||warn_factor||'|'||stalled_factor FROM public.retention_health_thresholds()"
);
const tsGrace = /GRACE_MINUTES\s*=\s*(\d+)/.exec(source)?.[1];
const tsWarn = /WARN_CADENCE_FACTOR\s*=\s*(\d+)/.exec(source)?.[1];
const tsStalled = /STALLED_CADENCE_FACTOR\s*=\s*(\d+)/.exec(source)?.[1];
check(
  'PARIDADE',
  sqlThresholds === `${tsGrace}|${tsWarn}|${tsStalled}`,
  `limiares divergentes SQL='${sqlThresholds}' TS='${tsGrace}|${tsWarn}|${tsStalled}'`
);

// --- 3) Exposição --------------------------------------------------------------
const exposure = query(`
  SELECT COALESCE(string_agg(DISTINCT p.proname||':'||a.grantee::regrole::text, ',' ORDER BY p.proname||':'||a.grantee::regrole::text), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname = 'public'
     AND p.proname IN ('get_retention_overview','retention_routine_registry','retention_health_thresholds','classify_retention_health')
     AND a.grantee::regrole::text IN ('anon','-')`);
check(
  'EXPOSIÇÃO',
  exposure === '',
  `funções de retenção alcançáveis por anon/PUBLIC (${exposure})`
);

const definerGuard = query(`
  SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='get_retention_overview'`);
check(
  'EXPOSIÇÃO',
  /has_role\(auth\.uid\(\),\s*'admin'/.test(definerGuard),
  'get_retention_overview não exige papel admin'
);

// --- 4) Bateria funcional (transação revertida) --------------------------------
const functional = queryTx(`
BEGIN;
SELECT
     public.classify_retention_health(NULL, 60)
  || '/' || public.classify_retention_health(0, 60)
  || '/' || public.classify_retention_health(-500, 60)
  || '/' || public.classify_retention_health(134, 60)
  || '/' || public.classify_retention_health(135, 60)
  || '/' || public.classify_retention_health(254, 60)
  || '/' || public.classify_retention_health(255, 60)
  || '/' || public.classify_retention_health(999999, 1440);
ROLLBACK;`);
check(
  'FUNCIONAL',
  functional === 'never/ok/ok/ok/warn/warn/stalled/stalled',
  `classificação inesperada nas fronteiras: '${functional}'`
);

// --- 4b) Onda 245: carência de estreia no painel ------------------------------
const debut = queryTx(`
BEGIN;
SELECT
     public.classify_retention_health(NULL, 1440, NULL)
  || '/' || public.classify_retention_health(NULL, 1440, 0)
  || '/' || public.classify_retention_health(NULL, 1440, 1454.9)
  || '/' || public.classify_retention_health(NULL, 1440, 1455)
  || '/' || public.classify_retention_health(NULL, 60, 74)
  || '/' || public.classify_retention_health(NULL, 60, 75)
  || '/' || public.classify_retention_health(10, 1440, 0);
ROLLBACK;`);
check(
  'ESTREIA',
  debut === 'never/pending_first_run/pending_first_run/never/pending_first_run/never/ok',
  `carência de estreia divergente do TS (Onda 244/245): '${debut}'`
);

// Toda rotina registrada precisa ter origem somada no painel: sem isso, uma
// rotina saudável aparece como 'nunca executou' (defeito corrigido na Onda 245).
const overviewSrc = query(`
  SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='get_retention_overview'`);
for (const table of registered) {
  check(
    'COBERTURA',
    overviewSrc.includes(table),
    `get_retention_overview não soma a origem '${table}' — rotina saudável apareceria como parada`
  );
}

const shape = queryTx(`
BEGIN;
SELECT count(*) FROM (
  SELECT job_name, label, cadence_minutes, last_run, minutes_since_last, hours_since_last,
         health, runs_last_30d, deleted_last_30d, retention_days,
         registered_at, minutes_since_registration, debut_due_at
    FROM public.get_retention_overview() LIMIT 0
) q;
ROLLBACK;`);
check(
  'FUNCIONAL',
  shape === '0',
  `contrato de colunas de get_retention_overview quebrado ('${shape}')`
);

// --- Resultado -----------------------------------------------------------------
if (failures.length > 0) {
  console.error(
    '❌ Gate de retenção (Onda 134) falhou:\n' + failures.map((f) => `  - ${f}`).join('\n')
  );
  process.exit(1);
}
console.log(
  `✅ Retenção supervisionada: ${registered.length} rotinas registradas, paridade SQL↔TS e limiares por cadência OK.`
);
