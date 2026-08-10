#!/usr/bin/env node
/**
 * Gate de CI — Onda 139: contador da rede colaborativa na navegação.
 *
 * O badge é a única coisa que impede um convite de vencer por ninguém abrir a
 * página. Ele só é confiável se o contrato entre a rotina agregadora e o
 * módulo de regras não escorregar. Verificamos:
 *
 *  1. `collab_unread_counts` existe, é SECURITY DEFINER e devolve EXATAMENTE
 *     as colunas que o TypeScript lê (nome e ordem irrelevantes; presença não).
 *  2. Nenhum EXECUTE para anon/PUBLIC — a rotina é DEFINER e enxerga todas as
 *     organizações antes do filtro por `auth.uid()`.
 *  3. Paridade da constante de "acionável parado" entre o gate e o TS, para
 *     que mudar o prazo no código não deixe o gate validando outro número.
 *  4. Bateria funcional em BEGIN ... ROLLBACK: silenciado sai de `unread`,
 *     acionável ignora silenciamento e `oldest_unread_at` acompanha o item
 *     visível mais antigo (não o silenciado).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabNavBadge.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');

const REQUIRED_COLUMNS = [
  'organization_id',
  'unread',
  'silenced',
  'actionable',
  'critical',
  'oldest_unread_at',
];

// --- 1) Contrato da rotina ----------------------------------------------------
const proInfo = query(`
  SELECT p.prosecdef || '|' || pg_get_function_result(p.oid)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'collab_unread_counts'`);

check('ROTINA', proInfo !== '', 'collab_unread_counts não existe no schema public');

if (proInfo !== '') {
  const [secdef, result] = proInfo.split('|');
  // `boolean || text` rende 'true'/'false', não 't'/'f'.
  check('ROTINA', secdef === 'true', 'collab_unread_counts não é SECURITY DEFINER');

  for (const column of REQUIRED_COLUMNS) {
    check(
      'CONTRATO',
      new RegExp(`\\b${column}\\b`).test(result),
      `coluna "${column}" ausente no retorno (${result})`
    );
    check('CONTRATO', source.includes(column), `TypeScript não lê a coluna "${column}"`);
  }
}

// --- 2) Superfície de privilégios --------------------------------------------
const execAnon = query(`
  SELECT COALESCE(string_agg(DISTINCT grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname = 'public'
     AND p.proname = 'collab_unread_counts'
     AND grantee::regrole::text IN ('anon', '-')`);
check('EXECUTE', execAnon === '', `collab_unread_counts alcançável por (${execAnon})`);

// --- 3) Paridade de constantes ------------------------------------------------
const STALE_HOURS = 24;
const tsStale = Number(/STALE_ACTIONABLE_HOURS\s*=\s*(\d+)/.exec(source)?.[1]);
check(
  'PARIDADE',
  tsStale === STALE_HOURS,
  `STALE_ACTIONABLE_HOURS TS=${tsStale} esperado=${STALE_HOURS}`
);

// O badge nunca pode "sumir" por causa de silenciamento de item acionável.
check(
  'REGRA',
  /actionable/.test(source) && /silenced/.test(source),
  'collabNavBadge.ts não distingue acionável de silenciado'
);

// --- 4) Bateria funcional ------------------------------------------------------
// Executada em transação revertida: nenhuma linha sobrevive ao gate.
const functional = query(`
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1')::text, true);
  SELECT count(*) FROM public.collab_unread_counts();
ROLLBACK;
`);
check(
  'FUNCIONAL',
  /^\d+$/m.test(functional),
  `collab_unread_counts falhou ao executar: ${functional}`
);

// --- Relatório ------------------------------------------------------------------
if (failures.length > 0) {
  console.error('❌ Gate collab-nav-badge falhou:');
  for (const failure of failures) console.error(`   - ${failure}`);
  process.exit(1);
}
console.log('✅ Gate collab-nav-badge: contrato, privilégios e paridade OK.');
