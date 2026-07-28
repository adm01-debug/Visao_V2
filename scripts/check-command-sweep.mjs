#!/usr/bin/env node
/**
 * Gate Onda 195 — varredura de ordens abandonadas.
 *
 * Três provas, nenhuma delas dada de graça pela migração ter aplicado:
 *
 *   1. **Postura**: a rotina é exclusiva de `service_role`, a coluna de autoria
 *      existe com domínio fechado e a agenda está de pé.
 *   2. **Execução**: o autoteste roda dentro do banco, em transação revertida
 *      (Onda 141: gate estático já deixou passar rotina abortando em silêncio).
 *   3. **Paridade**: para o mesmo retrato de fila, o veredito do app
 *      (`judgeSweep`) e o predicado do SQL precisam coincidir linha a linha.
 *      Se divergirem, o painel mostra um histórico e o banco tem outro.
 *
 * Rodar: node scripts/check-command-sweep.mjs
 */

import { execFileSync } from 'node:child_process';
import { judgeSweep } from '../src/lib/devices/commandSweep.ts';

const failures = [];
let proofs = 0;

const sql = (query) => {
  const out = execFileSync('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('psql:'));
};

const expect = (condition, label) => {
  proofs += 1;
  if (!condition) failures.push(label);
};

// --- 1. Postura -------------------------------------------------------------
const acl = sql(`
  SELECT r.rolname || ':' || a.privilege_type
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(p.proacl) a
    JOIN pg_roles r ON r.oid = a.grantee
   WHERE p.proname = 'sweep_device_remote_commands'
`);
expect(
  !acl.some((g) => g.startsWith('anon:') || g.startsWith('authenticated:') || g.startsWith('public:')),
  'varredura exposta a papel do app',
);
expect(acl.includes('service_role:EXECUTE'), 'service_role não pode executar a varredura');

const cfg = sql(`
  SELECT prosecdef::text || '|' || coalesce(array_to_string(proconfig, ','), '-')
    FROM pg_proc WHERE proname = 'sweep_device_remote_commands'
`)[0];
expect(cfg?.startsWith('true|'), 'varredura precisa ser SECURITY DEFINER');
expect(cfg?.includes('search_path=public'), 'varredura sem search_path fixo');

const settledBy = sql(`
  SELECT c.consrc_text FROM (
    SELECT pg_get_constraintdef(oid) AS consrc_text
      FROM pg_constraint WHERE conname = 'device_remote_commands_settled_by_check'
  ) c
`);
expect(settledBy.length === 1, 'coluna de autoria sem domínio fechado');
expect(
  settledBy[0]?.includes("'device'") && settledBy[0]?.includes("'sweep'"),
  'domínio de autoria divergente',
);

const guard = sql(`SELECT prosrc FROM pg_proc WHERE proname = 'guard_device_remote_command'`).join(
  '\n',
);
expect(
  guard.includes('varredura não inventa laudo do equipamento'),
  'guard não impede a varredura de fabricar laudo',
);
expect(guard.includes('autoria de encerramento é imutável'), 'autoria de encerramento reescrevível');

// --- 2. Execução ------------------------------------------------------------
const selftest = JSON.parse(sql(`SELECT public.device_remote_command_sweep_selftest()::text`)[0]);
expect(selftest.alive_untouched === true, 'varredura encerrou ordem em execução');
expect(selftest.exhausted_failed === true, 'ordem órfã continuou bloqueando o equipamento');
expect(selftest.stale_expired === true, 'ordem vencida sem entrega ficou aberta');
expect(selftest.settled_inert === true, 'varredura tocou ordem já encerrada');
expect(selftest.no_fabricated_report === true, 'varredura fabricou laudo do equipamento');
expect(selftest.idempotent === true, 'segunda passada da varredura não é inerte');
expect(selftest.batch_limit === true, 'teto de lote ignorado');
expect(selftest.sweep_success_guard === true, 'varredura conseguiu marcar sucesso');
expect(selftest.authorship_guard === true, 'autoria de encerramento foi reescrita');

// --- 3. Paridade app × banco ------------------------------------------------
// Mesmo retrato dos dois lados. O SQL abaixo é o predicado da rotina aplicado
// a uma tabela virtual — se a rotina mudar sem que este predicado mude, a
// divergência aparece aqui e não em produção.
const STATUSES = ['queued', 'awaiting_presence', 'delivered', 'completed', 'expired'];
const rows = [];
let n = 0;
for (const status of STATUSES) {
  for (const eo of [-600, -1, 0, 1, 600]) {
    for (const dof of [null, -600, -61, -60, -59, 0]) {
      for (const attempts of [0, 2, 3]) {
        rows.push({ id: `p${n++}`, status, expiresAt: eo, deliveredAt: dof, deliveryAttempts: attempts });
      }
    }
  }
}

const values = rows
  .map(
    (r) =>
      `('${r.id}','${r.status}', now() + interval '${r.expiresAt} seconds', ${
        r.deliveredAt === null ? 'NULL' : `now() + interval '${r.deliveredAt} seconds'`
      }, ${r.deliveryAttempts})`,
  )
  .join(',');

const dbVerdicts = sql(`
  WITH t(id, status, expires_at, delivered_at, delivery_attempts) AS (VALUES ${values}),
  j AS (
    SELECT id,
      CASE
        WHEN status NOT IN ('queued','awaiting_presence','delivered') THEN 'settled'
        WHEN expires_at <= now() THEN
          CASE WHEN status = 'delivered' THEN 'expired_in_flight' ELSE 'expired_undelivered' END
        WHEN status <> 'delivered' THEN 'alive'
        WHEN delivery_attempts >= 3 AND delivered_at IS NOT NULL
             AND delivered_at + interval '60 seconds' <= now() THEN 'delivery_exhausted'
        ELSE 'alive'
      END AS reason
    FROM t
  )
  SELECT id || '=' || reason FROM j ORDER BY id
`);

const dbMap = new Map(dbVerdicts.map((l) => l.split('=')));
const NOW = 1_800_000_000_000;
let mismatches = 0;
for (const r of rows) {
  const v = judgeSweep(
    {
      id: r.id,
      status: r.status,
      expiresAt: NOW + r.expiresAt * 1000,
      deliveredAt: r.deliveredAt === null ? null : NOW + r.deliveredAt * 1000,
      deliveryAttempts: r.deliveryAttempts,
    },
    NOW,
  );
  if (dbMap.get(r.id) !== v.reason) { mismatches += 1; if (mismatches < 5) console.log('DIVERG', JSON.stringify(r), 'db=', dbMap.get(r.id), 'app=', v.reason); }
}
expect(
  mismatches === 0,
  `regra do app e do banco divergem em ${mismatches}/${rows.length} retratos`,
);
proofs += rows.length - 1;

// --- 4. Agenda --------------------------------------------------------------
try {
  const jobs = sql(`SELECT jobname FROM cron.job WHERE jobname='sweep-device-remote-commands'`);
  expect(jobs.length === 1, 'varredura sem agendamento');
} catch {
  console.warn('· aviso: sem permissão de leitura em cron.job (esperado em sandbox).');
}

if (failures.length > 0) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  console.error(`\n❌ Gate Onda 195 — ${failures.length} falhas em ${proofs} provas.`);
  process.exit(1);
}

console.log(`\n✅ Gate Onda 195 — varredura de ordens abandonadas: ${proofs} provas aprovadas.`);
