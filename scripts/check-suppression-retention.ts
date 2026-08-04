/**
 * Gate de CI — Onda 243: guarda de retenção da trilha de supressão (TS ↔ SQL).
 *
 * Roda a régua **real** (`planSuppressionPurge`) contra a rotina do banco
 * (`purge_dispatch_suppressions`). Um gate que reimplementasse a regra provaria
 * apenas que concorda consigo mesmo.
 *
 * O que é provado:
 *  1. ACL lido pelo ACL real: `anon` sem privilégio na trilha de execuções;
 *     `authenticated` só leitura; rotina e autoteste fora da Data API.
 *  2. RLS habilitada (e FORCE) com leitura restrita a administradores.
 *  3. A rotina está registrada no registro de retenção (Onda 134).
 *  4. O append-only da trilha de supressão continua ativo depois do expurgo.
 *  5. O autoteste roda de fato e todas as guardas passam.
 *  6. Paridade TS↔SQL em cenários gerados, tudo em transação com ROLLBACK.
 *
 * Rode com: npm run db:check:suppression-retention
 */

import { execFileSync } from 'node:child_process';
import {
  planSuppressionPurge,
  suppressionPlanIsBalanced,
  type SuppressionCandidate,
} from '../src/lib/maintenance/suppressionRetention';

const failures: string[] = [];
let probes = 0;

const psql = (sql: string) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const psqlScript = (sql: string) =>
  execFileSync('psql', ['-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    encoding: 'utf8',
    input: sql,
  }).trim();

const check = (label: string, cond: boolean, detail: string): void => {
  probes += 1;
  if (!cond) failures.push(`${label}: ${detail}`);
};

const RUNS = 'public.maintenance_suppression_purge_runs';
const SUPS = 'public.maintenance_dispatch_suppressions';
const FN = 'purge_dispatch_suppressions';

/* 1 — ACL real. */
const acl = psql(
  `SELECT coalesce(string_agg(grantee::regrole::text || ':' || privilege_type, ',' ORDER BY grantee::regrole::text, privilege_type), '')
     FROM pg_class c, aclexplode(c.relacl) a(grantor, grantee, privilege_type, is_grantable)
    WHERE c.oid = '${RUNS}'::regclass AND grantee::regrole::text IN ('anon','authenticated')`
);
check('acl-anon', !acl.includes('anon:'), `anon não pode ter privilégio na trilha (${acl})`);
check(
  'acl-authenticated',
  acl === 'authenticated:SELECT' || acl === '',
  `authenticated só pode ler a trilha (${acl})`
);

for (const fn of [FN, 'suppression_retention_selftest']) {
  const fnAcl = psql(
    `SELECT coalesce(string_agg(grantee::regrole::text, ',' ORDER BY grantee::regrole::text), '')
       FROM pg_proc p, aclexplode(p.proacl) a(grantor, grantee, privilege_type, is_grantable)
      WHERE p.proname = '${fn}' AND p.pronamespace = 'public'::regnamespace
        AND grantee::regrole::text IN ('anon','authenticated','public')`
  );
  check(
    `fn-nao-publica-${fn}`,
    fnAcl === '',
    `${fn} não pode ser chamável pela Data API (${fnAcl})`
  );
}

const definer = psql(
  `SELECT prosecdef::text || '|' || coalesce(array_to_string(proconfig, ','), '')
     FROM pg_proc WHERE proname = '${FN}' AND pronamespace = 'public'::regnamespace`
);
check(
  'fn-security-definer',
  definer.startsWith('t'),
  `rotina precisa ser SECURITY DEFINER (${definer})`
);
check(
  'fn-search-path',
  definer.includes('search_path=public'),
  `search_path fixo obrigatório (${definer})`
);

/* 2 — RLS habilitada, forçada e restrita a admin. */
const rls = psql(
  `SELECT relrowsecurity::text || '|' || relforcerowsecurity::text FROM pg_class WHERE oid = '${RUNS}'::regclass`
);
check('rls-enabled', rls.startsWith('t'), `RLS deveria estar habilitada (${rls})`);
check('rls-forced', (rls.split('|')[1] ?? '').startsWith('t'), `RLS deveria ser FORCE (${rls})`);

