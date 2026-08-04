#!/usr/bin/env node
/**
 * Gate de CI — Onda 154: I/O de alarme físico.
 *
 * Quatro verificações, da mais barata para a mais cara:
 *
 *  1. **Espelho byte a byte** entre `src/lib/devices/ioSafety.ts` e
 *     `supabase/functions/_shared/ioSafety.ts`. A regra de segurança do relé
 *     roda nos dois lados (UI antecipa, servidor decide); se as duas cópias
 *     divergirem, o operador vê um botão liberado que o servidor recusa — ou,
 *     muito pior, o inverso.
 *  2. **Simulação + testes unitários** da regra (Vitest).
 *  3. **Catálogo de permissão**: `cameras.control_io` existe no TS e no banco.
 *  4. **Exercício do banco em transação REVERTIDA**: as tabelas negam `anon`,
 *     a trilha `io_actuation_log` é de fato imutável, e a rotina
 *     `rule_eligible_io_port` respeita o auto-gate.
 *
 * Por que exercitar o banco: migração aplicar sem erro não prova que a trilha
 * é imutável. Trilha que aceita UPDATE em silêncio é auditoria decorativa.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const failures = [];
const fail = (m) => failures.push(m);
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/* -------- 1. espelho da regra única --------------------------------- */

const SRC = 'src/lib/devices/ioSafety.ts';
const EDGE = 'supabase/functions/_shared/ioSafety.ts';
try {
  if (sha(SRC) !== sha(EDGE)) {
    fail(
      `${EDGE} divergiu de ${SRC} — a regra de segurança do relé precisa ser idêntica nos dois lados`
    );
  }
} catch (error) {
  fail(`não foi possível comparar o espelho da regra: ${error.message}`);
}

/* -------- 2. simulação e testes unitários ---------------------------- */

try {
  execFileSync(
    'npx',
    [
      'vitest',
      'run',
      'src/lib/devices/__tests__/ioSafety.test.ts',
      'src/lib/devices/__tests__/ioSafety.simulation.test.ts',
    ],
    { encoding: 'utf8', stdio: 'pipe' }
  );
} catch (error) {
  fail(`simulação/testes da Onda 154 falharam:\n${(error.stdout ?? error.message).slice(-2000)}`);
}

/* -------- 3. catálogo de permissão ----------------------------------- */

const capsTs = readFileSync('src/lib/permissions/capabilities.ts', 'utf8');
if (!capsTs.includes("'cameras.control_io'")) {
  fail('capabilities.ts não declara cameras.control_io');
}

/* -------- 4. exercício do banco -------------------------------------- */

const psql = (sql) =>
  execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim();

const hasPsql = (() => {
  try {
    psql('SELECT 1');
    return true;
  } catch {
    return false;
  }
})();

if (!hasPsql) {
  console.log('Onda 154 — psql indisponível: exercício do banco pulado (etapas 1 a 3 executadas).');
} else {
  // 4a. cameras.control_io no catálogo do banco e no piso de manager
  const inCatalog = psql(`SELECT 'cameras.control_io' = ANY(public.capability_catalog())`);
  if (inCatalog !== 't') fail('capability_catalog() do banco não contém cameras.control_io');

  const managerFloor = psql(
    `SELECT 'cameras.control_io' = ANY(public.role_baseline_capabilities('manager'))`
  );
  if (managerFloor !== 't') fail('piso do papel manager no banco não inclui cameras.control_io');

  // 4b. anon não enxerga as tabelas novas
  for (const table of ['camera_io_ports', 'io_actuation_log']) {
    const granted = psql(
      `SELECT count(*) FROM information_schema.role_table_grants
       WHERE table_schema='public' AND table_name='${table}' AND grantee='anon'`
    );
    if (granted !== '0') fail(`${table}: papel anon ainda possui ${granted} privilégio(s)`);
  }

  // 4c. trilha imutável, verificada por execução real em transação revertida
  const immutability = (() => {
    const sql = `
BEGIN;
  INSERT INTO public.io_actuation_log
    (user_id, camera_id, port_token, origin, command, outcome)
  VALUES
    ('00000000-0000-4000-8000-000000000154',
     '00000000-0000-4000-8000-000000000155',
     'RelayToken_1', 'human', 'pulse', 'completed');

  DO $$
  DECLARE blocked_update boolean := false; blocked_delete boolean := false;
  BEGIN
    BEGIN
      UPDATE public.io_actuation_log SET outcome = 'failed'
       WHERE port_token = 'RelayToken_1';
    EXCEPTION WHEN others THEN blocked_update := true;
    END;
    BEGIN
      DELETE FROM public.io_actuation_log WHERE port_token = 'RelayToken_1';
    EXCEPTION WHEN others THEN blocked_delete := true;
    END;
    IF NOT blocked_update THEN RAISE EXCEPTION 'trilha aceitou UPDATE'; END IF;
    IF NOT blocked_delete THEN RAISE EXCEPTION 'trilha aceitou DELETE'; END IF;
  END $$;
ROLLBACK;`;
    try {
      execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
      return null;
    } catch (error) {
      return String(error.stderr ?? error.message).trim();
    }
  })();
  if (immutability) fail(`io_actuation_log não é imutável: ${immutability}`);

  // 4d. auto-gate da rotina de elegibilidade
  const definition = psql(
    `SELECT pg_get_functiondef(oid) FROM pg_proc
      WHERE proname = 'rule_eligible_io_port' LIMIT 1`
  );
  if (!/auth\.uid\(\)\s*=\s*p_user_id/.test(definition)) {
    fail('rule_eligible_io_port perdeu o auto-gate por auth.uid()');
  }
  if (!/SET search_path/i.test(definition)) {
    fail('rule_eligible_io_port sem search_path fixo');
  }
}

/* ------------------------------ relatório ---------------------------- */

console.log('Gate Onda 154 — I/O de alarme físico');
console.log(
  `  espelho TS ↔ borda : ${failures.some((f) => f.includes('espelho')) ? 'FALHA' : 'OK'}`
);
console.log(`  banco exercitado   : ${hasPsql ? 'sim (transação revertida)' : 'pulado'}`);
if (failures.length > 0) {
  console.log(`  resultado          : ${failures.length} falha(s)`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exit(1);
}
console.log('  resultado          : OK');
