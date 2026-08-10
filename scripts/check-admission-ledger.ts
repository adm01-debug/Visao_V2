/**
 * Gate de CI — Onda 228: persistência do livro de admissão (TS ↔ SQL).
 *
 * Escrito em TypeScript e rodado por `tsx` porque executa a régua **real**
 * (`buildAdmissionLedger` / `assessCoverage`). Um gate que reimplementasse a
 * regra em SQL-JS provaria apenas que concorda consigo mesmo.
 *
 * O que é provado:
 *  1. ACL: `anon` não enxerga nada; `authenticated` só lê e acrescenta;
 *     as funções SECURITY DEFINER de motor não são API pública.
 *  2. RLS habilitada com política de dono para leitura e escrita.
 *  3. O autoteste roda **de fato** e todas as fronteiras passam (gate estático
 *     nunca prova execução — lição da Onda 141).
 *  4. Paridade de cobertura (lei L6) em centenas de cenários gerados: as linhas
 *     são inseridas numa transação, o veredito do banco é confrontado com o da
 *     régua TypeScript e tudo é desfeito com ROLLBACK.
 *
 * Rode com: npm run db:check:admission-ledger
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  ADMISSION_REASONS,
  assessCoverage,
  buildAdmissionLedger,
  ledgerIsBalanced,
  type LedgerEntry,
} from '../src/lib/alarms/admissionLedger';
import type { AdmissionReason } from '../src/lib/alarms/eventAdmission';

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

const TABLE = 'public.admission_ledger_windows';

/* 1 — ACL de tabela lida pelo ACL real (nunca por information_schema, que
   devolve vazio para o papel corrente e aprova gate cego — Onda 184). */
const acl = psql(
  `SELECT coalesce(string_agg(grantee::regrole::text || ':' || privilege_type, ',' ORDER BY grantee::regrole::text, privilege_type), '')
   FROM pg_class c, aclexplode(c.relacl) a(grantor, grantee, privilege_type, is_grantable)
   WHERE c.oid = '${TABLE}'::regclass AND grantee::regrole::text IN ('anon','authenticated')`
);
check('acl', !acl.includes('anon:'), `anon tem privilégio no livro: ${acl}`);
check(
  'acl',
  acl.includes('authenticated:SELECT') && acl.includes('authenticated:INSERT'),
  `authenticated precisa de SELECT+INSERT: ${acl}`
);
for (const forbidden of [
  'authenticated:UPDATE',
  'authenticated:DELETE',
  'authenticated:TRUNCATE',
]) {
  check('acl', !acl.includes(forbidden), `livro append-only não pode conceder ${forbidden}`);
}

/* 1b — funções de motor fechadas. */
const CLOSED_FNS = [
  'public.admission_coverage(uuid, text[], timestamptz)',
  'public.admission_ledger_selftest()',
];
for (const fn of CLOSED_FNS) {
  for (const role of ['anon', 'authenticated']) {
    const can = psql(`SELECT has_function_privilege('${role}', '${fn}', 'execute')`);
    check('acl', can === 'f', `${role} não pode executar ${fn}`);
  }
}

/* 2 — RLS ligada com políticas de dono. */
const rls = psql(`SELECT relrowsecurity FROM pg_class WHERE oid = '${TABLE}'::regclass`);
check('rls', rls === 't', 'RLS precisa estar habilitada no livro');
const policies = psql(
  `SELECT coalesce(string_agg(cmd || '=' || coalesce(qual, '') || '|' || coalesce(with_check, ''), ';' ORDER BY cmd), '')
   FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admission_ledger_windows'`
);
check(
  'rls',
  /SELECT=\(user_id = auth\.uid\(\)\)/.test(policies),
  `leitura não é de dono: ${policies}`
);
check(
  'rls',
  /INSERT=[^;]*\|\(user_id = auth\.uid\(\)\)/.test(policies),
  `escrita não é de dono: ${policies}`
);
check(
  'rls',
  !/UPDATE=|DELETE=/.test(policies),
  `livro append-only não pode ter política de mutação: ${policies}`
);

