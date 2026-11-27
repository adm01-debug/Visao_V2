#!/usr/bin/env node
/**
 * Gate de drift do schema: funcao recriada fora do historico de migrations.
 *
 * Caso que motivou este gate: `evaluate_and_restart_streams` estava em producao
 * com `prosecdef = false` e ACL aberta para PUBLIC/authenticated, apesar de
 * `20260721224954:61` declarar `SECURITY DEFINER` e de DOIS REVOKE posteriores
 * (`20260721224954:117` e `20260726144754:5`). `CREATE OR REPLACE` preserva a
 * ACL mas ADOTA o modo de execucao da nova definicao, entao o modo divergente
 * sozinho nao prova recriacao fora do historico: pode ser migration que
 * redefiniu a funcao. A ACL aberta, essa sim, nao sai de nenhum caminho puro
 * de migration — o que aponta para recriacao a mao em producao.
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
  AND p.proname = ANY(string_to_array(:'nomes', ','))
ORDER BY 1;`;

/** Mesma resolucao de conexao que scripts/check-definer-exposure.mjs usa. */
const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';

/**
 * Roda `sql` via stdin (nao `-c`): `-c` nao interpola variaveis e a lista de
 * nomes precisa ser enviada como literal, nao como parametro posicional.
 * Falha de conexao ou de SQL propaga o erro em vez de virar lista vazia.
 */
/**
 * Funcoes declaradas no historico que nao existem mais no catalogo. A query de
 * definer perdido parte do catalogo, entao nunca ve uma funcao apagada — foi
 * exatamente o caso de `mcp_exec`/`mcp_exec_many`, ausentes em producao.
 */
export const SQL_FUNCAO_AUSENTE = `
SELECT nome FROM unnest(string_to_array(:'nomes', ',')) AS nome
WHERE to_regprocedure('public.' || quote_ident(nome) || '(text)') IS NULL
  AND to_regprocedure('public.' || quote_ident(nome) || '(text, text)') IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = nome
  )
ORDER BY 1;`;

function run(sql) {
  const env = { ...process.env };
  env.PGCONNECT_TIMEOUT = env.PGCONNECT_TIMEOUT || '30';
  // A URL vai por `-d` no ambiente, nunca em argv: argv aparece em `ps` e a
  // mensagem de erro do execFileSync ecoa o comando inteiro.
  const args = ['-At', '-v', 'ON_ERROR_STOP=1'];
  if (DB_URL) args.push('--dbname', DB_URL);
  try {
    return execFileSync('psql', args, {
      encoding: 'utf8',
      input: sql,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (e) {
    const stderr = String(e.stderr || '')
      .trim()
      .split('\n')
      .slice(0, 3)
      .join(' | ');
    // Repassar com a URL removida: stderr nao deve vazar credencial.
    throw new Error(`psql falhou: ${stderr.replace(DB_URL, '<db-url>')}`);
  }
}

export function avaliar({ definersSemPath, definersPerdidos, ausentes = [] }) {
  return [
    ...definersSemPath.map((x) => `SECURITY DEFINER sem search_path fixo: ${x}`),
    ...definersPerdidos.map((x) => `SECURITY DEFINER perdido em producao: ${x}`),
    ...ausentes.map((x) => `funcao declarada no historico e ausente no banco: ${x}`),
  ];
}

async function main() {
  const definersSemPath = run(SQL_DEFINER_SEM_PATH);
  // Nomes que o historico declara como definer; ver scripts/definer-esperados.json.
  // Lista ausente e erro do gate: sem ela a segunda checagem nao roda.
  const { readFileSync } = await import('node:fs');
  const esperados = JSON.parse(readFileSync('scripts/definer-esperados.json', 'utf8')).filter(
    (n) => !n.includes(`'`)
  );
  // Metacaractere do psql escrito por codigo: no template literal o Prettier o
  // consome, e o servidor recebe `set nomes ...`, que e SQL invalido.
  const META = String.fromCharCode(92);
  const comLista = `${META}set nomes '${esperados.join(',')}'\n`;
  const definersPerdidos = esperados.length ? run(comLista + SQL_DEFINER_PERDIDO) : [];
  const ausentes = esperados.length ? run(comLista + SQL_FUNCAO_AUSENTE) : [];

  const problemas = avaliar({ definersSemPath, definersPerdidos, ausentes });
  if (problemas.length) {
    console.error('✗ Drift de schema detectado:');
    for (const p of problemas) console.error('  -', p);
    process.exit(1);
  }
  console.log('✓ Sem definer sem search_path, sem definer perdido e sem funcao ausente.');
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
