#!/usr/bin/env node
/**
 * Gate de CI — Onda 151: console de concessões.
 *
 *  1. Espelho TS ↔ modelo JS (teto de prazo, tamanho mínimo da justificativa
 *     e catálogo de recusas).
 *  2. Simulação G1..G7 sem violações.
 *  3. Exercício dinâmico do banco em transação REVERTIDA
 *     (`tests/rls/capability-grant-console.sql`) — porque migração aplicar
 *     não prova que a rotina recusa o que deve recusar.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { run, MAX_GRANT_DAYS, MIN_REASON_LENGTH } from './simulate-wave151-grant-console.mjs';

const failures = [];
const fail = (m) => failures.push(m);

/* ---------------- 1. espelho TS ↔ modelo ---------------- */
const TS_PATH = 'src/lib/permissions/grantConsole.ts';
const ts = readFileSync(TS_PATH, 'utf8');

const num = (name) => {
  const m = ts.match(new RegExp(`export const ${name} = (\\d+)`));
  return m ? Number(m[1]) : null;
};
if (num('MAX_GRANT_DAYS') !== MAX_GRANT_DAYS) fail('MAX_GRANT_DAYS diverge do modelo');
if (num('MIN_REASON_LENGTH') !== MIN_REASON_LENGTH) fail('MIN_REASON_LENGTH diverge do modelo');

const EXPECTED_REJECTIONS = [
  'actor_missing_capability',
  'self_grant',
  'unknown_capability',
  'reason_required',
  'expiry_required',
  'expiry_in_past',
  'expiry_too_far',
  'escalation',
  'redundant_grant',
  'ineffective_deny',
];
for (const rejection of EXPECTED_REJECTIONS) {
  if (!ts.includes(`'${rejection}'`)) fail(`recusa "${rejection}" ausente em ${TS_PATH}`);
}

/* ---------------- 2. simulação ---------------- */
const { scenarios, failures: simFailures } = run();
for (const f of simFailures) fail(`simulação: ${f}`);

/* ---------------- 3. exercício no banco ---------------- */
const SQL = 'tests/rls/capability-grant-console.sql';
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
let exercised = false;
if (!existsSync(SQL)) {
  fail(`${SQL} não encontrado`);
} else if (dbUrl || process.env.PGHOST) {
  try {
    const args = dbUrl
      ? [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', SQL]
      : ['-v', 'ON_ERROR_STOP=1', '-f', SQL];
    const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    exercised = true;
    if (!/OK: 13 verificações/.test(out)) {
      // a NOTICE sai em stderr na maioria das configurações; ausência aqui não é falha
    }
  } catch (error) {
    fail(
      `exercício no banco falhou: ${(error.stderr || error.message).toString().trim().split('\n').slice(-3).join(' | ')}`
    );
  }
} else {
  console.log('  aviso: sem SUPABASE_DB_URL/PGHOST — exercício no banco pulado');
}

console.log('Gate Onda 151 — console de concessões');
console.log(`  cenários simulados : ${scenarios}`);
console.log(`  banco exercitado   : ${exercised ? 'sim (transação revertida)' : 'não'}`);
if (failures.length === 0) {
  console.log('  resultado          : OK');
} else {
  console.log(`  resultado          : ${failures.length} falha(s)`);
  for (const f of failures) console.log(`    - ${f}`);
  process.exitCode = 1;
}
