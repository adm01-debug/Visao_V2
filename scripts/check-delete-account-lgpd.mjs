#!/usr/bin/env node
/**
 * Guardrail da exclusao de conta (LGPD) — `tests/rls/delete-account-lgpd.sql`.
 *
 * Executa a suite via psql dentro de uma transacao que termina em ROLLBACK.
 * Falha (exit 1) se qualquer assercao da suite disparar EXCEPTION.
 *
 * Conexao: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as variaveis PG*.
 * Uso: `npm run db:check:delete-account`
 * CUIDADO: use um banco descartavel/dev. A suite cria usuario de teste em
 * `auth.users` e faz ROLLBACK no fim, mas ainda assim escreve no banco alvo.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(__dirname, '..', 'tests', 'rls', 'delete-account-lgpd.sql');

if (!existsSync(SUITE)) {
  console.error(`Suite nao encontrada: ${SUITE}`);
  process.exit(2);
}

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const baseArgs = [...(conn ? [conn] : []), '-X', '-q', '-tA'];

/**
 * Pre-condicao: o banco alvo precisa ter a migration da PR aplicada.
 *
 * O gate roda contra o banco apontado por `SUPABASE_DB_URL` — o estado REAL, nao
 * as migrations do repositorio. Se a coluna ainda for NOT NULL, a suite vai
 * falhar no UPDATE de anonimizacao e o erro pareceria regressao de codigo.
 * Aqui a diferenca entre "banco atrasado" e "regressao" fica explicita.
 */
function precheck() {
  const res = execFileSync(
    'psql',
    [
      ...baseArgs,
      '-c',
      "SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='alertmanager_silences_audit' AND column_name='actor_user_id'",
    ],
    { encoding: 'utf8' }
  ).trim();

  if (res !== 'YES') {
    console.error(
      [
        'BANCO ATRASADO: `alertmanager_silences_audit.actor_user_id` nao esta anulavel neste banco',
        '(coluna ausente ou ainda NOT NULL).',
        'A migration `20261127140000_delete_user_data_lgpd_storage_e_trilha.sql` nao foi aplicada aqui,',
        'entao o guardrail nao consegue avaliar a anonimizacao da trilha. Aplique as migrations da PR',
        'no banco alvo e rode de novo. Isto nao e regressao de codigo.',
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
    'OK: exclusao de conta limpa os dados do titular, anonimiza a trilha e libera o auth.users.'
  );
} catch (err) {
  const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
  const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
  console.error('FALHA: guardrail da exclusao de conta reprovado:');
  if (stdout.trim()) console.error(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