const policyQual = psql(
  `SELECT coalesce(string_agg(polname || '/' || polcmd::text || '/' || coalesce(pg_get_expr(polqual, polrelid), ''), ',' ORDER BY polname), '')
     FROM pg_policy WHERE polrelid = '${RUNS}'::regclass`
);
check(
  'rls-policy-admin',
  policyQual.includes('/r/') && policyQual.includes("has_role(auth.uid(), 'admin'"),
  `política precisa ser SELECT restrito a admin (${policyQual})`
);

/* 3 — Trilha imutável + append-only da origem preservado. */
const trig = psql(
  `SELECT coalesce(string_agg(tgname, ',' ORDER BY tgname), '') FROM pg_trigger
    WHERE tgrelid = '${RUNS}'::regclass AND NOT tgisinternal`
);
check(
  'trilha-imutavel',
  trig.includes('trg_block_suppression_purge_run_mutation'),
  `gatilhos: ${trig}`
);

const supTrig = psql(
  `SELECT coalesce(string_agg(tgname || ':' || tgenabled::text, ',' ORDER BY tgname), '') FROM pg_trigger
    WHERE tgrelid = '${SUPS}'::regclass AND NOT tgisinternal`
);
check(
  'supressoes-append-only-ativo',
  supTrig.includes('trg_block_dispatch_suppression_mutation:O'),
  `o bloqueio append-only precisa ficar habilitado após o expurgo (${supTrig})`
);

/* 4 — Registro de retenção conhece a rotina. */
const registered = psql(
  `SELECT coalesce(string_agg(job_name || '/' || source_table || '/' || cadence_minutes, ',' ORDER BY job_name), '')
     FROM public.retention_routine_registry() WHERE source_table = 'maintenance_suppression_purge_runs'`
);
check(
  'registro-retencao',
  registered === 'dispatch_suppressions/maintenance_suppression_purge_runs/1440',
  `rotina precisa estar registrada com cadência diária (${registered})`
);

/* 5 — Autoteste dinâmico. */
const selftest = psqlScript(
  `BEGIN; SELECT check_name || '=' || passed::text || ' :: ' || coalesce(detail, '') FROM public.suppression_retention_selftest(); ROLLBACK;`
)
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.includes('='));
check(
  'autoteste-executou',
  selftest.length >= 12,
  `esperava >= 12 guardas, veio ${selftest.length}`
);
for (const line of selftest) {
  const [name] = line.split('=');
  check(`autoteste-${name}`, line.includes('=true'), line);
}

/* 6 — Paridade TS↔SQL. */
const DAY = 86_400_000;
const NOW_ISO = '2099-06-01 00:00:00+00';
const NOW = Date.parse('2099-06-01T00:00:00.000Z');
const preexisting = Number(psql(`SELECT count(*) FROM ${SUPS}`));

interface Row {
  readonly days: number;
  readonly condition: string;
}
interface Scenario {
  readonly rows: readonly Row[];
  readonly retentionDays: number;
  readonly batchCap: number;
  readonly anchor: number;
}

const many = (n: number, condition: string, from: number, step: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ days: from - i * step, condition }));

const scenarios: Scenario[] = [
  { rows: [], retentionDays: 90, batchCap: 100, anchor: 3 },
  {
    rows: [
      { days: 1, condition: 'a' },
      { days: 10, condition: 'a' },
    ],
    retentionDays: 90,
    batchCap: 100,
    anchor: 3,
  },
  { rows: many(10, 'a', 400, 10), retentionDays: 90, batchCap: 100, anchor: 3 },
  { rows: many(10, 'a', 400, 10), retentionDays: 90, batchCap: 2, anchor: 1 },
  {
    rows: [...many(5, 'a', 400, 10), ...many(5, 'b', 380, 7)],
    retentionDays: 90,
    batchCap: 100,
    anchor: 2,
  },
  {
    rows: [...many(5, 'a', 400, 10), ...many(5, 'b', 380, 7)],
    retentionDays: 90,
    batchCap: 3,
    anchor: 1,
  },
  {
    rows: [
      { days: 90, condition: 'a' },
      { days: 91, condition: 'a' },
      { days: 89, condition: 'a' },
    ],
    retentionDays: 90,
    batchCap: 100,
    anchor: 1,
  },
  { rows: many(20, 'a', 700, 30), retentionDays: 730, batchCap: 100, anchor: 3 },
  { rows: many(20, 'a', 700, 30), retentionDays: 30, batchCap: 5, anchor: 7 },
  {
    rows: [...many(8, 'a', 500, 5), ...many(3, 'b', 20, 1), ...many(4, 'c', 600, 50)],
    retentionDays: 90,
    batchCap: 6,
    anchor: 2,
  },
];

