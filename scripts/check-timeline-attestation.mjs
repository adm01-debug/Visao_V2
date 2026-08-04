#!/usr/bin/env node
/**
 * Gate de CI — Onda 201: registro probatório do atestado de trajetória.
 *
 * O risco desta onda é o mesmo da 157, deslocado: passam a existir TRÊS
 * implementações do veredito — a régua em `src/`, o espelho Deno em
 * `supabase/functions/_shared/` e o recálculo em SQL dentro do gatilho. Se
 * qualquer par divergir, ou o banco recusa atestado legítimo (paralisia) ou
 * grava como corroborado algo que a régua chamaria de contestado (mentira
 * arquivada, que é pior).
 *
 * Ordem, do mais barato ao mais caro:
 *   1. Simulação da regra (Onda 200/201 verdes).
 *   2. Espelho de arquivo: `src/lib/faces/timelineAttestation.ts` ==
 *      `supabase/functions/_shared/timelineAttestation.ts` (corpo, sem cabeçalho).
 *   3. Espelho TS↔SQL do veredito sobre vetores adversariais.
 *   4. Superfície fechada: `anon` sem privilégio, RLS ligada, sem policy de
 *      UPDATE/DELETE, `authenticated` sem escrita destrutiva.
 *   5. Exercício em transação REVERTIDA: resumo derivado do documento, veredito
 *      forjado recusado, selo divergente recusado e linha imutável.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const fail = (m) => failures.push(m);

/* -------- 1. regra pura verde ---------------------------------------- */

try {
  execFileSync('npx', ['tsx', 'scripts/simulate-wave201.ts'], { encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  fail(`simulação da Onda 201 falhou:\n${(error.stdout ?? error.message).slice(-2000)}`);
}

/* -------- 2. espelho de arquivo TS ↔ Deno ----------------------------- */

// Compara apenas o corpo executável: cabeçalho e imports diferem por
// construção (Deno declara os tipos localmente), a LÓGICA não pode diferir.
const bodyOf = (path) => {
  const text = readFileSync(path, 'utf8');
  const marker = 'export const ATTESTATION_FORMAT';
  const at = text.indexOf(marker);
  if (at < 0) return null;
  return text.slice(at).replace(/\r\n/g, '\n').trim();
};

const srcBody = bodyOf('src/lib/faces/timelineAttestation.ts');
const denoBody = bodyOf('supabase/functions/_shared/timelineAttestation.ts');
if (!srcBody || !denoBody) {
  fail('não foi possível localizar o corpo da régua em um dos lados do espelho');
} else if (srcBody !== denoBody) {
  fail(
    'espelho divergente: src/lib/faces/timelineAttestation.ts e ' +
      'supabase/functions/_shared/timelineAttestation.ts não têm o mesmo corpo. ' +
      'Regenerar o espelho Deno a partir do arquivo de src/.'
  );
}

/* -------- conexão ------------------------------------------------------ */

const psql = (sql, attempts = 3) => {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      last = error;
    }
  }
  throw last;
};

/* -------- 3. espelho TS ↔ SQL do veredito ----------------------------- */

const caveat = (code, count = 1) => ({ code, count, detail: 'x' });
const stay = (i) => ({
  index: i,
  stayId: `s${i}`,
  cameraId: 'cam',
  personId: 'p1',
  startMs: 0,
  endMs: 1,
  durationMs: 1,
  sightings: 1,
  confidence: 'confirmed',
  bestSimilarity: null,
  openAtEdge: false,
});

const VECTORS = [
  { name: 'vazio', caveats: [caveat('no_observation')], stays: [], expected: 'inconclusive' },
  { name: 'limpo', caveats: [], stays: [stay(0)], expected: 'corroborated' },
  {
    name: 'informativa apenas (single_camera não enfraquece)',
    caveats: [caveat('single_camera')],
    stays: [stay(0)],
    expected: 'corroborated',
  },
  {
    name: 'enfraquecida',
    caveats: [caveat('open_stay', 2)],
    stays: [stay(0)],
    expected: 'partial',
  },
  {
    name: 'contestada vence enfraquecida',
    caveats: [caveat('open_stay', 9), caveat('co_presence_conflict')],
    stays: [stay(0), stay(1)],
    expected: 'contested',
  },
  {
    name: 'contestada mesmo sem permanência',
    caveats: [caveat('subject_mismatch')],
    stays: [],
    expected: 'contested',
  },
  {
    name: 'ressalva de contagem zero é inerte',
    caveats: [caveat('blind_gap', 0)],
    stays: [stay(0)],
    expected: 'corroborated',
  },
  {
    name: 'código desconhecido não enfraquece',
    caveats: [caveat('codigo_inventado', 5)],
    stays: [stay(0)],
    expected: 'corroborated',
  },
];

for (const vector of VECTORS) {
  const doc = JSON.stringify({ caveats: vector.caveats, stays: vector.stays }).replaceAll(
    "'",
    "''"
  );
  let sqlVerdict;
  try {
    sqlVerdict = psql(`SELECT public.timeline_attestation_verdict('${doc}'::jsonb);`);
  } catch (error) {
    fail(`SQL falhou no vetor "${vector.name}": ${error.message}`);
    continue;
  }
  if (sqlVerdict !== vector.expected) {
    fail(
      `espelho TS↔SQL rompido em "${vector.name}": SQL disse "${sqlVerdict}", a régua diz "${vector.expected}"`
    );
  }
}

