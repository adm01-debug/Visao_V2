/**
 * Gate de CI — Onda 237: guarda de retenção das fotos de conciliação (TS ↔ SQL).
 *
 * Roda a régua **real** (`planSnapshotPurge`) contra a rotina do banco
 * (`purge_admission_reconcile_snapshots`). Um gate que reimplementasse a regra
 * provaria apenas que concorda consigo mesmo.
 *
 * O que é provado:
 *  1. ACL lido pelo ACL real: `anon` sem privilégio na trilha; `authenticated`
 *     só leitura; rotina e autoteste fora da API pública do PostgREST.
 *  2. RLS habilitada (e FORCE) com leitura restrita a administradores.
 *  3. A rotina está registrada no registro de retenção (Onda 134) — sem isso
 *     ela cresceria sem vigia do painel/fan-in.
 *  4. O autoteste roda **de fato** e todas as guardas passam.
 *  5. Paridade TS↔SQL em cenários gerados: fotos inseridas em transação,
 *     expurgo do banco confrontado com o plano da régua, tudo com ROLLBACK.
 *
 * Rode com: npm run db:check:reconcile-retention
 */

import { execFileSync } from 'node:child_process';
import {
  planSnapshotPurge,
  snapshotPlanIsBalanced,
  type SnapshotCandidate,
} from '../src/lib/alarms/reconcileSnapshotRetention';

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

const RUNS = 'public.admission_reconcile_purge_runs';
const SNAPS = 'public.admission_reconcile_snapshots';
const FN = 'purge_admission_reconcile_snapshots';

/* 1 — ACL real (information_schema devolve vazio e aprova gate cego). */
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

for (const fn of [FN, 'reconcile_retention_selftest']) {
  const fnAcl = psql(
    `SELECT coalesce(string_agg(grantee::regrole::text, ',' ORDER BY grantee::regrole::text), '')
       FROM pg_proc p, aclexplode(p.proacl) a(grantor, grantee, privilege_type, is_grantable)
      WHERE p.proname = '${fn}' AND p.pronamespace = 'public'::regnamespace
        AND grantee::regrole::text IN ('anon','authenticated','public')`,
  );
  check(`fn-nao-publica-${fn}`, fnAcl === '', `${fn} não pode ser chamável pela Data API (${fnAcl})`);
}

const definer = psql(
  `SELECT prosecdef::text || '|' || coalesce(array_to_string(proconfig, ','), '')
     FROM pg_proc WHERE proname = '${FN}' AND pronamespace = 'public'::regnamespace`,
);
check('fn-security-definer', definer.startsWith('t'), `rotina precisa ser SECURITY DEFINER (${definer})`);
check('fn-search-path', definer.includes('search_path=public'), `search_path fixo obrigatório (${definer})`);

/* 2 — RLS habilitada, forçada e restrita a admin. */
const rls = psql(
  `SELECT relrowsecurity::text || '|' || relforcerowsecurity::text FROM pg_class WHERE oid = '${RUNS}'::regclass`,
);
check('rls-enabled', rls.startsWith('t'), `RLS deveria estar habilitada (${rls})`);
check('rls-forced', rls.endsWith('t'), `RLS deveria ser FORCE (${rls})`);

const policyQual = psql(
  `SELECT coalesce(string_agg(polname || '/' || polcmd::text || '/' || coalesce(pg_get_expr(polqual, polrelid), ''), ',' ORDER BY polname), '')
     FROM pg_policy WHERE polrelid = '${RUNS}'::regclass`,
);
check(
  'rls-policy-admin',
  policyQual.includes('/r/') && policyQual.includes("has_role(auth.uid(), 'admin'"),
  `política precisa ser SELECT restrito a admin (${policyQual})`,
);

/* 3 — Trilha imutável por trigger. */
const trig = psql(
  `SELECT coalesce(string_agg(tgname, ',' ORDER BY tgname), '') FROM pg_trigger
    WHERE tgrelid = '${RUNS}'::regclass AND NOT tgisinternal`,
);
check('trilha-imutavel', trig.includes('reconcile_purge_runs_immutable'), `gatilhos: ${trig}`);

/* Append-only da tabela de fotos continua ativo (tgenabled = 'O'). */
const snapTrig = psql(
  `SELECT coalesce(string_agg(tgname || ':' || tgenabled, ',' ORDER BY tgname), '') FROM pg_trigger
    WHERE tgrelid = '${SNAPS}'::regclass AND NOT tgisinternal`,
);
check(
  'fotos-append-only-ativo',
  snapTrig.includes('trg_block_reconcile_snapshot_mutation:O'),
  `o bloqueio append-only precisa ficar habilitado após o expurgo (${snapTrig})`,
);

/* 4 — Registro de retenção conhece a rotina (senão cresce sem vigia). */
const registered = psql(
  `SELECT coalesce(string_agg(job_name || '/' || source_table || '/' || cadence_minutes, ',' ORDER BY job_name), '')
     FROM public.retention_routine_registry() WHERE source_table = 'admission_reconcile_purge_runs'`,
);
check(
  'registro-retencao',
  registered === 'admission_reconcile/admission_reconcile_purge_runs/1440',
  `rotina precisa estar registrada com cadência diária (${registered})`,
);

/* 5 — Autoteste dinâmico: execução real, não assinatura. */
const selftest = psqlScript(
  `BEGIN; SELECT check_name || '=' || passed::text || ' :: ' || coalesce(detail, '') FROM public.reconcile_retention_selftest(); ROLLBACK;`,
)
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.includes('='));
check('autoteste-executou', selftest.length >= 15, `esperava >= 15 guardas, veio ${selftest.length}`);
for (const line of selftest) {
  const [name] = line.split('=');
  check(`autoteste-${name}`, line.includes('=true'), line);
}

