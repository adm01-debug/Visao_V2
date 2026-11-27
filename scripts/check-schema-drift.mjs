#!/usr/bin/env node
/**
 * Gate de drift do schema: funcao recriada fora do historico de migrations.
 *
 * Caso que motivou este gate: `evaluate_and_restart_streams` estava em producao
 * com `prosecdef = false` e ACL aberta para PUBLIC/authenticated, apesar de
 * `20260721224954:61` declarar `SECURITY DEFINER` e de DOIS REVOKE posteriores
 * (`20260721224954:117` e `20260726144754:5`). `CREATE OR REPLACE` preserva
 * `prosecdef` e a ACL, entao nenhum caminho puro de migration produz aquele
 * estado: a funcao foi recriada fora do historico. O sintoma foi corrigido; a
 * causa (objeto recriado a mao em producao) nao fica visivel em lugar nenhum.
 *
 * O que este gate cobre, e o que deliberadamente NAO cobre:
 *   cobre  - SECURITY DEFINER com `search_path` fixo. Recriar a funcao sem o
 *            `SET search_path` expoe a hijack de search_path, e e barato medir.
 *   cobre  - SECURITY DEFINER que perdeu `prosecdef`, comparando a contagem de
 *            definers por arquivo de migration contra o banco.
 *   NAO cobre - EXECUTE para `authenticated` (232 funcoes hoje). Fechar isso e
 *            decisao de produto, nao regressao: o gate reprovaria em 100% das
 *            execucoes e seria desligado, o que e pior que nao existir.
 *
 * Uso: PGHOST/PGUSER/... no ambiente -> `npm run db:check:drift`.
 */
import { execFileSync } from 'node:child_process';

/** SECURITY DEFINER sem search_path fixo: hijack de search_path e possivel. */
export const SQL_DEFINER_SEM_PATH = `
SELECT format('%s.%s', n.nspname, p.proname)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND NOT EXISTS (
    SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
    WHERE cfg LIKE 'search_path=%'
  )
ORDER BY 1;`;

/**
 * Funcoes declaradas SECURITY DEFINER em algum ponto do historico mas que hoje
 * estao sem `prosecdef`. E o sintoma exato do incidente de 20260721224954.
 */
export const SQL_DEFINER_PERDIDO = `
SELECT format('%s.%s', n.nspname, p.proname)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND NOT p.prosecdef
  AND p.proname = ANY($1::text[])
ORDER BY 1;`;

function run(sql, params = []) {
  const args = ['-At', '-v', 'ON_ERROR_STOP=1'];
  for (const p of params) args.push('-v', `p=${p}`);
  return execFileSync('psql', [...args, '-c', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function avaliar({ definersSemPath, definersPerdidos }) {
  return [
    ...definersSemPath.map((x) => `SECURITY DEFINER sem search_path fixo: ${x}`),
    ...definersPerdidos.map((x) => `SECURITY DEFINER perdido em producao: ${x}`),
  ];
}

async function main() {
  const definersSemPath = run(SQL_DEFINER_SEM_PATH);
  // Nomes que o historico declara como definer; ver scripts/definer-esperados.json.
  let definersPerdidos = [];
  try {
    const { readFileSync } = await import('node:fs');
    const esperados = JSON.parse(readFileSync('scripts/definer-esperados.json', 'utf8'));
    if (esperados.length) definersPerdidos = run(SQL_DEFINER_PERDIDO, [esperados.join(',')]);
  } catch {
    // Lista ausente: so a primeira checagem roda.
  }

  const problemas = avaliar({ definersSemPath, definersPerdidos });
  if (problemas.length) {
    console.error('✗ Drift de schema detectado:');
    for (const p of problemas) console.error('  -', p);
    process.exit(1);
  }
  console.log('✓ Sem SECURITY DEFINER sem search_path e sem definer perdido.');
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
