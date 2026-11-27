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
 *
 * `--tolerar-banco-atrasado`: usado no `db:check:all` do CI. A migration desta PR
 * so e aplicada em producao DEPOIS do merge, entao exit 3 (banco atrasado) nao
 * pode bloquear o merge: o script avisa e sai 0. Regressao de verdade na suite
 * continua exit 1.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SUITE = resolve(__dirname, '..', 'tests', 'rls', 'camera-schedules-executor.sql');

if (!existsSync(SUITE)) {
  console.error(`Suite nao encontrada: ${SUITE}`);
  process.exitCode = 2;
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
 *
 * O stderr do psql nunca vai cru para o console: a mensagem do driver pode
 * ecoar a `SUPABASE_DB_URL`, que carrega a senha do banco.
 */
export function mascararUrl(texto) {
  if (typeof texto !== 'string' || texto === '') return '';
  // postgresql://usuario:senha@host/db -> postgresql://usuario:***@host/db
  return texto.replace(/(postgres(?:ql)?:\/\/[^:/@\s]+:)[^@\s]+@/gi, '$1***@');
}

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
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('psql nao encontrado no PATH: instale o cliente PostgreSQL 15+.');
      process.exitCode = 2;
      return false;
    }
    // err.message do execFileSync carrega a linha de comando inteira, e a URL do
    // banco vem nela: o log iria com a senha. Aqui sai so o stderr do psql.
    const stderr =
      err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
    console.error('FALHA: nao foi possivel consultar o banco alvo:');
    console.error(
      mascararUrl(stderr.trim()) || 'psql falhou sem stderr; verifique SUPABASE_DB_URL'
    );
    process.exitCode = 1;
    return false;
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
    process.exitCode = 3;
    return false;
  }
  return true;
}

// Importado por um teste unitario, o modulo nao pode consultar o banco: todo o
// trabalho roda apenas quando este arquivo e o entrypoint.
const executadoDireto =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
const tolerarBancoAtrasado = process.argv.includes('--tolerar-banco-atrasado');

if (executadoDireto) {
  if (precheck() === false) {
    // Exit 3 (banco atrasado) e exit 2 (psql ausente) nao sao regressao. O CI passa
    // --tolerar-banco-atrasado porque a migration so chega a producao apos o merge.
    if (tolerarBancoAtrasado && process.exitCode === 3) {
      console.log(
        'AVISO: banco atrasado (migration desta PR ainda nao aplicada aqui). ' +
          '--tolerar-banco-atrasado: guardrail pulado, isto nao e regressao de codigo.'
      );
      process.exitCode = 0;
    }
  } else {
    // ON_ERROR_STOP garante exit code != 0 quando a suite dispara RAISE EXCEPTION.
    const args = [...(conn ? [conn] : []), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', SUITE];

    try {
      const out = execFileSync('psql', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (out.trim()) console.log(out.trim());
      console.log(
        'OK: executor de agendamentos arma/desarma por escopo, respeita a precedencia do desarme e isola erro por agendamento.'
      );
    } catch (err) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
      const stdout =
        err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
      console.error('FALHA: guardrail do executor de agendamentos reprovado:');
      if (stdout.trim()) console.error(stdout.trim());
      if (stderr.trim()) console.error(stderr.trim());
      else console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
  // exitCode sozinho nao interrompe o pipe do runner: forca a saida com o codigo.
  process.exit(process.exitCode ?? 0);
}
