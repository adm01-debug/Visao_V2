#!/usr/bin/env node
/**
 * Onda 105 — Gate de regressão: exposição via políticas RLS e rotinas DBA.
 *
 * Falha (exit 1) quando:
 *   a) existe política RLS no schema `public` com expressão irrestrita
 *      (USING (true) / WITH CHECK (true)) para papéis diferentes de service_role;
 *   b) existe política ainda ligada ao papel PUBLIC/anon (deve ser `TO authenticated`);
 *   c) uma rotina sensível de DBA (encerrar sessão, matar query, etc.) executável
 *      por `authenticated` não possui guard `has_role(..., 'admin')`.
 *
 * Uso: PGHOST/PGUSER/... definidos no ambiente → `npm run db:check:rls`
 */
import { execFileSync } from 'node:child_process';

/** Rotinas que só podem rodar sob perfil administrador (nunca operador/viewer). */
const DBA_FUNCTIONS = [
  'terminate_db_session',
  'get_permissive_rls_policies',
  'get_db_health_snapshot',
  'get_slow_queries',
];

const SQL_UNRESTRICTED = `
SELECT format('%s.%s :: %s (%s) roles=%s', schemaname, tablename, policyname, cmd, roles)
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND NOT (roles::text[] <@ ARRAY['service_role'])
ORDER BY 1;`;

const SQL_PUBLIC_ROLE = `
SELECT format('%s.%s :: %s (%s) roles=%s', schemaname, tablename, policyname, cmd, roles)
FROM pg_policies
WHERE schemaname = 'public'
  AND ('public' = ANY(roles) OR 'anon' = ANY(roles))
ORDER BY 1;`;

const SQL_DBA_UNGUARDED = `
SELECT p.oid::regprocedure::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = ANY(ARRAY[${DBA_FUNCTIONS.map((f) => `'${f}'`).join(',')}])
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  AND p.prosrc !~* 'has_role\\\\s*\\\\([^)]*admin'
ORDER BY 1;`;

/**
 * Executa uma consulta e devolve as linhas não vazias.
 * @param {string} sql
 * @returns {string[]}
 */
function query(sql) {
  try {
    return execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (err) {
    console.error('❌ Falha ao consultar o banco:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

const unrestricted = query(SQL_UNRESTRICTED);
const publicRole = query(SQL_PUBLIC_ROLE);
const dbaUnguarded = query(SQL_DBA_UNGUARDED);

if (unrestricted.length) {
  console.error(`❌ ${unrestricted.length} política(s) RLS irrestrita(s) fora de service_role:`);
  unrestricted.forEach((row) => console.error(`   - ${row}`));
}
if (publicRole.length) {
  console.error(`❌ ${publicRole.length} política(s) ainda ligada(s) a PUBLIC/anon (use TO authenticated):`);
  publicRole.forEach((row) => console.error(`   - ${row}`));
}
if (dbaUnguarded.length) {
  console.error(`❌ ${dbaUnguarded.length} rotina(s) DBA sem guard de admin executável(is) por authenticated:`);
  dbaUnguarded.forEach((row) => console.error(`   - ${row}`));
}

if (unrestricted.length || publicRole.length || dbaUnguarded.length) process.exit(1);
console.log('✅ RLS sem políticas irrestritas/PUBLIC e rotinas DBA restritas a administradores.');
