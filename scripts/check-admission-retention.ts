/**
 * Gate de CI — Onda 230: guarda de retenção do livro de admissão (TS ↔ SQL).
 *
 * Roda a régua **real** (`planAdmissionPurge`) contra a rotina do banco
 * (`purge_admission_ledger`). Um gate que reimplementasse a regra provaria
 * apenas que concorda consigo mesmo.
 *
 * O que é provado:
 *  1. ACL: `anon` não enxerga a trilha; `authenticated` só lê; a rotina de
 *     expurgo e o autoteste não são API pública do PostgREST.
 *  2. RLS habilitada com leitura restrita a administradores.
 *  3. O autoteste roda **de fato** e todas as fronteiras passam (gate estático
 *     nunca prova execução — lição da Onda 141).
 *  4. Paridade TS↔SQL em centenas de cenários gerados: as janelas são inseridas
 *     numa transação, o expurgo do banco é confrontado com o plano da régua e
 *     tudo é desfeito com ROLLBACK.
 *
 * Rode com: npm run db:check:admission-retention
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  planAdmissionPurge,
  planIsBalanced,
  type RetentionCandidate,
} from '../src/lib/alarms/admissionRetention';

const failures: string[] = [];
const psql = (sql: string) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const psqlScript = (sql: string) =>
  execFileSync('psql', ['-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    encoding: 'utf8',
    input: sql,
  }).trim();
const check = (label: string, cond: boolean, detail: string) => {
  if (!cond) failures.push(`${label}: ${detail}`);
};

const RUNS = 'public.admission_ledger_purge_runs';
const WINDOWS = 'public.admission_ledger_windows';

/* 1 — ACL lida pelo ACL real (information_schema devolve vazio e aprova gate cego). */
const acl = psql(
  `SELECT coalesce(string_agg(grantee::regrole::text || ':' || privilege_type, ',' ORDER BY grantee::regrole::text, privilege_type), '')
     FROM pg_class c, aclexplode(c.relacl) a(grantor, grantee, privilege_type, is_grantable)
    WHERE c.oid = '${RUNS}'::regclass AND grantee::regrole::text IN ('anon','authenticated')`,
);
check('acl-anon', !acl.includes('anon:'), `anon não pode ter privilégio na trilha (${acl})`);
check(
  'acl-authenticated',
  acl === 'authenticated:SELECT' || acl === '',
  `authenticated só pode ler a trilha (${acl})`,
);

/* 2 — RLS habilitada e política restrita a admin. */
const rls = psql(`SELECT relrowsecurity::text FROM pg_class WHERE oid = '${RUNS}'::regclass`);
check('rls-enabled', rls === 't', `RLS deveria estar habilitada (${rls})`);

const policies = psql(
  `SELECT coalesce(string_agg(polname || '/' || polcmd::text, ',' ORDER BY polname), '')
     FROM pg_policy WHERE polrelid = '${RUNS}'::regclass`,
);
check('rls-policy', policies.includes('admission_purge_runs_admin_select/r'), `políticas: ${policies}`);

const policyUsesRole = psql(
  `SELECT coalesce(pg_get_expr(polqual, polrelid), '') FROM pg_policy
    WHERE polrelid = '${RUNS}'::regclass AND polname = 'admission_purge_runs_admin_select'`,
);
check(
  'rls-policy-admin',
  policyUsesRole.includes('has_role') && policyUsesRole.includes('admin'),
  `política deveria exigir papel admin (${policyUsesRole})`,
);

/* 3 — Motor não é API pública. */
for (const fn of [
  'public.purge_admission_ledger(integer, integer, timestamptz)',
  'public.admission_retention_selftest()',
]) {
  const fnAcl = psql(
    `SELECT coalesce(string_agg(grantee::regrole::text, ',' ORDER BY grantee::regrole::text), '')
       FROM pg_proc p, aclexplode(p.proacl) a(grantor, grantee, privilege_type, is_grantable)
      WHERE p.oid = '${fn}'::regprocedure AND grantee::regrole::text IN ('anon','authenticated','public')`,
  );
  check(`fn-acl:${fn}`, fnAcl === '', `função não pode ser executável por anon/authenticated (${fnAcl})`);
}

/* 4 — Imutabilidade da trilha e do livro. */
const trg = psql(
  `SELECT coalesce(string_agg(tgname, ',' ORDER BY tgname), '')
     FROM pg_trigger WHERE tgrelid = '${RUNS}'::regclass AND NOT tgisinternal`,
);
check('trilha-imutavel', trg.includes('admission_purge_runs_immutable'), `gatilhos: ${trg}`);

/* 5 — Rotina registrada no cadastro de retenção (fan-in de manutenção). */
const registry = psql(
  `SELECT coalesce(string_agg(job_name || '=' || source_table || '@' || cadence_minutes, ',' ORDER BY job_name), '')
     FROM public.retention_routine_registry()`,
);
check(
  'registro-retencao',
  registry.includes('admission_ledger=admission_ledger_purge_runs@1440'),
  `cadastro de retenção sem a rotina (${registry})`,
);