/* 3 — autoteste efetivamente executado. */
const selftest = psqlScript(
  `BEGIN;
   SELECT name || ' :: ' || detail FROM public.admission_ledger_selftest() WHERE NOT ok;
   ROLLBACK;`
)
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && l !== 'BEGIN' && l !== 'ROLLBACK');
check('selftest', selftest.length === 0, selftest.join(' | '));

const passed = Number(
  psqlScript(`BEGIN; SELECT count(*) FROM public.admission_ledger_selftest() WHERE ok; ROLLBACK;`)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+$/.test(l))
    .pop() ?? '0'
);
check('selftest', passed >= 15, `apenas ${passed} fronteiras exercidas`);

/* 4 — paridade de cobertura em cenários gerados. */
let seed = 0x228c0de;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

const WINDOW_START = Date.UTC(2026, 6, 27, 0, 0, 0);
const WINDOW_END = WINDOW_START + 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

let scenarios = 0;
for (let round = 0; round < 40; round += 1) {
  const userId = randomUUID();
  const sourceCount = 1 + Math.floor(rnd() * 5);
  const sources = Array.from({ length: sourceCount }, (_, i) => `cam-${round}-${i}`);
  // Origens do inventário que talvez nunca tenham gerado evento: é aqui que
  // `no_data` precisa aparecer em vez de "tudo em paz".
  const expected = [...sources, `cam-${round}-fantasma`];

  const entries: LedgerEntry[] = [];
  for (const sourceId of sources) {
    const n = Math.floor(rnd() * 6); // pode ser 0 → origem silenciosa
    for (let k = 0; k < n; k += 1) {
      const reason = pick(ADMISSION_REASONS) as AdmissionReason;
      entries.push({
        sourceId,
        at: WINDOW_START + Math.floor(rnd() * 3_600_000),
        verdict: { reason },
      });
    }
  }

  const ledger = buildAdmissionLedger(entries, { windowStartAt: WINDOW_START });
  check('invariante', ledgerIsBalanced(ledger), `livro não fecha na rodada ${round}`);
  const tsVerdicts = assessCoverage(ledger, expected);

  const rows = ledger.bySource
    .filter((s) => s.total > 0)
    .map((s) => {
      const counts = JSON.stringify(
        Object.fromEntries(
          ADMISSION_REASONS.filter((r) => s.counts[r] > 0).map((r) => [r, s.counts[r]])
        )
      ).replace(/'/g, "''");
      const first = s.firstAt === null ? 'NULL' : `'${iso(s.firstAt)}'`;
      const last = s.lastAt === null ? 'NULL' : `'${iso(s.lastAt)}'`;
      return `('${userId}', '${s.sourceId}', '${iso(WINDOW_START)}', '${iso(WINDOW_END)}', '${counts}'::jsonb, ${s.total}, ${s.admitted}, ${first}, ${last})`;
    });

  const insert =
    rows.length === 0
      ? ''
      : `INSERT INTO ${TABLE} (user_id, source_id, window_start, window_end, counts, total, admitted, first_at, last_at) VALUES ${rows.join(',')};`;

  const out = psqlScript(
    `BEGIN;
     ${insert}
     SELECT source_id || '|' || status || '|' || coalesce(dominant_reason, '-') || '|' || total || '|' || admitted
     FROM public.admission_coverage('${userId}'::uuid, ARRAY[${expected.map((e) => `'${e}'`).join(',')}]::text[], '${iso(WINDOW_START)}');
     ROLLBACK;`
  )
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && l !== 'BEGIN' && l !== 'ROLLBACK' && !/^INSERT \d/.test(l));

  const tsRows = tsVerdicts.map(
    (v) => `${v.sourceId}|${v.status}|${v.dominantReason ?? '-'}|${v.total}|${v.admitted}`
  );
  check(
    'paridade',
    out.join('\n') === tsRows.join('\n'),
    `rodada ${round}\n  SQL: ${out.join(' ; ')}\n   TS: ${tsRows.join(' ; ')}`
  );
  scenarios += tsRows.length;
}

/* Resultado. */
if (failures.length > 0) {
  console.error('❌ db:check:admission-ledger falhou:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `✅ db:check:admission-ledger: ACL + RLS append-only, ${passed} fronteiras exercidas e ${scenarios} vereditos de cobertura em paridade TS↔SQL.`
);