let compared = 0;
for (const [index, s] of scenarios.entries()) {
  const values = s.rows
    .map(
      (r) =>
        `('gate:${r.condition}', 'telegram', 'warning', 1440, 10, timestamptz '${NOW_ISO}' - interval '${r.days} days')`
    )
    .join(',');

  const sql = `BEGIN;
${values === '' ? '' : `INSERT INTO ${SUPS} (condition_key, channel, severity, window_minutes, remaining_minutes, suppressed_at) VALUES ${values};`}
SELECT 'r|' || (res->>'deleted') || '|' || (res->>'deferred') || '|' || (res->>'anchored') || '|' || (res->>'capped')
  FROM public.${FN}(${s.retentionDays}, ${s.batchCap}, ${s.anchor}, timestamptz '${NOW_ISO}') AS res;
SELECT 'survivors|' || count(*) FROM ${SUPS};
ROLLBACK;`;

  const out = psqlScript(sql)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('r|') || l.startsWith('survivors|'));

  const resLine = out.find((l) => l.startsWith('r|')) ?? 'r|-1|-1|-1|false';
  const survivors = Number(
    (out.find((l) => l.startsWith('survivors|')) ?? 'survivors|-1').split('|')[1]
  );
  const [, deleted, deferred, anchored, capped] = resLine.split('|');

  const rows: SuppressionCandidate[] = s.rows.map((r, i) => ({
    id: i + 1,
    suppressedAt: NOW - r.days * DAY,
    conditionKey: `gate:${r.condition}`,
    channel: 'telegram',
    windowMinutes: 1440,
  }));
  const plan = planSuppressionPurge(rows, {
    now: NOW,
    retentionDays: s.retentionDays,
    batchCap: s.batchCap,
    anchorPerCondition: s.anchor,
  });
  if (!plan.ok) {
    check(`parity-${index}-plano`, false, `régua recusou cenário legítimo: ${plan.refusal}`);
    continue;
  }
  compared += 1;

  check(
    `parity-${index}-deleted`,
    Number(deleted) === plan.deleted,
    `SQL ${deleted} != TS ${plan.deleted}`
  );
  check(
    `parity-${index}-deferred`,
    Number(deferred) === plan.deferred,
    `SQL ${deferred} != TS ${plan.deferred}`
  );
  check(
    `parity-${index}-anchored`,
    Number(anchored) === plan.anchored,
    `SQL ${anchored} != TS ${plan.anchored}`
  );
  check(
    `parity-${index}-capped`,
    (capped === 'true') === plan.capped,
    `SQL ${capped} != TS ${plan.capped}`
  );
  check(
    `parity-${index}-survivors`,
    survivors === preexisting + plan.kept + plan.anchored + plan.deferred + plan.quarantined,
    `sobreviventes SQL ${survivors} != TS ${preexisting + plan.kept + plan.anchored + plan.deferred}`
  );
  check(`parity-${index}-balanceado`, suppressionPlanIsBalanced(plan), 'contabilidade não fechou');
}

/* 7 — Nada do gate pode ter sobrado no banco. */
const leftovers = Number(psql(`SELECT count(*) FROM ${SUPS}`));
check('sem-residuo', leftovers === preexisting, `trilha mudou de ${preexisting} para ${leftovers}`);
const runsLeft = Number(
  psql(`SELECT count(*) FROM ${RUNS} WHERE cutoff_at > timestamptz '2090-01-01 00:00:00+00'`)
);
check('sem-residuo-trilha', runsLeft === 0, `trilha ficou com ${runsLeft} execução(ões) de teste`);

if (failures.length > 0) {
  console.error(`Gate de retenção da trilha de supressão: ${failures.length} falha(s).`);
  for (const f of failures.slice(0, 40)) console.error(` - ${f}`);
  process.exit(1);
}
console.log(
  `Gate de retenção da trilha de supressão OK — ${probes} sondas, ${compared} cenários confrontados TS↔SQL, autoteste com ${selftest.length} guardas.`
);