/* 6 — Paridade TS↔SQL em cenários gerados. */
const DAY = 86_400_000;
const NOW_ISO = '2099-06-01 00:00:00+00';
const NOW = Date.parse('2099-06-01T00:00:00.000Z');
const preexisting = Number(psql(`SELECT count(*) FROM ${SNAPS}`));

interface Scenario {
  readonly ages: readonly number[];
  readonly retentionDays: number;
  readonly batchCap: number;
  readonly anchorKeep: number;
}

const scenarios: Scenario[] = [
  { ages: [], retentionDays: 730, batchCap: 100, anchorKeep: 7 },
  { ages: [1, 10, 100], retentionDays: 730, batchCap: 100, anchorKeep: 7 },
  { ages: [800, 900, 1000], retentionDays: 730, batchCap: 100, anchorKeep: 1 },
  { ages: [800, 900, 1000], retentionDays: 730, batchCap: 100, anchorKeep: 7 },
  { ages: [730, 731, 729], retentionDays: 730, batchCap: 100, anchorKeep: 1 },
  { ages: [1200, 1100, 1000, 900, 800, 5], retentionDays: 730, batchCap: 2, anchorKeep: 1 },
  { ages: [1200, 1100, 1000, 900, 800, 5], retentionDays: 730, batchCap: 1, anchorKeep: 3 },
  { ages: Array.from({ length: 20 }, (_, i) => 2000 - i * 10), retentionDays: 90, batchCap: 5, anchorKeep: 7 },
  { ages: Array.from({ length: 20 }, (_, i) => 2000 - i * 10), retentionDays: 3650, batchCap: 5, anchorKeep: 7 },
  { ages: Array.from({ length: 15 }, (_, i) => 900 + i), retentionDays: 730, batchCap: 100, anchorKeep: 14 },
];

let compared = 0;
for (const [index, s] of scenarios.entries()) {
  const values = s.ages
    .map(
      (days) =>
        `(timestamptz '${NOW_ISO}' - interval '${days} days', 'reconciled', 0, 0, 0, 0, 0, 0, 365)`,
    )
    .join(',');

  const sql = `BEGIN;
${values === '' ? '' : `INSERT INTO ${SNAPS} (observed_at, verdict, orphan_count, expired_stock, drift_stock, declared_deferred, quarantined_stock, total_stock, retention_days) VALUES ${values};`}
SELECT 'r|' || (res->>'deleted') || '|' || (res->>'deferred') || '|' || (res->>'anchored') || '|' || (res->>'capped')
  FROM public.${FN}(${s.retentionDays}, ${s.batchCap}, ${s.anchorKeep}, timestamptz '${NOW_ISO}') AS res;
SELECT 'survivors|' || count(*) FROM ${SNAPS};
ROLLBACK;`;

  const out = psqlScript(sql)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('r|') || l.startsWith('survivors|'));

  const resLine = out.find((l) => l.startsWith('r|')) ?? 'r|-1|-1|-1|false';
  const survivors = Number((out.find((l) => l.startsWith('survivors|')) ?? 'survivors|-1').split('|')[1]);
  const [, deleted, deferred, anchored, capped] = resLine.split('|');

  const rows: SnapshotCandidate[] = s.ages.map((days, i) => ({
    id: i + 1,
    observedAt: NOW - days * DAY,
    verdict: 'reconciled',
  }));
  const plan = planSnapshotPurge(rows, {
    now: NOW,
    retentionDays: s.retentionDays,
    batchCap: s.batchCap,
    anchorKeep: s.anchorKeep,
  });
  if (!plan.ok) {
    check(`parity-${index}-plano`, false, `régua recusou cenário legítimo: ${plan.refusal}`);
    continue;
  }
  compared += 1;

  check(`parity-${index}-deleted`, Number(deleted) === plan.deleted, `SQL ${deleted} != TS ${plan.deleted}`);
  check(`parity-${index}-deferred`, Number(deferred) === plan.deferred, `SQL ${deferred} != TS ${plan.deferred}`);
  check(`parity-${index}-anchored`, Number(anchored) === plan.anchored, `SQL ${anchored} != TS ${plan.anchored}`);
  check(`parity-${index}-capped`, (capped === 'true') === plan.capped, `SQL ${capped} != TS ${plan.capped}`);
  check(
    `parity-${index}-survivors`,
    survivors === preexisting + plan.kept + plan.anchored + plan.deferred + plan.quarantined,
    `sobreviventes SQL ${survivors} != TS ${preexisting + plan.kept + plan.anchored + plan.deferred}`,
  );
  check(`parity-${index}-balanceado`, snapshotPlanIsBalanced(plan), 'contabilidade não fechou');
}

/* 7 — Nada do gate pode ter sobrado no banco. */
const leftovers = Number(psql(`SELECT count(*) FROM ${SNAPS}`));
check('sem-residuo', leftovers === preexisting, `histórico mudou de ${preexisting} para ${leftovers}`);
const runsLeft = Number(
  psql(`SELECT count(*) FROM ${RUNS} WHERE cutoff_at > timestamptz '2090-01-01 00:00:00+00'`),
);
check('sem-residuo-trilha', runsLeft === 0, `trilha ficou com ${runsLeft} execução(ões) de teste`);

if (failures.length > 0) {
  console.error(`Gate de retenção das fotos de conciliação: ${failures.length} falha(s).`);
  for (const f of failures.slice(0, 40)) console.error(` - ${f}`);
  process.exit(1);
}
console.log(
  `Gate de retenção das fotos de conciliação OK — ${probes} sondas, ${compared} cenários confrontados TS↔SQL, autoteste com ${selftest.length} guardas.`,
);
