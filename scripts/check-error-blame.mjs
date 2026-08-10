#!/usr/bin/env node
/**
 * Gate de CI — Onda 146: causa e responsável na auditoria de erros das Edge Functions.
 *
 * O ponto cego fechado aqui: `edge_function_error_audit` registrava *que* algo
 * falhou, mas não *o que* falhou nem *de quem é a culpa*. Um `timeout` visto da
 * nuvem e um `timeout` visto de dentro da LAN viravam a mesma linha — e o
 * despacho de manutenção mandava técnico a campo quando o problema era o link.
 *
 * Falha (exit 1) quando:
 *  - as colunas `network_kind` / `blame` / `blame_rule` sumirem;
 *  - qualquer CHECK de vocabulário for removido ou deixar passar rótulo inválido
 *    (verificado por EXECUÇÃO real em transação revertida, não por leitura do
 *    catálogo — migração aplicar não prova que a restrição barra);
 *  - o pareamento `blame` ⇔ `blame_rule` deixar de ser exigido (culpa sem regra
 *    é um veredito sem justificativa: não auditável);
 *  - `anon` ganhar qualquer privilégio na tabela;
 *  - a regra única (`_shared/failureBlame.ts`) deixar de ser consumida por
 *    `_shared/errorAudit.ts` — fio solto silencioso.
 *
 * Uso: `npm run db:check:error-blame`
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const TABLE = 'public.edge_function_error_audit';

const query = (sql) =>
  execFileSync('psql', ['-tA', '-F', '\u0001', '-X', '-q', '-c', sql], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'BEGIN' && l !== 'ROLLBACK')
    .map((l) => l.split('\u0001'));

const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label}: ${detail}`);
};

// --- 1) Colunas presentes -------------------------------------------------------
const cols = query(`
  SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'edge_function_error_audit'
     AND column_name IN ('network_kind','blame','blame_rule')`).map((r) => r[0]);

for (const c of ['network_kind', 'blame', 'blame_rule']) {
  check('COLUNA', cols.includes(c), `${TABLE}.${c} não existe`);
}

// --- 2) Exercício dinâmico dos CHECKs -------------------------------------------
// Cada caso roda em transação revertida: provamos comportamento, não sintaxe.
const CASES = [
  {
    label: 'VOCABULÁRIO(blame)',
    sql: `INSERT INTO ${TABLE} (function_name,error_code,blame,blame_rule) VALUES ('gate','x','camera','R7_unknown')`,
    mustFail: true,
    why: 'rótulo de responsável fora do vocabulário foi aceito',
  },
  {
    label: 'VOCABULÁRIO(network_kind)',
    sql: `INSERT INTO ${TABLE} (function_name,error_code,network_kind) VALUES ('gate','x','flaky')`,
    mustFail: true,
    why: 'classe de rede fora do vocabulário foi aceita',
  },
  {
    label: 'VOCABULÁRIO(blame_rule)',
    sql: `INSERT INTO ${TABLE} (function_name,error_code,blame,blame_rule) VALUES ('gate','x','device','R99_inventada')`,
    mustFail: true,
    why: 'identificador de regra inexistente foi aceito',
  },
  {
    label: 'PAREAMENTO',
    sql: `INSERT INTO ${TABLE} (function_name,error_code,blame) VALUES ('gate','x','device')`,
    mustFail: true,
    why: 'culpa sem a regra que a produziu foi aceita',
  },
  {
    label: 'PAREAMENTO',
    sql: `INSERT INTO ${TABLE} (function_name,error_code,blame_rule) VALUES ('gate','x','R7_unknown')`,
    mustFail: true,
    why: 'regra sem culpa foi aceita',
  },
  {
    label: 'CAMINHO FELIZ',
    sql: `INSERT INTO ${TABLE} (function_name,error_code,run_from,network_kind,blame,blame_rule)
          VALUES ('gate','x','agent','timeout','device','R4_local_reach_proven')`,
    mustFail: false,
    why: 'linha legítima e completamente classificada foi rejeitada',
  },
  {
    label: 'RETROCOMPATIBILIDADE',
    sql: `INSERT INTO ${TABLE} (function_name,error_code) VALUES ('gate','x')`,
    mustFail: false,
    why: 'linha antiga (sem classificação) deixou de ser aceita',
  },
];

for (const c of CASES) {
  let accepted = true;
  try {
    execFileSync(
      'psql',
      ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', `BEGIN; ${c.sql}; ROLLBACK;`],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'pipe'],
      }
    );
  } catch {
    accepted = false;
  }
  check(c.label, c.mustFail ? !accepted : accepted, c.why);
}

// --- 3) Superfície de acesso ----------------------------------------------------
const anonPriv = query(`
  SELECT privilege_type FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='edge_function_error_audit' AND grantee='anon'`);
check('EXPOSIÇÃO', anonPriv.length === 0, `anon recebeu ${anonPriv.map((r) => r[0]).join(', ')}`);

// --- 4) Índices de leitura dos painéis ------------------------------------------
const idx = query(`
  SELECT indexname FROM pg_indexes
   WHERE schemaname='public' AND tablename='edge_function_error_audit'`).map((r) => r[0]);
for (const i of ['idx_edge_error_blame', 'idx_edge_error_network_kind']) {
  check('ÍNDICE', idx.includes(i), `${i} ausente — painel varreria a tabela inteira`);
}

// --- 5) Fio solto: a regra única precisa estar ligada ---------------------------
const audit = readFileSync('supabase/functions/_shared/errorAudit.ts', 'utf8');
check('FIO SOLTO', audit.includes('failureBlame.ts'), 'errorAudit.ts não importa a regra de culpa');
check(
  'FIO SOLTO',
  audit.includes('classifyNetworkError'),
  'errorAudit.ts não classifica a falha de rede'
);
check('FIO SOLTO', audit.includes('blame_rule'), 'errorAudit.ts não persiste a regra aplicada');

// --- Resultado -------------------------------------------------------------------
if (failures.length > 0) {
  console.error('❌ db:check:error-blame falhou:\n' + failures.map((f) => `  • ${f}`).join('\n'));
  process.exit(1);
}
console.log('✅ db:check:error-blame — classificação e culpa persistidas e blindadas.');
