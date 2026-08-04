#!/usr/bin/env node
/**
 * Gate de CI — Onda 150: permissões finas (capabilities).
 *
 * Três verificações, nesta ordem (da mais barata para a mais cara):
 *
 *  1. **Espelho TS ↔ JS**: o catálogo e os pisos de papel declarados em
 *     `src/lib/permissions/capabilities.ts` são idênticos ao modelo de
 *     referência de `simulate-wave150-capabilities.mjs`.
 *  2. **Simulação**: as 7 invariantes passam em todos os cenários.
 *  3. **Exercício do banco** (quando há `psql` configurado): as rotinas
 *     `role_baseline_capabilities` e `effective_capabilities` produzem
 *     exatamente o mesmo veredito do modelo, em transação REVERTIDA.
 *
 * Por que exercitar e não apenas ler catálogo: migração aplicar sem erro não
 * prova que a rotina autoriza certo — e permissão errada não lança exceção,
 * apenas concede acesso indevido em silêncio.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  CAPABILITIES,
  ROLE_BASELINE,
  ROLES,
  ADMIN_LOCKOUT_GUARD,
  resolveCapabilities,
} from './simulate-wave150-capabilities.mjs';

const failures = [];
const fail = (m) => failures.push(m);

/* -------- 1. espelho TypeScript ↔ modelo de referência -------------- */

const TS_PATH = 'src/lib/permissions/capabilities.ts';
const ts = readFileSync(TS_PATH, 'utf8');

