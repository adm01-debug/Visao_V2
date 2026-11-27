#!/usr/bin/env node
/**
 * Guardrail dos comandos do pg_cron que chamam edge functions
 * (`tests/rls/cron-jobs-commands.sql`).
 *
 * Executa a suite via psql dentro de uma transacao que termina em ROLLBACK.
 * Falha (exit 1) se qualquer checagem da suite disparar EXCEPTION.
 *
 * Conexao: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as variaveis PG*.
 * Uso: `npm run db:check:cron-jobs` (estrito) e
 *      `npm run db:check:cron-jobs:ci` (aceita banco atrasado) no CI.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(__dirname, '..', 'tests', 'rls', 'cron-jobs-commands.sql');

// Suite ausente e' erro de checkout/empacotamento, nao "banco atrasado": sem
// este curto-circuito o precheck ainda consultava o banco e, num banco
// desatualizado, o exit 2 virava exit 3 e o modo tolerante devolvia 0.
export const suiteAusente = !existsSync(SUITE);
if (suiteAusente) {
  console.error(`Suite nao encontrada: ${SUITE}`);
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
        // Existe helper nao prova reagendamento: a migration cria os tres antes
        // do `if public.edge_function_url('') is null then ... return`. Sem URL
        // de projeto ela para com WARNING e deixa os comandos antigos, entao o
        // que separa "aplicada" de "nao aplicada" e a URL resolver e o comando
        // citar o helper.
        "SELECT coalesce((SELECT to_regclass('cron.job') IS NOT NULL" +
          " AND to_regprocedure('public.edge_function_url(text)') IS NOT NULL" +
          " AND to_regprocedure('public.edge_function_cron_headers()') IS NOT NULL" +
          " AND to_regprocedure('public.edge_function_cron_extra_headers(text)') IS NOT NULL" +
          " AND public.edge_function_url('') IS NOT NULL" +
          " AND position('public.edge_function_url(' in command) > 0" +
          " FROM cron.job WHERE jobname = 'storage-tiering-orchestrator-15min'), false)",
      ],
      { encoding: 'utf8' }
    ).trim();
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('psql nao encontrado no PATH: instale o cliente PostgreSQL 15+.');
      process.exitCode = 2;
      return false;
    }
    throw err;
  }

  if (res !== 't') {
    // `res` vazio = o SELECT nao achou a linha do job; `f` = achou e reprovou.
    // Sao estados diferentes: sem a linha o job nunca foi criado (ou foi
    // removido); com `f` o job existe e o comando ou os helpers estao velhos.
    const jobSumiu = res !== 'f';
    console.error(
      [
        jobSumiu
          ? 'BANCO ATRASADO: o job `storage-tiering-orchestrator-15min` nao existe neste banco.'
          : 'BANCO ATRASADO: o job `storage-tiering-orchestrator-15min` ainda usa o comando anterior ' +
            '(URL literal, sem `public.edge_function_url()`).',
        'A migration `20261126221000_cron_edge_function_url_helpers.sql` nao foi aplicada neste banco,',
        'entao o guardrail nao consegue avaliar os comandos do pg_cron. Aplique as migrations da PR no',
        'banco alvo e rode de novo. Isto nao e regressao de codigo.',
      ].join(' ')
    );
    process.exitCode = 3;
    return false;
  }
  return true;
}

const executadoDireto =
  Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
const tolerarBancoAtrasado = process.argv.includes('--tolerar-banco-atrasado');

if (executadoDireto) {
  if (suiteAusente) {
    // Banco nunca foi consultado: nenhuma tolerancia se aplica.
    process.exitCode = 2;
  } else if (precheck() === false) {
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
    executarSuite();
  }
  // Nada de process.exit() aqui: ele encerra o Node antes de o stderr do pipe
  // terminar de descarregar, e o diagnostico do guardrail chega truncado.
  process.exitCode = process.exitCode ?? 0;
}

function executarSuite() {
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
    const stderr =
      err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
    const stdout =
      err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
    console.error('FALHA: guardrail dos comandos do cron reprovado:');
    if (stdout.trim()) console.error(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    else console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
