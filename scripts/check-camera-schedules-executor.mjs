#!/usr/bin/env node
/**
 * Guardrail do executor de agendamentos de camera
 * (`tests/rls/camera-schedules-executor.sql`).
 *
 * Executa a suite via psql dentro de uma transacao que termina em ROLLBACK.
 * Falha (exit 1) se qualquer assercao da suite disparar EXCEPTION.
 *
 * Conexao: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as variaveis PG*.
 * Uso: `npm run db:check:camera-schedules`
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(__dirname, '..', 'tests', 'rls', 'camera-schedules-executor.sql');

if (!existsSync(SUITE)) {
  console.error(`Suite nao encontrada: ${SUITE}`);
  process.exit(2);
}

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const baseArgs = [...(conn ? [conn] : []), '-X', '-q', '-tA'];

/**
 * Pre-condicao: o banco alvo precisa ter a migration da PR aplicada.
 *
 * O gate roda contra o banco apontado por `SUPABASE_DB_URL` — o estado REAL do
 * banco, nao o das migrations do repositorio. A versao anterior da funcao
 * agregava a coluna `id` (42703), entao a suite reprovaria e o erro pareceria
 * bug de codigo. Aqui a diferenca entre "banco atrasado" e "regressao" fica
 * explicita.
 */
function precheck() {
  let res;
  try {
    res = execFileSync(
      'psql',
      [
        ...baseArgs,
        '-c',
        "SELECT coalesce((SELECT position('t(camera_id)' in prosrc) > 0 FROM pg_proc WHERE proname = 'execute_camera_schedules' AND pronamespace = 'public'::regnamespace), false)",
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
        'BANCO ATRASADO: `execute_camera_schedules` neste banco ainda e a versao anterior',
        '(sem alias explicito na agregacao das cameras).',
        'A migration `20261126150000_fix_execute_camera_schedules_array_agg.sql` nao foi aplicada aqui,',
        'entao o guardrail nao consegue avaliar o executor. Aplique as migrations da PR no banco',
        'alvo e rode de novo. Isto nao e regressao de codigo.',
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
    'OK: executor de agendamentos arma/desarma por escopo, respeita a precedencia do desarme e isola erro por agendamento.'
  );
} catch (err) {
  const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
  const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
  console.error('FALHA: guardrail do executor de agendamentos reprovado:');
  if (stdout.trim()) console.error(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
