#!/usr/bin/env node
/**
 * Ondas 105/106 — Gate de regressão: exposição via políticas RLS, rotinas DBA
 * e blindagem de partições.
 *
 * Falha (exit 1) quando:
 *   a) existe política RLS no schema `public` com expressão irrestrita
 *      (USING (true) / WITH CHECK (true)) para papéis diferentes de service_role;
 *   b) existe política ainda ligada ao papel PUBLIC/anon (deve ser `TO authenticated`);
 *   c) uma rotina sensível de DBA (encerrar sessão, matar query, etc.) executável
 *      por `authenticated` não possui guard `has_role(..., 'admin')`;
 *   d) [Onda 106] uma partição do schema `public` está sem RLS habilitada ou sem
 *      policy própria — a RLS do pai NÃO cobre `SELECT` direto na partição.

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
  -- Políticas deny-all (USING false) são intencionais: bloqueiam o cliente por completo.
  AND COALESCE(qual, '') <> 'false'
ORDER BY 1;`;

const SQL_DBA_UNGUARDED = `
SELECT p.oid::regprocedure::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = ANY(ARRAY[${DBA_FUNCTIONS.map((f) => `'${f}'`).join(',')}])
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  AND p.prosrc !~* 'has_role[^;]{0,80}admin'
ORDER BY 1;`;

/**
 * Onda 106 — partições sem blindagem própria.
 * RLS do pai só é aplicada quando a query passa pela tabela particionada;
 * `SELECT ... FROM public.<partição>` usa exclusivamente a RLS da partição.
 */
const SQL_PARTITIONS_UNPROTECTED = `
SELECT format('%s (pai: %s) → %s',
              c.relname,
              COALESCE(pc.relname, '?'),
              CASE WHEN NOT c.relrowsecurity THEN 'RLS desabilitada'
                   ELSE 'sem policy própria' END)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_inherits inh ON inh.inhrelid = c.oid
LEFT JOIN pg_class pc ON pc.oid = inh.inhparent
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relispartition
  AND (
    NOT c.relrowsecurity
    OR NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname
    )
  )
ORDER BY 1;`;

/**
 * Executa uma consulta e devolve as linhas não vazias.
 * @param {string} sql
 * @returns {string[]}
 */
function query(sql) {
  try {
    const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    const args = conn ? [conn, '-tA', '-c', sql] : ['-tA', '-c', sql];
    return execFileSync('psql', args, { encoding: 'utf8' })
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
const unprotectedPartitions = query(SQL_PARTITIONS_UNPROTECTED);

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
if (unprotectedPartitions.length) {
  console.error(`❌ ${unprotectedPartitions.length} partição(ões) sem RLS própria (a RLS do pai não cobre acesso direto):`);
  unprotectedPartitions.forEach((row) => console.error(`   - ${row}`));
  console.error('   Corrija com: SELECT public.ensure_future_partitions(6);');
}

if (unrestricted.length || publicRole.length || dbaUnguarded.length || unprotectedPartitions.length) {
  process.exit(1);
}
console.log(
  '✅ RLS sem políticas irrestritas/PUBLIC, rotinas DBA restritas a admin e todas as partições blindadas.',
);