const arrayLiteral = (source, name) => {
  const match = source.match(new RegExp(`${name}[^=]*=\\s*\\[([\\s\\S]*?)\\]`, 'm'));
  if (!match) return null;
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

const tsCatalog = arrayLiteral(ts, 'export const CAPABILITIES');
if (!tsCatalog) fail(`${TS_PATH}: não foi possível ler o catálogo CAPABILITIES`);
else if (tsCatalog.join('|') !== CAPABILITIES.join('|')) {
  fail(`catálogo TS diverge do modelo: TS=${tsCatalog.length} modelo=${CAPABILITIES.length}`);
}

const TS_BASELINE_VARS = {
  viewer: 'const VIEWER_BASELINE',
  operator: 'const OPERATOR_BASELINE',
  manager: 'const MANAGER_BASELINE',
};
for (const [role, varName] of Object.entries(TS_BASELINE_VARS)) {
  const declared = arrayLiteral(ts, varName) ?? [];
  const inherited =
    role === 'viewer' ? [] : ROLE_BASELINE[role === 'operator' ? 'viewer' : 'operator'];
  const expected = ROLE_BASELINE[role].filter((c) => !inherited.includes(c));
  if (declared.join('|') !== expected.join('|')) {
    fail(`piso TS de ${role} diverge do modelo (${declared.length} vs ${expected.length} deltas)`);
  }
}

const tsGuard = arrayLiteral(ts, 'export const ADMIN_LOCKOUT_GUARD') ?? [];
if (tsGuard.join('|') !== ADMIN_LOCKOUT_GUARD.join('|')) {
  fail('trava anti-lockout do TS diverge do modelo');
}

/* -------- 2. simulação ---------------------------------------------- */

try {
  execFileSync(process.execPath, ['scripts/simulate-wave150-capabilities.mjs'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
} catch (error) {
  fail(`simulação da Onda 150 falhou:\n${error.stdout ?? error.message}`);
}

/* -------- 3. exercício do banco ------------------------------------- */

const psql = (sql) =>
  execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim();

const hasPsql = (() => {
  try {
    psql('SELECT 1');
    return true;
  } catch {
    return false;
  }
})();

if (!hasPsql) {
  console.log('Onda 150 — psql indisponível: exercício do banco pulado (etapas 1 e 2 executadas).');
} else {
  const parseArray = (raw) =>
    raw === '{}' || raw === ''
      ? []
      : raw
          .replace(/^\{|\}$/g, '')
          .split(',')
          .map((v) => v.replace(/^"|"$/g, ''));

  // 3a. pisos de papel
  for (const role of ROLES) {
    const dbCaps = parseArray(psql(`SELECT public.role_baseline_capabilities('${role}')`)).sort();
    const modelCaps = [...ROLE_BASELINE[role]].sort();
    if (dbCaps.join('|') !== modelCaps.join('|')) {
      fail(`piso do banco para ${role} diverge do modelo`);
    }
  }

  // 3b. matriz de deltas sobre um usuário sem papel (piso = viewer),
  //     dentro de transação revertida. Sem DELETE: a transação é o isolamento.
  const USER = '00000000-0000-4000-8000-000000000150';
  const NOW_SQL = `timestamptz '2026-07-27 12:00:00+00'`;
  const NOW_MS = Date.UTC(2026, 6, 27, 12, 0, 0);
  const HOUR = 3_600_000;

  const cases = [];
  for (const capability of CAPABILITIES) {
    for (const effect of ['grant', 'deny']) {
      for (const temporal of ['ativo', 'vencido', 'revogado']) {
        cases.push({ capability, effect, temporal });
      }
    }
  }

  const values = cases
    .map(({ capability, effect, temporal }, index) => {
      const expires = temporal === 'vencido' ? `${NOW_SQL} - interval '1 hour'` : 'NULL';
      const revoked = temporal === 'revogado' ? `${NOW_SQL} - interval '1 hour'` : 'NULL';
      return `('${USER}'::uuid, '${capability}', '${effect}', ${expires}, ${revoked}, ${index})`;
    })
    .join(',\n    ');

  // Cada caso é avaliado isoladamente: insere a linha, mede, e a próxima
  // iteração usa um usuário derivado distinto para não somar efeitos.
  const sql = `
BEGIN;
CREATE TEMP TABLE w150_cases (user_id uuid, capability text, effect text, expires_at timestamptz, revoked_at timestamptz, idx int) ON COMMIT DROP;
INSERT INTO w150_cases VALUES
    ${values};
INSERT INTO public.user_capability_grants (user_id, capability, effect, expires_at, revoked_at)
SELECT ('00000000-0000-4000-8000-' || lpad((900000 + idx)::text, 12, '0'))::uuid, capability, effect, expires_at, revoked_at
FROM w150_cases;
SELECT c.idx || '|' ||
  (c.capability = ANY (public.effective_capabilities(
     ('00000000-0000-4000-8000-' || lpad((900000 + c.idx)::text, 12, '0'))::uuid, ${NOW_SQL})))::text
FROM w150_cases c ORDER BY c.idx;
ROLLBACK;
`;

  let output;
  try {
    output = execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
      encoding: 'utf8',
    });
  } catch (error) {
    fail(`exercício do banco falhou: ${error.stderr ?? error.message}`);
    output = '';
  }

  for (const line of output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)) {
    const [rawIdx, rawValue] = line.split('|');
    const index = Number(rawIdx);
    if (!Number.isInteger(index) || !cases[index]) continue;
    const { capability, effect, temporal } = cases[index];
    const grant = {
      capability,
      effect,
      expiresAtMs: temporal === 'vencido' ? NOW_MS - HOUR : null,
      revokedAtMs: temporal === 'revogado' ? NOW_MS - HOUR : null,
    };
    const expected = resolveCapabilities('viewer', [grant], NOW_MS).granted.has(capability);
    const actual = rawValue === 'true';
    if (expected !== actual) {
      fail(
        `banco divergiu do modelo em ${capability}/${effect}/${temporal}: esperado ${expected}, obtido ${actual}`
      );
    }
  }
}

/* -------- resultado -------------------------------------------------- */

if (failures.length === 0) {
  console.log('Onda 150 — gate de permissões finas: OK');
} else {
  console.error(`Onda 150 — gate de permissões finas: ${failures.length} falha(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
}
