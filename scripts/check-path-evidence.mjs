#!/usr/bin/env node
/**
 * Gate de CI — Onda 153: evidência por caminho de conectividade.
 *
 *  1. Espelho triplo da taxonomia de culpa: TypeScript ↔ modelo do simulador ↔
 *     função SQL. Uma lista que sai de sincronia faz a UI mostrar uma culpa e
 *     o motor de failover agir por outra.
 *  2. Simulação (paridade agregação-no-banco × redução ao vivo).
 *  3. Exercício dinâmico em transação REVERTIDA — migração aplicar não prova
 *     que a rotina conta a quarentena certa.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { run, CODE_KINDS } from './simulate-wave153-path-evidence.mjs';

const failures = [];
const fail = (m) => failures.push(m);

/* ---------------- 1. espelho TS ↔ modelo ↔ SQL ---------------- */
const TS_PATH = 'src/lib/devices/connectivityFailureKind.ts';
const ts = readFileSync(TS_PATH, 'utf8');

const TS_CONST = {
  transport: 'TRANSPORT_ERROR_CODES',
  auth: 'AUTH_ERROR_CODES',
  config: 'CONFIG_ERROR_CODES',
  device: 'DEVICE_ERROR_CODES',
  none: 'NEUTRAL_ERROR_CODES',
};

function listFrom(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return null;
  // `readonly string[]` também tem colchetes: ancorar no `= [` da atribuição.
  const open = source.indexOf('= [', start);
  const close = source.indexOf(']', open);
  if (open === -1 || close === -1) return null;
  return [...source.slice(open + 2, close).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

// A função SQL vive na migração mais recente que a define.
const migDir = 'supabase/migrations';
const sqlFile = readdirSync(migDir)
  .sort()
  .reverse()
  .find((f) => readFileSync(`${migDir}/${f}`, 'utf8').includes('FUNCTION public.connectivity_failure_kind'));
if (!sqlFile) fail('migração de connectivity_failure_kind não encontrada');
const sql = sqlFile ? readFileSync(`${migDir}/${sqlFile}`, 'utf8') : '';

const sqlBlocks = {
  transport: "THEN 'transport'",
  auth: "THEN 'auth'",
  config: "THEN 'config'",
  device: "THEN 'device'",
  none: "THEN 'none'",
};

for (const [kind, codes] of Object.entries(CODE_KINDS)) {
  const tsList = listFrom(ts, `export const ${TS_CONST[kind]}`);
  if (!tsList) {
    fail(`lista ${TS_CONST[kind]} ausente em ${TS_PATH}`);
  } else if (tsList.join(',') !== codes.join(',')) {
    fail(`lista "${kind}" diverge entre TS e simulador`);
  }
  if (sql) {
    // Bloco SQL correspondente: recorta do início do CASE até o rótulo.
    const end = sql.indexOf(sqlBlocks[kind]);
    if (end === -1) {
      fail(`bloco SQL "${kind}" ausente`);
    } else {
      const chunkStart = sql.lastIndexOf('ARRAY[', end);
      const chunk = sql.slice(chunkStart, end);
      const missing = codes.filter((c) => !chunk.includes(`'${c}'`));
      // O bloco 'none' do SQL aparece em dois lugares (vazio e lista); tolera.
      if (missing.length > 0 && kind !== 'none') {
        fail(`códigos ausentes no SQL "${kind}": ${missing.join(', ')}`);
      }
    }
  }
}

// Regra T1: desconhecido é neutro, nunca transport.
if (!/ELSE 'config'/.test(sql)) fail("SQL não trata código desconhecido como 'config' (T1)");
if (!ts.includes("?? 'config'")) fail(`${TS_PATH} não trata código desconhecido como 'config' (T1)`);

/* ---------------- 2. simulação ---------------- */
const { scenarios, failures: simFailures } = run();
for (const f of simFailures) fail(`simulação: ${f}`);

/* ---------------- 3. exercício no banco ---------------- */
const SQL_TEST = 'tests/rls/connectivity-path-evidence.sql';
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
let exercised = false;
if (!existsSync(SQL_TEST)) {
  fail(`${SQL_TEST} não encontrado`);
} else if (dbUrl || process.env.PGHOST) {
  try {
    const args = dbUrl
      ? [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', SQL_TEST]
      : ['-v', 'ON_ERROR_STOP=1', '-f', SQL_TEST];
    execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    exercised = true;
  } catch (error) {
    fail(
      `exercício no banco falhou: ${(error.stderr || error.message)
        .toString()
        .trim()
        .split('\n')
        .slice(-3)
        .join(' | ')}`,
    );
  }
} else {
  console.log('  aviso: sem SUPABASE_DB_URL/PGHOST — exercício no banco pulado');
}

console.log('Gate Onda 153 — evidência por caminho de conectividade');
console.log(`  cenários simulados : ${scenarios}`);
console.log(`  banco exercitado   : ${exercised ? 'sim (transação revertida)' : 'não'}`);
if (failures.length === 0) {
  console.log('  resultado          : OK');
} else {
  console.log(`  resultado          : ${failures.length} falha(s)`);
  for (const f of failures) console.log(`    - ${f}`);
  process.exitCode = 1;
}
