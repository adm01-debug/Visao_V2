#!/usr/bin/env node
/**
 * Onda 123 — gate de paridade do árbitro de cura.
 *
 * Compara, ponto a ponto, `public.arbitrate_agent_healing` (SQL) com
 * `arbitrate()` (TypeScript). Um árbitro que decide diferente nas duas pontas
 * é pior que nenhum árbitro: a UI explicaria uma decisão que o banco não tomou.
 *
 * Também valida as invariantes estruturais da Onda 123:
 *  - a ação 'observe' é aceita pela constraint de `agent_healing_actions`;
 *  - 'observe' nunca carrega `task_id` (é decisão de NÃO agir);
 *  - a função de arbitragem não é executável por anon/authenticated.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const DB = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';

function psql(sql) {
  const args = [];
  if (DB) args.push(DB);
  args.push('-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql);
  return execFileSync('psql', args, { encoding: 'utf8' }).trim();
}

// Transpila a lib TS com o esbuild que já acompanha o Vite: o gate precisa
// comparar contra a MESMA função que a UI usa, não contra uma cópia.
let arbitrate;
try {
  const require = createRequire(import.meta.url);
  const esbuild = require('esbuild');
  const out = join(mkdtempSync(join(tmpdir(), 'arbiter-')), 'arbiter.mjs');
  esbuild.buildSync({
    entryPoints: [new URL('../src/lib/relayHealingArbiter.ts', import.meta.url).pathname],
    outfile: out,
    format: 'esm',
    platform: 'node',
    bundle: true,
  });
  ({ arbitrate } = await import(pathToFileURL(out).href));
} catch (err) {
  console.error('❌ não foi possível carregar src/lib/relayHealingArbiter.ts:', err.message);
  process.exit(1);
}


const ACTIONS = ['none', 'nudge', 'restart', 'escalate'];
const SEVS = ['ok', 'warning', 'critical'];
const REDELIV = ['none', 'warning', 'critical'];
const DELIVERIES = [0, 1, 7, 500];
const EXTERNAL = [false, true];

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

const cases = [];
for (const a of ACTIONS)
  for (const s of SEVS)
    for (const r of REDELIV)
      for (const d of DELIVERIES)
        for (const e of EXTERNAL) cases.push({ a, s, r, d, e });

// Uma única ida ao banco: 216 round-trips de psql custam minutos no CI.
const rows = psql(
  `SELECT public.arbitrate_agent_healing(v.a, v.s, v.r, v.d, v.e)::text
     FROM (VALUES ${cases
       .map((c, i) => `(${i}, ${q(c.a)}, ${q(c.s)}, ${q(c.r)}, ${c.d}, ${c.e})`)
       .join(', ')}) AS v(i, a, s, r, d, e)
    ORDER BY v.i`,
).split('\n');

let checked = 0;
const diffs = [];

cases.forEach((c, i) => {
  const ts = arbitrate({
    agentId: 'agent-parity',
    healingAction: c.a,
    healingSeverity: c.s,
    redeliverySeverity: c.r,
    deliveries: c.d,
    externalRootCause: c.e,
  });
  const sql = JSON.parse(rows[i]);
  checked++;
  if (sql.action !== ts.action || sql.severity !== ts.severity || sql.overridden !== ts.overridden) {
    diffs.push({ input: c, ts, sql });
  }
});



// Invariantes estruturais.
const structural = [];

const allowsObserve = psql(`
  SELECT pg_get_constraintdef(oid) ~ 'observe'
    FROM pg_constraint
   WHERE conname = 'agent_healing_actions_action_check'`);
if (allowsObserve !== 't') structural.push("constraint de ação não aceita 'observe'");

const blocksTask = psql(`
  SELECT count(*) FROM pg_constraint
   WHERE conname = 'agent_healing_actions_no_task_when_blocked'
     AND pg_get_constraintdef(oid) ~ 'observe'`);
if (blocksTask !== '1') structural.push("'observe' pode carregar task_id — decisão de não agir com tarefa enfileirada");

const exposed = psql(`
  SELECT count(*) FROM pg_proc p
   WHERE p.proname = 'arbitrate_agent_healing'
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))`);
if (exposed !== '0') structural.push('arbitrate_agent_healing executável por anon/authenticated');

const hasObserved = psql(`
  SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='agent_healing_runs' AND column_name='agents_observed'`);
if (hasObserved !== '1') structural.push('agent_healing_runs.agents_observed ausente');

if (diffs.length === 0 && structural.length === 0) {
  console.log(`✅ árbitro de cura: ${checked} combinações com paridade SQL↔TS + 4 invariantes estruturais`);
  process.exit(0);
}

for (const d of diffs.slice(0, 10)) {
  console.error(
    `❌ divergência ${JSON.stringify(d.input)}\n   TS : ${d.ts.action}/${d.ts.severity}/${d.ts.overridden}` +
      `\n   SQL: ${d.sql.action}/${d.sql.severity}/${d.sql.overridden}`,
  );
}
for (const s of structural) console.error(`❌ ${s}`);
console.error(`\n${diffs.length} divergência(s) em ${checked} combinações; ${structural.length} falha(s) estrutural(is)`);
process.exit(1);
