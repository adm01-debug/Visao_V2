#!/usr/bin/env node
/**
 * Onda 104 — Gate de regressão: exposição de funções SECURITY DEFINER.
 *
 * Falha (exit 1) se qualquer função SECURITY DEFINER do schema `public`:
 *   a) for executável pelo papel `anon`; ou
 *   b) for executável por `authenticated` sem nenhuma verificação interna
 *      (has_role / auth.uid()).
 *
 * Uso: PGHOST/PGUSER/... definidos no ambiente → `npm run db:check:definer`
 */
import { execFileSync } from 'node:child_process';

const SQL_ANON = `
SELECT p.oid::regprocedure::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY 1;`;

const SQL_UNGUARDED = `
SELECT p.oid::regprocedure::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  AND p.prosrc !~* 'has_role' AND p.prosrc !~* 'auth\\.uid'
ORDER BY 1;`;

function query(sql) {
  try {
    const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    const args = conn ? [conn, '-tA', '-c', sql] : ['-tA', '-c', sql];
    return execFileSync('psql', args, { encoding: 'utf8' })
      .split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (err) {
    console.error('❌ Falha ao consultar o banco:', err.message);
    process.exit(2);
  }
}

const anonExposed = query(SQL_ANON);
const unguarded = query(SQL_UNGUARDED);

if (anonExposed.length) {
  console.error(`❌ ${anonExposed.length} função(ões) SECURITY DEFINER executáveis por anon:`);
  anonExposed.forEach((f) => console.error(`   - ${f}`));
}
if (unguarded.length) {
  console.error(`❌ ${unguarded.length} função(ões) SECURITY DEFINER sem guard (has_role/auth.uid):`);
  unguarded.forEach((f) => console.error(`   - ${f}`));
}

if (anonExposed.length || unguarded.length) process.exit(1);
console.log('✅ Nenhuma função SECURITY DEFINER exposta a anon ou sem verificação interna.');