/* -------- 4. superfície fechada --------------------------------------- */

const anonPrivs = psql(`
  SELECT COALESCE(string_agg(DISTINCT a.privilege_type, ','), '')
  FROM pg_class c
  CROSS JOIN LATERAL aclexplode(c.relacl) a
  WHERE c.relname = 'timeline_attestations'
    AND c.relnamespace = 'public'::regnamespace
    AND a.grantee = 'anon'::regrole;
`);
if (anonPrivs !== '') fail(`anon tem privilégio em timeline_attestations: ${anonPrivs}`);

const authPrivs = psql(`
  SELECT COALESCE(string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type), '')
  FROM pg_class c
  CROSS JOIN LATERAL aclexplode(c.relacl) a
  WHERE c.relname = 'timeline_attestations'
    AND c.relnamespace = 'public'::regnamespace
    AND a.grantee = 'authenticated'::regrole;
`);
if (authPrivs !== 'INSERT,SELECT') {
  fail(`authenticated deveria ter apenas INSERT,SELECT; tem: ${authPrivs || '(nenhum)'}`);
}

const rlsOn = psql(`
  SELECT relrowsecurity FROM pg_class
  WHERE relname = 'timeline_attestations' AND relnamespace = 'public'::regnamespace;
`);
if (rlsOn !== 't') fail('RLS desligada em timeline_attestations');

const badPolicies = psql(`
  SELECT COALESCE(string_agg(policyname, ','), '')
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'timeline_attestations'
    AND cmd IN ('UPDATE','DELETE','ALL');
`);
if (badPolicies !== '') fail(`policy de mutação em registro imutável: ${badPolicies}`);

const triggers = psql(`
  SELECT COALESCE(string_agg(tgname, ',' ORDER BY tgname), '')
  FROM pg_trigger
  WHERE tgrelid = 'public.timeline_attestations'::regclass AND NOT tgisinternal;
`);
for (const expected of [
  'trg_timeline_attestations_enforce',
  'trg_timeline_attestations_immutable',
]) {
  if (!triggers.includes(expected)) fail(`gatilho ausente: ${expected}`);
}

/* -------- 5. exercício em transação revertida ------------------------- */

const validDoc = {
  format: 'visao.timeline.attestation',
  version: 1,
  algorithm: 'SHA-256',
  attestationId: 'gate-201',
  rootHash: 'a'.repeat(64),
  verdict: 'partial',
  caveats: [{ code: 'open_stay', count: 1, detail: 'x' }],
  stays: [stay(0), stay(1)],
  transits: [],
  stats: {
    stays: 2,
    confirmedStays: 2,
    camerasVisited: 1,
    confirmedDwellMs: 1,
    openFloorMs: 1,
    excludedReadings: 3,
  },
  subject: { personId: 'p1', label: null },
  window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-31T00:00:00.000Z' },
  issuance: {
    issuedAtUtc: '2026-07-31T12:00:00.000Z',
    issuedBy: 'gate@visao.test',
    sourceSystem: 'visao/201',
  },
  relatedExportRootHash: null,
  chain: [],
};

const lit = (obj) => `'${JSON.stringify(obj).replaceAll("'", "''")}'::jsonb`;

// O papel do gate não tem privilégio direto na tabela (e não deve ter): o
// exercício roda dentro de uma função SECURITY DEFINER de autoteste, sempre em
// transação revertida — nada do que ela escreve sobrevive.
const EXPECTED = {
  derived: 'partial|2|2|1|1|1|3|gate@visao.test',
  forged_verdict: 'veredito_forjado',
  seal_mismatch: 'selo_divergente',
  id_mismatch: 'identificador_divergente',
  summary_mismatch: 'resumo_divergente',
  unknown_format: 'formato_desconhecido',
  update_blocked: 'atestado_imutavel',
  delete_blocked: 'atestado_imutavel',
};

let report = '';
try {
  report = psql(`
    BEGIN;
    SELECT case_name || '=>' || outcome FROM public.timeline_attestation_selftest(${lit(validDoc)});
    ROLLBACK;
  `);
} catch (error) {
  fail(`autoteste do registro não executou: ${error.stderr ?? error.message}`);
}

const seen = new Map();
for (const line of report.split('\n')) {
  const at = line.indexOf('=>');
  if (at > 0) seen.set(line.slice(0, at).trim(), line.slice(at + 2).trim());
}
for (const [name, fragment] of Object.entries(EXPECTED)) {
  const got = seen.get(name);
  if (got === undefined) {
    fail(`autoteste não reportou o caso "${name}"`);
  } else if (name === 'derived') {
    if (got !== fragment) fail(`colunas derivadas não espelham o documento: "${got}"`);
  } else if (got === 'ACEITOU') {
    fail(`${name}: o banco aceitou o que deveria recusar`);
  } else if (!got.includes(fragment)) {
    fail(`${name}: recusado por outro motivo: ${got}`);
  }
}

/* -------- veredito do gate -------------------------------------------- */

if (failures.length > 0) {
  console.error('Gate da Onda 201 REPROVADO:\n' + failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
console.log('Gate da Onda 201 OK: espelho TS↔Deno↔SQL, superfície fechada e registro imutável.');