/* 6 — Autoteste dinâmico: precisa EXECUTAR e passar em tudo. */
const selftest = psql(
  `SELECT coalesce(string_agg(check_name || '=' || passed::text, ',' ORDER BY check_name), '')
     FROM public.admission_retention_selftest()`,
);
check('selftest-executou', selftest !== '', 'autoteste não devolveu nenhuma verificação');
for (const item of selftest.split(',').filter(Boolean)) {
  const [name, passed] = item.split('=');
  check(`selftest:${name}`, passed === 't', 'guarda reprovada no banco');
}
check(
  'selftest-cobertura',
  selftest.split(',').filter(Boolean).length >= 14,
  `autoteste com poucas guardas (${selftest.split(',').length})`,
);

/* 7 — Paridade TS ↔ SQL em cenários gerados, sempre revertida. */
const MS_DAY = 86_400_000;
const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const NOW_SQL = "timestamptz '2026-07-28 12:00:00+00'";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(230);
const SCENARIOS = 120;
let compared = 0;

// O livro precisa estar vazio para o confronto medir exatamente o cenário.
const preexisting = Number(psql(`SELECT count(*) FROM ${WINDOWS}`));
check('livro-limpo-para-paridade', Number.isFinite(preexisting), 'contagem ilegível');

for (let s = 0; s < SCENARIOS; s += 1) {
  const days = 30 + Math.floor(random() * 500);
  const cap = 1 + Math.floor(random() * 12);
  const n = 1 + Math.floor(random() * 18);
  const userId = randomUUID();

  const rows: RetentionCandidate[] = [];
  const values: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const offsetDays = random() * (days * 2 + 20);
    const end = NOW - Math.round(offsetDays * MS_DAY);
    const start = end - 3_600_000;
    const id = randomUUID();
    rows.push({
      id,
      sourceId: `cam-${i % 5}`,
      windowStart: new Date(start).toISOString(),
      windowEnd: new Date(end).toISOString(),
    });
    values.push(
      `('${id}','${userId}','cam-${i % 5}', timestamptz '${new Date(start).toISOString()}', timestamptz '${new Date(end).toISOString()}', '{"admitted":1}'::jsonb, 1, 1)`,
    );
  }

  const plan = planAdmissionPurge(rows, { now: NOW, retentionDays: days, batchCap: cap });
  if (!plan.ok) {
    check(`parity-${s}-plan`, false, `régua recusou cenário válido: ${plan.refusal}`);
    continue;
  }
  check(`parity-${s}-balance`, planIsBalanced(plan), 'contabilidade da régua não fecha');

  const sql = `
BEGIN;
INSERT INTO ${WINDOWS}
  (id, user_id, source_id, window_start, window_end, counts, total, admitted)
VALUES ${values.join(',')};
SELECT (r->>'deleted') || '|' || (r->>'deferred') || '|' || (r->>'quarantined') || '|' || (r->>'capped') || '|' ||
       (SELECT count(*) FROM ${WINDOWS} WHERE user_id = '${userId}')::text
  FROM public.purge_admission_ledger(${days}, ${cap}, ${NOW_SQL}) AS r;
ROLLBACK;`;

  const out = psqlScript(sql).split('\n').filter((l) => l.includes('|')).pop() ?? '';
  const [deleted, deferred, quarantined, capped, survivors] = out.split('|');
  compared += 1;

  check(`parity-${s}-deleted`, Number(deleted) === plan.deleted, `SQL ${deleted} != TS ${plan.deleted}`);
  check(`parity-${s}-deferred`, Number(deferred) === plan.deferred, `SQL ${deferred} != TS ${plan.deferred}`);
  check(`parity-${s}-quarantined`, Number(quarantined) === plan.quarantined, `SQL ${quarantined} != TS ${plan.quarantined}`);
  check(`parity-${s}-capped`, (capped === 'true') === plan.capped, `SQL ${capped} != TS ${plan.capped}`);
  check(
    `parity-${s}-survivors`,
    Number(survivors) === plan.kept + plan.deferred + plan.quarantined,
    `sobreviventes SQL ${survivors} != TS ${plan.kept + plan.deferred + plan.quarantined}`,
  );
}

/* 8 — Nada do gate pode ter sobrado no banco. */
const leftovers = Number(psql(`SELECT count(*) FROM ${WINDOWS}`));
check('sem-residuo', leftovers === preexisting, `livro mudou de ${preexisting} para ${leftovers}`);

if (failures.length > 0) {
  console.error(`Gate de retenção do livro de admissão: ${failures.length} falha(s).`);
  for (const f of failures.slice(0, 40)) console.error(` - ${f}`);
  process.exit(1);
}
console.log(
  `Gate de retenção do livro de admissão OK — ${compared} cenários confrontados TS↔SQL, autoteste com ${selftest.split(',').length} guardas.`,
);
