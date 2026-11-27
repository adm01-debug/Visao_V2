#!/usr/bin/env node
/**
 * Guardrail dos comandos do pg_cron que chamam edge functions
 * (`tests/rls/cron-jobs-commands.sql`).
 *
 * Executa a suite via psql dentro de uma transacao que termina em ROLLBACK.
 * Falha (exit 1) se qualquer checagem da suite disparar EXCEPTION.
 *
 * Conexao: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as variaveis PG*.
 * Uso: `npm run db:check:cron-jobs`
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(__dirname, '..', 'tests', 'rls', 'cron-jobs-commands.sql');

if (!existsSync(SUITE)) {
  console.error(`Suite nao encontrada: ${SUITE}`);
  process.exit(2);
}

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const baseArgs = [...(conn ? [conn] : []), '-X', '-q', '-tA'];

/**
 * Pre-condicao: o banco alvo precisa ter pg_cron e a migration desta PR
 * aplicada. O gate roda contra o banco apontado por `SUPABASE_DB_URL` — o
 * estado REAL do banco, nao o das migrations do repositorio. Sem isso a suite
 * reprovaria por "job ausente" e o erro pareceria regressao de codigo.
 */
function precheck() {
  let res;
  try {
    res = execFileSync(
      'psql',
      [
        ...baseArgs,
        '-c',
        "SELECT coalesce((SELECT to_regclass('cron.job') IS NOT NULL" +
          " AND position('public.edge_function_url(' in command) > 0" +
          " FROM cron.job WHERE jobname = 'storage-tiering-orchestrator-15min'), false)",
      ],
      { encoding: 'utf8' }
    ).trim();
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('psql nao encontrado no PATH: instale o cliente PostgreSQL 15+.');
      process.exit(2);
    }
    throw err;
  }

  if (res !== 't') {
    console.error(
      [
        'BANCO ATRASADO: o job `storage-tiering-orchestrator-15min` nao existe ou ainda usa o comando anterior',
        '(URL literal, sem `public.edge_function_url()`).',
        'A migration `20261126221000_cron_edge_function_url_helpers.sql` nao foi aplicada neste banco,',
        'entao o guardrail nao consegue avaliar os comandos do pg_cron. Aplique as migrations da PR no',
        'banco alvo e rode de novo. Isto nao e regressao de codigo.',
      ].join(' ')
    );
    process.exit(3);
  }
}

precheck();

// ON_ERROR_STOP garante exit code != 0 quando a suite dispara RAISE EXCEPTION.
const args = [...(conn ? [conn] : []), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', SUITE];

try {
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
  console.log(
    'OK: os 14 jobs de edge function montam URL/cabecalhos pelos helpers, sem URL nem chave literal,' +
      ' x-orchestrator so no tiering, x-cron-secret no CSP e coletor ONVIF restrito.'
  );
} catch (err) {
  const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
  const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
  console.error('FALHA: guardrail dos comandos do cron reprovado:');
  if (stdout.trim()) console.error(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
