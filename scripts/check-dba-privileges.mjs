#!/usr/bin/env node
/**
 * Onda 106 — Runner da suíte de privilégios DBA (`tests/rls/dba-privileges.sql`).
 *
 * Executa a suíte via psql dentro de uma transação que termina em ROLLBACK.
 * Falha (exit 1) se qualquer asserção da suíte disparar EXCEPTION.
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as variáveis PG*.
 * Uso: `npm run db:check:dba`
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(__dirname, '..', 'tests', 'rls', 'dba-privileges.sql');

if (!existsSync(SUITE)) {
  console.error(`❌ Suíte não encontrada: ${SUITE}`);
  process.exit(2);
}

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
// ON_ERROR_STOP garante exit code != 0 quando a suíte dispara RAISE EXCEPTION.
const args = [...(conn ? [conn] : []), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', SUITE];

try {
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
  console.log(
    '✅ Suíte de privilégios DBA aprovada (anon bloqueado, guards de admin presentes, partições blindadas).'
  );
} catch (err) {
  const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
  const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
  console.error('❌ Suíte de privilégios DBA reprovada:');
  if (stdout.trim()) console.error(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
